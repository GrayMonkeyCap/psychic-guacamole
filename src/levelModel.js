// Deliberately small, deterministic teaching model. Capacities and costs are game units.
export const LIMIT = 900;
export const EFFICIENCY_TARGET = 650;
// Bump when simulation/validation semantics change, not for presentation-only edits.
export const MODEL_VERSION = 'aggregate-v1';
export const SAVE_VERSION = 3;
// Keep the existing storage key so an upgrade finds the player's board.
export const SAVE_KEY = 'system-sandbox:first-level:v2';
export const CONTRACT_RULES = { maxError: 2, maxLatencyMs: 300, budget: LIMIT };
export const CATALOG = {
  api: { name: 'API server', short: 'API', color: '#9781ca', verb: 'Runs your link logic',
    role: 'Receives a URL to shorten, or looks up the destination of a short code. It calls other services and returns the answer.',
    lesson: 'An API coordinates work. Adding another API only shares traffic when a router sends requests to it. Each replica still needs access to the same stored links.',
    caution: 'More compute cannot fix an overloaded database.',
    tiers: [{ name: 'Small', capacity: 1200, cost: 105 }, { name: 'Medium', capacity: 2500, cost: 185 }, { name: 'Large', capacity: 5200, cost: 340 }] },
  database: { name: 'Database', short: 'Database', color: '#53aead', verb: 'Remembers every link',
    role: 'Stores short code → destination with a UNIQUE constraint. Creation only succeeds after the mapping is saved.',
    lesson: 'Redirects read a mapping; creation writes one. Reads and writes share this database’s resources. Every API uses one shared primary so a link created by one replica can be read by another.',
    caution: 'A cache is not a replacement for durable storage. Replication and sharding arrive in later levels.',
    tiers: [{ name: 'Small', capacity: 700, writes: 450, cost: 145 }, { name: 'Medium', capacity: 2400, writes: 1500, cost: 260 }, { name: 'Large', capacity: 7000, writes: 4000, cost: 470 }] },
  cache: { name: 'Memory cache', short: 'Cache', color: '#d9a748', verb: 'Remembers popular reads',
    role: 'Keeps copies of recently read mappings. The API checks here first, reads the database on a miss, then fills the cache.',
    lesson: 'This is cache-aside: API → cache and API → database. The cache never calls the database itself. Hit rate emerges from repeated traffic, warm-up, and cache size.',
    caution: 'New links still need durable writes. A bigger cache cannot absorb a creation burst.',
    tiers: [{ name: 'Small', capacity: 3500, coverage: .55, cost: 95 }, { name: 'Medium', capacity: 7000, coverage: .8, cost: 170 }, { name: 'Large', capacity: 14000, coverage: .95, cost: 295 }] },
  loadBalancer: { name: 'Load balancer', short: 'Balancer', color: '#659dc9', verb: 'Shares work across APIs',
    role: 'Distributes requests evenly across connected API replicas. Both replicas call the same database.',
    lesson: 'Horizontal scaling adds replicas; vertical scaling upgrades one server. Both are valid. A balancer has its own capacity and cost.',
    caution: 'One broken replica affects its share of traffic. Unconnected replicas contribute no capacity.',
    tiers: [{ name: 'Small', capacity: 3500, cost: 90 }, { name: 'Medium', capacity: 7500, cost: 180 }, { name: 'Large', capacity: 14000, cost: 310 }] },
  idGenerator: { name: 'ID service', short: 'ID service', color: '#7fb275', verb: 'Allocates unique codes',
    role: 'An optional dedicated allocator for new codes. Select “ID service” on an API to make it use this dependency.',
    lesson: 'Unique codes are a capability. Database sequences and random codes in the API are also valid. A dedicated allocator shifts work away from the API and sequence allocation in the database.',
    caution: 'It adds cost and a write-path dependency. Reads never call it. The database still enforces uniqueness.',
    tiers: [{ name: 'Small', capacity: 800, cost: 55 }, { name: 'Medium', capacity: 2200, cost: 105 }, { name: 'Large', capacity: 5000, cost: 185 }] },
  cdn: { name: 'Edge cache', short: 'Edge', color: '#cf8b67', verb: 'Answers before the origin',
    role: 'Caches public redirects before they reach your API. Misses and all creations continue to the origin.',
    lesson: 'Edge caching can relieve both the API and database. This level uses public, immutable links; personalized redirects or edits would need additional cache policies.',
    caution: 'It also starts cold. A working origin is required even if most requests become cache hits.',
    tiers: [{ name: 'Small', capacity: 3500, coverage: .55, cost: 150 }, { name: 'Medium', capacity: 9000, coverage: .8, cost: 280 }, { name: 'Large', capacity: 20000, coverage: .95, cost: 480 }] },
};
export const STRATEGIES = {
  sequence: { name: 'Database sequence', short: 'DB sequence', description: 'Allocate a number in the database and encode it as Base62. Simple and predictable; adds database work.', cpu: .02, db: 1.2 },
  random: { name: 'Random code in API', short: 'Random + retry', description: 'Generate a 7-character code in the API. Insert with UNIQUE; retry a collision. Extra compute, no separate ID service.', cpu: .24, db: 1.001 },
  service: { name: 'Dedicated ID service', short: 'ID service', description: 'Ask your connected ID service for a code, then persist the mapping. Extra dependency, less allocation work in the API or database.', cpu: .005, db: 1 },
};
export const CHAPTERS = [
  { id: 0, name: 'First link', tagline: 'Make it work', peak: 100, reads: .8, hot: .15, duration: 12,
    brief: 'A tiny link service for the neighbourhood. Save new links and send visitors to the right destination.',
    twist: '80 redirects + 20 new links / second',
    question: 'What needs to remember a link after the request ends?',
    takeaway: 'A short link needs application logic, a unique code, and durable storage. A separate ID service is optional.' },
  { id: 1, name: 'Going viral', tagline: 'Make it scale', peak: 2400, reads: .98, hot: .92, duration: 16,
    brief: 'A local bakery shares one link. The whole city clicks. Most visitors want the same destination.',
    twist: '2,400 req/s · 98% reads · 92% hot-link traffic',
    question: 'Are you doing the same database lookup over and over?',
    takeaway: 'Repeated reads can reuse a cached answer. More compute, a larger database, and an edge cache are alternative tradeoffs.' },
  { id: 2, name: 'Opening day', tagline: 'Make it last', peak: 1400, reads: .15, hot: .2, duration: 16,
    brief: 'A partner imports thousands of fresh links. Your popular-link cache cannot save data that does not exist yet.',
    twist: '1,400 req/s · 85% creations · new keys',
    question: 'Which parts of a request must finish before you can return a new short link?',
    takeaway: 'Reads and writes stress different resources. Code generation is a strategy; durability still needs database capacity.' },
];
export const EMPTY_DESIGN = { nodes: [{ id: 'internet', type: 'internet', x: 7, y: 43, tier: 0 }], edges: [] };
export function scenarioVersion(chapter) {
  return JSON.stringify([chapter.id, chapter.peak, chapter.reads, chapter.hot, chapter.duration, CONTRACT_RULES]);
}
// Frozen migration identifiers: NEVER derive these from future rules or chapters.
const LEGACY_MODEL_VERSION = 'aggregate-v1';
const LEGACY_SCENARIOS = [
  '[0,100,0.8,0.15,12,{"maxError":2,"maxLatencyMs":300,"budget":900}]',
  '[1,2400,0.98,0.92,16,{"maxError":2,"maxLatencyMs":300,"budget":900}]',
  '[2,1400,0.15,0.2,16,{"maxError":2,"maxLatencyMs":300,"budget":900}]',
];
export function meetsMetricContract({ maxError, estimatedLatencyMs, cost }) {
  return Number.isFinite(maxError) && maxError >= 0 && maxError <= CONTRACT_RULES.maxError
    && Number.isFinite(estimatedLatencyMs) && estimatedLatencyMs >= 0 && estimatedLatencyMs <= CONTRACT_RULES.maxLatencyMs
    && Number.isFinite(cost) && cost >= 0 && cost <= CONTRACT_RULES.budget;
}
export function isCurrentResult(result, chapter = CHAPTERS[result?.chapter]) {
  return Boolean(chapter && result?.chapter === chapter.id && result.modelVersion === MODEL_VERSION && result.scenarioVersion === scenarioVersion(chapter));
}
export function passedChapters(certificates, design) {
  const signature = fingerprint(design);
  return CHAPTERS.map(chapter => certificates.some(c => c.passed === true && meetsMetricContract(c)
    && c.fingerprint === signature && isCurrentResult(c, chapter)));
}
export function recordCertificate(certificates, result) {
  if (result?.passed !== true || !meetsMetricContract(result) || typeof result.fingerprint !== 'string'
    || typeof result.modelVersion !== 'string' || typeof result.scenarioVersion !== 'string') return certificates;
  const key = c => JSON.stringify([c.chapter, c.fingerprint, c.modelVersion, c.scenarioVersion]);
  const certificate = { chapter: result.chapter, fingerprint: result.fingerprint, modelVersion: result.modelVersion,
    scenarioVersion: result.scenarioVersion, passed: true, cost: result.cost, maxError: result.maxError, estimatedLatencyMs: result.estimatedLatencyMs };
  return [...certificates.filter(c => key(c) !== key(certificate)), certificate];
}
export function costOf(nodes) { return nodes.reduce((n, node) => n + (CATALOG[node.type]?.tiers[node.tier]?.cost || 0), 0); }
export function fingerprint(design) {
  return JSON.stringify({ nodes: design.nodes.map(({ id, type, tier, strategy }) => ({ id, type, tier, strategy: type === 'api' ? strategy || 'sequence' : undefined })).sort((a, b) => a.id.localeCompare(b.id)), edges: design.edges.map(e => `${e.from}>${e.to}`).sort() });
}
export function connectionError(design, from, to) {
  const source = design.nodes.find(n => n.id === from), target = design.nodes.find(n => n.id === to);
  if (!source || !target || from === to) return 'Choose two different components.';
  const allowed = { internet: ['api', 'loadBalancer', 'cdn'], cdn: ['api', 'loadBalancer'], loadBalancer: ['api'], api: ['database', 'cache', 'idGenerator'], database: [], cache: [], idGenerator: [] };
  if (!(allowed[source.type] || []).includes(target.type)) return source.type === 'cache' ? 'The API handles a cache miss. Connect the API directly to the database.' : `${CATALOG[source.type]?.name || 'Visitors'} cannot call ${CATALOG[target.type]?.name || 'visitors'} in this level.`;
  if (design.edges.some(e => e.from === from && e.to === to)) return 'These components already communicate. Replies use the same connection.';
  if (['internet', 'cdn'].includes(source.type) && design.edges.some(e => e.from === from)) return 'Use one public entry. Disconnect its existing call first, or use a load balancer to share traffic.';
  if (source.type === 'api' && design.edges.some(e => e.from === from && design.nodes.find(n => n.id === e.to)?.type === target.type)) return `This API already has a ${CATALOG[target.type].name.toLowerCase()} dependency. Disconnect it before choosing another.`;
  return null;
}
export function validate(design) {
  const { nodes, edges } = design;
  const map = Object.fromEntries(nodes.map(n => [n.id, n]));
  const issues = [];
  const checked = { nodes, edges: [] };
  for (const edge of edges) {
    const error = connectionError(checked, edge.from, edge.to);
    if (error) issues.push({ node: edge.from, text: error });
    checked.edges.push(edge);
  }
  const reachable = new Set();
  const walk = id => { if (reachable.has(id)) return; reachable.add(id); edges.filter(e => e.from === id).forEach(e => walk(e.to)); };
  walk('internet');
  const apis = nodes.filter(n => n.type === 'api' && reachable.has(n.id));
  if (!apis.length) issues.push({ node: 'internet', text: 'Visitors need a connected API to shorten links and answer redirects.' });
  const databases = new Set();
  for (const api of apis) {
    const deps = edges.filter(e => e.from === api.id).map(e => map[e.to]).filter(Boolean);
    const db = deps.find(n => n.type === 'database');
    if (!db) issues.push({ node: api.id, text: 'This API needs a direct database call to save and look up links.' });
    else databases.add(db.id);
    if (!STRATEGIES[api.strategy || 'sequence']) issues.push({ node: api.id, text: 'Choose a supported code strategy on this API.' });
    if (api.strategy === 'service' && !deps.some(n => n.type === 'idGenerator')) issues.push({ node: api.id, text: 'This API chose the ID service strategy. Connect one, or choose database sequence / random codes.' });
  }
  for (const node of nodes.filter(n => reachable.has(n.id) && ['cdn', 'loadBalancer'].includes(n.type))) {
    if (!edges.some(e => e.from === node.id)) issues.push({ node: node.id, text: `${CATALOG[node.type].name} needs a connected origin API.` });
  }
  if (databases.size > 1) issues.push({ node: [...databases][1], text: 'Use one shared database in this level. Independent databases would disagree about which links exist; replication and sharding come later.' });
  return { valid: issues.length === 0, issues, reachable, apis, capabilities: [apis.length > 0, apis.length > 0 && apis.every(a => edges.some(e => e.from === a.id && map[e.to]?.type === 'database')), apis.length > 0 && apis.every(a => STRATEGIES[a.strategy || 'sequence'] && (a.strategy !== 'service' || edges.some(e => e.from === a.id && map[e.to]?.type === 'idGenerator')))] };
}
export function trafficAt(chapter, time) {
  return chapter.peak * (.08 + .92 * Math.min(1, time / 5));
}
export function tick(design, chapter, time, previous = {}, dt = .2) {
  previous ||= {};
  const validation = validate(design), map = Object.fromEntries(design.nodes.map(n => [n.id, n]));
  const rps = trafficAt(chapter, time), reads = rps * chapter.reads, writes = rps - reads;
  const loads = {}, edges = {}, paths = [], warmth = { ...(previous.warmth || {}) };
  const deps = id => design.edges.filter(e => e.from === id).map(e => map[e.to]).filter(Boolean);
  const edgeLoad = (from, to, read, write) => {
    const key = `${from}>${to}`;
    edges[key] ||= { reads: 0, writes: 0 };
    edges[key].reads += read; edges[key].writes += write;
  };
  const demand = (node, read, write, extra = 0) => {
    loads[node.id] ||= { reads: 0, writes: 0, extra: 0, hits: 0 };
    loads[node.id].reads += read; loads[node.id].writes += write; loads[node.id].extra += extra;
  };
  const cacheReads = (node, read) => {
    const tier = CATALOG[node.type].tiers[node.tier];
    const warm = warmth[node.id] || 0;
    const hitRate = (chapter.hot + (1 - chapter.hot) * tier.coverage * .25) * warm;
    const hits = Math.min(read * hitRate, tier.capacity);
    warmth[node.id] = Math.min(1, 1 - (1 - warm) * Math.exp(-read * dt / 120));
    demand(node, read, 0);
    loads[node.id].hits += hits;
    return hits;
  };
  const route = (node, read, write, chain = []) => {
    if (!node || chain.includes(node.id)) return;
    const next = [...chain, node.id];
    if (node.type === 'internet' || node.type === 'loadBalancer' || node.type === 'cdn') {
      let originReads = read;
      if (node.type === 'cdn') {
        const hits = cacheReads(node, read); originReads -= hits;
        if (hits) paths.push({ rate: hits, chain: next, kind: 'read' });
        demand(node, 0, write);
      } else if (node.type !== 'internet') demand(node, read, write);
      const targets = deps(node.id);
      for (const target of targets) {
        const rr = originReads / targets.length, ww = write / targets.length;
        edgeLoad(node.id, target.id, rr, ww); route(target, rr, ww, next);
      }
      return;
    }
    if (node.type !== 'api') return;
    const policy = STRATEGIES[node.strategy || 'sequence'] || STRATEGIES.sequence;
    demand(node, read, write, write * policy.cpu);
    const targets = deps(node.id), db = targets.find(n => n.type === 'database'), cache = targets.find(n => n.type === 'cache'), id = targets.find(n => n.type === 'idGenerator');
    let misses = read;
    if (cache) {
      edgeLoad(node.id, cache.id, read, 0);
      const hits = cacheReads(cache, read); misses -= hits;
      if (hits) paths.push({ rate: hits, chain: [...next, cache.id], kind: 'read' });
    }
    if (db) {
      demand(db, misses, write * policy.db); edgeLoad(node.id, db.id, misses, write);
      // Filling a missed entry is a cache write, performed by the API after a DB result.
      if (cache) { demand(cache, 0, misses); edgeLoad(node.id, cache.id, 0, misses); }
      if (misses) paths.push({ rate: misses, chain: [...next, ...(cache ? [cache.id] : []), db.id], kind: 'read' });
      if (write) paths.push({ rate: write, chain: [...next, ...(node.strategy === 'service' && id ? [id.id] : []), db.id], kind: 'write' });
    }
    if (node.strategy === 'service' && id) { demand(id, 0, write); edgeLoad(node.id, id.id, 0, write); }
  };
  route(map.internet, reads, writes);
  for (const [id, load] of Object.entries(loads)) {
    const node = map[id], tier = CATALOG[node.type].tiers[node.tier];
    const ratio = node.type === 'database' ? load.reads / tier.capacity + load.writes / tier.writes : (load.reads + load.writes + load.extra) / tier.capacity;
    const queueSeconds = Math.max(0, Math.min(.8, (previous.loads?.[id]?.queueSeconds || 0) + (ratio - 1) * dt));
    Object.assign(load, { ratio, rate: load.reads + load.writes, capacity: tier.capacity, queueSeconds,
      queue: Math.round(queueSeconds * tier.capacity), latency: (node.type === 'database' ? 14 : 3) + queueSeconds * 1000 + 4 * ratio * ratio,
      served: ratio > 1 ? 1 / ratio : 1 });
  }
  let successes = 0;
  const latencies = [];
  for (const path of paths) {
    const resources = path.chain.map(id => loads[id]).filter(Boolean);
    const served = Math.min(1, ...resources.map(l => l.served));
    successes += path.rate * served;
    latencies.push({ latency: 18 + resources.reduce((n, l) => n + l.latency, 0), rate: path.rate });
  }
  latencies.sort((a, b) => a.latency - b.latency);
  let cumulative = 0, estimatedLatencyMs = 0;
  for (const sample of latencies) { cumulative += sample.rate; estimatedLatencyMs = sample.latency; if (cumulative >= rps * .99) break; }
  const hottest = Object.entries(loads).sort((a, b) => b[1].ratio - a[1].ratio)[0];
  const errorRate = validation.valid ? Math.max(0, Math.min(100, 100 * (1 - successes / Math.max(1, rps)))) : 100;
  const cacheHits = Object.values(loads).reduce((sum, l) => sum + l.hits, 0);
  return { time, rps, reads, writes, loads, edges, warmth, estimatedLatencyMs: Math.round(estimatedLatencyMs), errorRate,
    cacheHit: reads ? cacheHits / reads * 100 : 0, hottest: hottest?.[0], validation };
}
export function runChapter(design, chapter) {
  let state;
  const frames = [];
  for (let step = 1; step <= chapter.duration * 5; step++) { state = tick(design, chapter, step / 5, state); frames.push(state); }
  return report(design, chapter, frames);
}
export function report(design, chapter, frames) {
  const worst = frames.reduce((a, b) => b.errorRate + b.estimatedLatencyMs / 100 > a.errorRate + a.estimatedLatencyMs / 100 ? b : a, frames[0]);
  const maxError = Math.max(...frames.map(f => f.errorRate)), estimatedLatencyMs = Math.max(...frames.map(f => f.estimatedLatencyMs));
  const cost = costOf(design.nodes), valid = validate(design).valid;
  const passed = valid && meetsMetricContract({ cost, maxError, estimatedLatencyMs });
  const bottleneck = design.nodes.find(n => n.id === worst?.hottest);
  const load = worst?.loads?.[bottleneck?.id];
  const reason = !valid ? validate(design).issues[0].text : cost > LIMIT ? `The design works outside the contract: $${cost} exceeds the $${LIMIT} monthly budget.` : !passed && bottleneck ? `${CATALOG[bottleneck.type].name} reached ${Math.round(load.ratio * 100)}% of its capacity. ${Math.round(load.reads).toLocaleString()} read and ${Math.round(load.writes).toLocaleString()} write operations per second competed for its resources.` : chapter.takeaway;
  const alternatives = bottleneck?.type === 'database' ? chapter.id === 1 ? 'Try reusing popular reads with a cache, or give storage more capacity. Check whether the API also needs room.' : 'Compare database capacity and the API’s code strategy. Caching does not remove durable writes.' : bottleneck?.type === 'api' ? 'Compare a larger API, replicas behind a balancer, or an edge cache that answers before the API.' : 'Inspect the highlighted component and its dependencies. More capacity and a different request path have different costs.';
  return { chapter: chapter.id, passed, estimatedLatencyMs, maxError, cost, reason, alternatives, bottleneck: bottleneck?.id, frames, fingerprint: fingerprint(design), modelVersion: MODEL_VERSION, scenarioVersion: scenarioVersion(chapter) };
}
export function traceRequest(design, kind = 'read', hot = false) {
  const validation = validate(design);
  if (!validation.valid) return [{ node: validation.issues[0].node, title: 'Request cannot complete', detail: validation.issues[0].text }];
  const map = Object.fromEntries(design.nodes.map(n => [n.id, n]));
  const deps = id => design.edges.filter(e => e.from === id).map(e => map[e.to]);
  const steps = [{ node: 'internet', title: kind === 'read' ? 'GET /bakery' : 'POST /links', detail: kind === 'read' ? 'A visitor wants the destination behind this short code.' : 'A partner sends https://bakery.example/menu to shorten.' }];
  const chain = ['internet'];
  let node = deps('internet')[0];
  while (node && node.type !== 'api') {
    steps.push({ node: node.id, from: chain.at(-1), title: node.type === 'cdn' ? hot && kind === 'read' ? 'Edge hit' : 'Forward to origin' : 'Choose an API replica', detail: node.type === 'cdn' ? hot && kind === 'read' ? 'A warm copy of this redirect is available at the edge.' : 'Creations and cache misses need the origin.' : 'Round-robin sends this request to one connected API.' });
    chain.push(node.id);
    if (node.type === 'cdn' && hot && kind === 'read') { node = null; break; }
    node = deps(node.id)[0];
  }
  if (node) {
    steps.push({ node: node.id, from: chain.at(-1), title: 'Run the link logic', detail: kind === 'read' ? 'Resolve a short code to its destination.' : `Code strategy: ${STRATEGIES[node.strategy || 'sequence'].name}.` });
    chain.push(node.id);
    const db = deps(node.id).find(n => n.type === 'database'), cache = deps(node.id).find(n => n.type === 'cache');
    if (kind === 'read') {
      if (cache) {
        steps.push({ node: cache.id, from: node.id, title: hot ? 'Cache hit' : 'Cache miss', detail: hot ? 'This mapping is already in memory.' : 'The first lookup has no cached value. The API must ask storage.' });
        steps.push({ node: node.id, from: cache.id, title: hot ? 'Receive the mapping' : 'Receive “not found”', detail: 'The cache replies to its caller on the same connection.', reply: true });
      }
      if (!cache || !hot) {
        steps.push({ node: db.id, from: node.id, title: 'Read the saved mapping', detail: 'SELECT destination WHERE code = bakery. Only this database does the lookup.' });
        steps.push({ node: node.id, from: db.id, title: 'Receive the destination', detail: 'The stored URL returns to the API.', reply: true });
        if (cache) steps.push({ node: cache.id, from: node.id, title: 'Fill the cache', detail: 'The API saves a copy for the next visitor. The database remains the source of truth.' });
      }
    } else {
      const policy = node.strategy || 'sequence';
      const allocator = policy === 'service' ? deps(node.id).find(n => n.type === 'idGenerator') : policy === 'sequence' ? db : node;
      steps.push({ node: allocator.id, from: allocator.id === node.id ? undefined : node.id, title: 'Allocate a short code', detail: STRATEGIES[policy].description });
      if (allocator.id !== node.id) steps.push({ node: node.id, from: allocator.id, title: 'Receive the code', detail: 'The allocated code returns to the API.', reply: true });
      steps.push({ node: db.id, from: node.id, title: 'Persist with UNIQUE', detail: 'Save code → destination. A random collision triggers another attempt, never an overwritten link.' });
      steps.push({ node: node.id, from: db.id, title: 'Commit acknowledged', detail: 'The API only reports success after the mapping is durably saved.', reply: true });
    }
  }
  for (let i = chain.length - 2; i >= 0; i--) steps.push({ node: chain[i], from: chain[i + 1], title: i === 0 ? kind === 'read' ? '302 · Redirect delivered' : '201 · Short link created' : 'Return the response', detail: i === 0 ? kind === 'read' ? 'The browser receives the destination. No second reverse wire is needed.' : 'The caller receives a usable short link after the save completes.' : 'The response travels back along the original call.', reply: true });
  return steps;
}
export function restoreSave(raw) {
  try {
    const save = JSON.parse(raw);
    if (![2, SAVE_VERSION].includes(save?.version) || !Array.isArray(save.design?.nodes) || !Array.isArray(save.design?.edges)) return null;
    const { nodes, edges } = save.design;
    if (nodes.length > 40 || edges.length > 100 || nodes.filter(n => n.id === 'internet' && n.type === 'internet').length !== 1 || new Set(nodes.map(n => n.id)).size !== nodes.length) return null;
    if (!nodes.every(n => typeof n.id === 'string' && Number.isFinite(n.x) && n.x >= 0 && n.x <= 85 && Number.isFinite(n.y) && n.y >= 0 && n.y <= 82 && (n.type === 'internet' ? n.id === 'internet' : CATALOG[n.type]?.tiers[n.tier] && Number.isInteger(n.tier)) && (n.type !== 'api' || STRATEGIES[n.strategy || 'sequence']))) return null;
    if (!edges.every(e => typeof e.id === 'string' && nodes.some(n => n.id === e.from) && nodes.some(n => n.id === e.to))) return null;
    const unlocked = Math.max(0, Math.min(2, Math.floor(Number(save.unlocked) || 0)));
    const normalize = r => {
      if (!r || !Number.isInteger(r.chapter) || !CHAPTERS[r.chapter] || typeof r.passed !== 'boolean'
        || !Number.isFinite(r.cost) || r.cost < 0 || !Number.isFinite(r.maxError) || r.maxError < 0 || r.maxError > 100
        || typeof r.fingerprint !== 'string' || r.fingerprint.length > 40000) return null;
      const estimatedLatencyMs = r.estimatedLatencyMs ?? (save.version === 2 ? r.p99 : undefined);
      if (!Number.isFinite(estimatedLatencyMs) || estimatedLatencyMs < 0) return null;
      const legacy = save.version === 2 && r.modelVersion == null && r.scenarioVersion == null;
      const modelVersion = legacy ? LEGACY_MODEL_VERSION : r.modelVersion;
      const scenario = legacy ? LEGACY_SCENARIOS[r.chapter] : r.scenarioVersion;
      if (typeof modelVersion !== 'string' || typeof scenario !== 'string' || modelVersion.length > 100 || scenario.length > 1000) return null;
      return { chapter: r.chapter, passed: r.passed, fingerprint: r.fingerprint, cost: r.cost, maxError: r.maxError,
        estimatedLatencyMs, modelVersion, scenarioVersion: scenario };
    };
    const allHistory = (Array.isArray(save.history) ? save.history : []).map(normalize).filter(Boolean);
    const history = allHistory.slice(-12);
    // Only v2 needs history migration. v3's durable ledger is independent of recent attempts.
    const candidates = save.version === 2 ? allHistory : (Array.isArray(save.certificates) ? save.certificates : []).map(normalize).filter(Boolean);
    const certificates = candidates.reduce(recordCertificate, []);
    return { version: SAVE_VERSION, design: save.design, unlocked,
      chapter: Math.max(0, Math.min(unlocked, Math.floor(Number(save.chapter) || 0))), guided: save.guided !== false, history, certificates };
  } catch { return null; }
}
