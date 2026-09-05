// Deterministic fluid cohorts, not individual request events. Rates are requests/sec.
// Fail-fast policy: no waiting queue, retries or timeouts. All offered work terminates
// in this sample, and dependencies receive only work admitted by their caller.
export function simulateTraffic({ design, chapter, time, previous, dt, catalog, strategies, validation, rps }) {
  const nodes = Object.fromEntries(design.nodes.map(n => [n.id, n]));
  const dependencies = id => design.edges.filter(e => e.from === id).map(e => nodes[e.to]).filter(Boolean).sort((a, b) => a.id.localeCompare(b.id));
  const reads = rps * chapter.reads, writes = rps - reads;
  const loads = {}, edges = {}, outcomes = [], fills = {};
  // Every caller sees the SAME beginning-of-sample cache state.
  const warmth = { ...(previous.warmth || {}) };
  const loadFor = id => loads[id] ||= { reads: 0, writes: 0, extra: 0, hits: 0, fills: 0, skippedFills: 0,
    rejected: 0, admitted: 0, used: 0, ratio: 0, queue: 0, queueSeconds: 0 };
  const send = (from, to, job) => {
    const edge = edges[`${from}>${to}`] ||= { reads: 0, writes: 0 };
    edge[job.kind === 'read' ? 'reads' : 'writes'] += job.rate;
    return { ...job, target: to };
  };
  const finish = (job, blockedBy = null, reason = null) => {
    if (job.rate > 0) outcomes.push({ kind: job.kind, rate: job.rate, chain: job.chain, latency: job.latency, blockedBy, reason });
  };
  // All foreground requests targeting a shared resource enter one fair batch.
  // Normalized service budgets persist across phases: optional cache fills use
  // only the budget left after lookups, and cannot turn a successful read into failure.
  const serve = (jobs, optional = false) => {
    const accepted = [];
    const groups = new Map();
    for (const job of jobs) {
      if (job.rate <= 0) continue;
      if (!groups.has(job.target)) groups.set(job.target, []);
      groups.get(job.target).push(job);
    }
    for (const [id, batch] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
      const node = nodes[id], tier = catalog[node.type].tiers[node.tier], load = loadFor(id);
      const workOf = job => job.rate * (job.weight || 1) / (node.type === 'database' && job.kind === 'write' ? tier.writes : tier.capacity);
      const offeredWork = batch.reduce((sum, job) => sum + workOf(job), 0);
      const available = Math.max(0, 1 - load.used);
      const fraction = offeredWork > 0 ? Math.min(1, available / offeredWork) : 1;
      load.ratio += offeredWork;
      load.used = Math.min(1, load.used + (fraction > 0 ? offeredWork * fraction : 0));
      for (const job of batch) {
        if (job.kind === 'read') load.reads += job.rate;
        else load.writes += job.rate * (node.type === 'database' ? job.weight || 1 : 1);
        if (node.type === 'api') load.extra += job.rate * ((job.weight || 1) - 1);
        const rate = job.rate * fraction, dropped = Math.max(0, job.rate - rate);
        if (optional) load.skippedFills += dropped;
        else {
          load.admitted += rate;
          load.rejected += dropped;
          finish({ ...job, rate: dropped, chain: [...job.chain, id] }, id, 'capacity');
        }
        if (rate > 0) accepted.push({ ...job, rate, weight: 1, chain: [...job.chain, id],
          latency: job.latency + (node.type === 'database' ? 14 : 3) + 4 * load.used });
      }
    }
    return accepted;
  };
  const cacheHitRate = id => {
    const node = nodes[id], tier = catalog[node.type].tiers[node.tier];
    return Math.min(1, (chapter.hot + (1 - chapter.hot) * tier.coverage * .25) * (previous.warmth?.[id] || 0));
  };
  const completeRead = job => {
    finish(job);
    for (const id of job.fillTargets || []) {
      const list = fills[id] ||= [];
      list.push({ ...job, target: id, kind: 'write', weight: 1 });
    }
  };
  const splitCache = (job, cacheId) => {
    const hits = job.rate * cacheHitRate(cacheId);
    loadFor(cacheId).hits += hits;
    if (hits > 0) completeRead({ ...job, rate: hits });
    return { ...job, rate: job.rate - hits, fillTargets: [...(job.fillTargets || []), cacheId] };
  };

  if (!validation.valid) {
    for (const [kind, rate] of [['read', reads], ['write', writes]]) finish({ kind, rate, chain: ['internet'], latency: 0 }, validation.issues[0]?.node || 'internet', 'invalid');
  } else {
    let jobs = [{ kind: 'read', rate: reads, chain: ['internet'], latency: 18 }, { kind: 'write', rate: writes, chain: ['internet'], latency: 18 }];
    const entry = dependencies('internet')[0];
    jobs = jobs.map(job => send('internet', entry.id, job));
    // Valid ingress is Visitors -> [edge] -> [balancer] -> APIs.
    if (entry.type === 'cdn') {
      const origin = dependencies(entry.id)[0];
      jobs = serve(jobs).map(job => job.kind === 'read' ? splitCache(job, entry.id) : job)
        .filter(job => job.rate > 0).map(job => send(entry.id, origin.id, job));
    }
    if (jobs.length && nodes[jobs[0].target].type === 'loadBalancer') {
      jobs = serve(jobs).flatMap(job => dependencies(job.target).map(api => send(job.target, api.id, { ...job, rate: job.rate / dependencies(job.target).length })));
    }
    jobs = serve(jobs.map(job => ({ ...job, weight: job.kind === 'write' ? 1 + strategies[nodes[job.target].strategy || 'sequence'].cpu : 1 })));
    const cacheJobs = [], allocationJobs = [], databaseJobs = [];
    const toDatabase = job => {
      const api = nodes[job.api], policy = strategies[api.strategy || 'sequence'];
      const db = dependencies(api.id).find(n => n.type === 'database');
      databaseJobs.push(send(api.id, db.id, { ...job, weight: job.kind === 'write' ? policy.db : 1 }));
    };
    for (const raw of jobs) {
      const job = { ...raw, api: raw.target }, api = nodes[job.api], deps = dependencies(api.id);
      const cache = deps.find(n => n.type === 'cache');
      if (job.kind === 'read' && cache) cacheJobs.push(send(api.id, cache.id, job));
      else if (job.kind === 'write' && api.strategy === 'service') {
        const allocator = deps.find(n => n.type === 'idGenerator');
        allocationJobs.push(send(api.id, allocator.id, job));
      } else toDatabase(job);
    }
    for (const job of serve(cacheJobs)) {
      const miss = splitCache(job, job.target);
      if (miss.rate > 0) toDatabase(miss);
    }
    // A refused allocation cannot proceed to the durable write.
    for (const job of serve(allocationJobs)) toDatabase(job);
    for (const job of serve(databaseJobs)) {
      if (job.kind === 'read') completeRead(job);
      else finish(job);
    }
    // Populate only after a successful origin read, respecting remaining cache
    // write capacity. Optional fills do not add a second user-request outcome.
    const fillJobs = Object.entries(fills).flatMap(([id, batch]) => batch.map(job => {
      if (nodes[id].type === 'cache') send(job.api, id, job);
      return job;
    }));
    for (const job of serve(fillJobs, true)) loadFor(job.target).fills += job.rate;
    for (const [id, load] of Object.entries(loads)) {
      if (['cache', 'cdn'].includes(nodes[id].type)) warmth[id] = Math.min(1, 1 - (1 - (previous.warmth?.[id] || 0)) * Math.exp(-load.fills * dt / 120));
    }
  }

  for (const [id, load] of Object.entries(loads)) {
    const tier = catalog[nodes[id].type].tiers[nodes[id].tier];
    Object.assign(load, { rate: load.reads + load.writes, capacity: tier.capacity,
      served: load.admitted + load.rejected > 0 ? load.admitted / (load.admitted + load.rejected) : 1,
      latency: (nodes[id].type === 'database' ? 14 : 3) + 4 * load.used });
  }
  const completed = outcomes.filter(o => !o.blockedBy), failed = outcomes.filter(o => o.blockedBy);
  const rateOf = list => list.reduce((sum, o) => sum + o.rate, 0);
  const successRate = rateOf(completed), rejectedRate = rateOf(failed);
  const accounting = { offered: rps * dt, completed: successRate * dt, rejected: rejectedRate * dt, queued: 0, timedOut: 0 };
  for (const kind of ['read', 'write']) accounting[kind] = {
    offered: (kind === 'read' ? reads : writes) * dt,
    completed: rateOf(completed.filter(o => o.kind === kind)) * dt,
    rejected: rateOf(failed.filter(o => o.kind === kind)) * dt,
  };
  let cumulative = 0, estimatedLatencyMs = null;
  for (const outcome of [...completed].sort((a, b) => a.latency - b.latency)) {
    cumulative += outcome.rate; estimatedLatencyMs = outcome.latency;
    if (cumulative >= successRate * .99) break;
  }
  const rejectionByNode = {};
  for (const o of failed) rejectionByNode[o.blockedBy] = (rejectionByNode[o.blockedBy] || 0) + o.rate;
  const bottleneck = Object.entries(rejectionByNode).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  const hottest = Object.keys(loads).sort((a, b) => loads[b].ratio - loads[a].ratio || a.localeCompare(b))[0];
  return { time, rps, reads, writes, loads, edges, warmth, accounting, outcomes, bottleneck,
    estimatedLatencyMs: estimatedLatencyMs == null ? null : Math.round(estimatedLatencyMs),
    errorRate: rps > 0 ? Math.min(100, Math.max(0, rejectedRate / rps * 100)) : 0,
    cacheHit: reads > 0 ? Object.values(loads).reduce((n, l) => n + l.hits, 0) / reads * 100 : 0, hottest, validation };
}
