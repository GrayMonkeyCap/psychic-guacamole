import { fingerprint, isCurrentResult, validate } from './levelModel.js';

const allocation = {
  sequence: 'Database sequence: simpler API allocation, with extra database work before the mapping is saved.',
  random: 'Random codes in the API: extra modeled compute, without a separate allocation service. UNIQUE and retry protect mappings; traffic uses a small fixed retry overhead.',
  service: 'Dedicated ID service: less allocation work in the API/database, but another paid dependency on the creation path.',
};
export function completionRecap(design, chapter, result) {
  if (!result?.passed || !isCurrentResult(result, chapter) || result.fingerprint !== fingerprint(design)) return null;
  const validation = validate(design);
  if (!validation.valid) return null;
  const frames = result.frames || [];
  function recorded(kind, preferHit = false) {
    let fallback;
    for (let i = frames.length - 1; i >= 0; i--) {
      const frame = frames[i];
      if (frame.evidenceVersion !== 1) continue;
      for (let j = 0; j < (frame.outcomes?.length || 0); j++) {
        const outcome = frame.outcomes[j];
        if (outcome.kind !== kind || outcome.blockedBy || outcome.rate <= 0 || !outcome.calls?.length) continue;
        const ref = { frameIndex: i, outcomeIndex: j, kind };
        if (!preferHit || outcome.cacheDecisions?.some(d => d.status === 'hit')) return ref;
        fallback ||= ref;
      }
    }
    return fallback;
  }
  const creation = recorded('write'), redirect = recorded('read', true);
  const hit = redirect && frames[redirect.frameIndex].outcomes[redirect.outcomeIndex].cacheDecisions?.some(d => d.status === 'hit');
  const strategies = [...new Set(validation.apis.map(n => n.strategy || 'sequence'))];
  const choices = strategies.map(strategy => allocation[strategy]);
  choices.push(hit ? 'A recorded redirect group completed from a cached copy. That avoids its origin lookup, but the cache costs money and must warm up; new mappings still need storage.'
    : redirect ? 'No cache-served redirect is recorded here. The origin carried the read work. Compare capacity cost with caching rather than assuming more components are better.'
      : 'No supported redirect recording is available here. A placed cache alone does not prove it served requests; rerun traffic to inspect the evidence.');
  if (validation.apis.length > 1) choices.push(`${validation.apis.length} reachable APIs share incoming work. They still depend on one shared database; replicas do not multiply storage capacity.`);
  return {
    demonstrated: `Your design met “${chapter.name}”: a fixed ${chapter.duration}-second workload up to ${chapter.peak.toLocaleString()} requests/s, within the published per-sample success, estimated-latency and budget limits.`,
    operation: creation ? 'Recorded creations reached storage before completing. Code allocation alone did not make a usable saved link.' : 'This recording does not include a completed creation to inspect.',
    choices,
    limitation: 'This is a game-contract pass, not an assessment of your understanding or production readiness. Outages, waiting queues, real durability, security and cache invalidation remain untested.',
    question: hit ? 'If the cache starts empty—or more requests create links—which dependency gets the extra work?' : 'If traffic shifts from opening links to creating them, does equal request rate mean equal database work?',
    traces: [creation, redirect].filter(Boolean),
  };
}
