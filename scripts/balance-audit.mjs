import { pathToFileURL } from 'node:url';
import { CATALOG, CHAPTERS, EMPTY_DESIGN, LIMIT, MODEL_VERSION, costOf, runChapter, scenarioVersion, validate } from '../src/levelModel.js';

export const FAMILIES = [
  { name: 'Direct origin' }, { name: 'Origin cache', cache: true }, { name: 'Edge cache', edge: true },
  { name: 'Edge + origin cache', edge: true, cache: true }, { name: 'Balanced APIs', balanced: true },
  { name: 'Balanced + shared cache', balanced: true, cache: true }, { name: 'Balanced + edge', balanced: true, edge: true },
];
const tiers = [0, 1, 2];
const edge = (from, to) => ({ id: `${from}-${to}`, from, to });
export function auditDesign(options) {
  const { api, db, cache, cdn, balancer, strategy, allocator } = options;
  const nodes = [...EMPTY_DESIGN.nodes], edges = [];
  const add = (id, type, tier, x, y) => nodes.push({ id, type, tier, x, y, ...(type === 'api' ? { strategy } : {}) });
  add('db', 'database', db, 69, 43);
  if (cache !== null) add('cache', 'cache', cache, 69, 12);
  if (cdn !== null) add('edge', 'cdn', cdn, 7, 12);
  if (balancer !== null) add('lb', 'loadBalancer', balancer, 25, 43);
  if (allocator !== null) add('id', 'idGenerator', allocator, 69, 73);
  api.forEach((tier, i) => {
    const id = `api${i + 1}`;
    add(id, 'api', tier, 40, api.length === 1 ? 43 : i === 0 ? 12 : 73);
    edges.push(edge(id, 'db'));
    if (cache !== null) edges.push(edge(id, 'cache'));
    if (allocator !== null) edges.push(edge(id, 'id'));
    if (balancer !== null) edges.push(edge('lb', id));
  });
  const origin = balancer !== null ? 'lb' : 'api1';
  edges.push(edge('internet', cdn !== null ? 'edge' : origin));
  if (cdn !== null) edges.push(edge('edge', origin));
  return { nodes, edges };
}
export function* auditCandidates() {
  for (const family of FAMILIES) for (const first of tiers) for (const second of family.balanced ? tiers.filter(tier => tier >= first) : [null])
    for (const db of tiers) for (const cache of family.cache ? tiers : [null]) for (const cdn of family.edge ? tiers : [null])
      for (const balancer of family.balanced ? tiers : [null]) for (const strategy of ['sequence', 'random', 'service']) for (const allocator of strategy === 'service' ? tiers : [null]) {
        const options = { api: second === null ? [first] : [first, second], db, cache, cdn, balancer, strategy, allocator };
        yield { family: family.name, options, design: auditDesign(options) };
      }
}
const vector = candidate => [candidate.cost, ...candidate.results.map(result => result.maxError), ...candidate.results.map(result => result.estimatedLatencyMs)];
export function dominates(a, b) {
  const left = vector(a), right = vector(b), epsilon = 1e-9;
  if (left.length !== right.length || ![...left, ...right].every(Number.isFinite)) throw new Error('Frontier comparisons require matching finite metrics.');
  return left.every((v, i) => v <= right[i] + epsilon) && left.some((v, i) => v < right[i] - epsilon);
}
export function runBalanceAudit() {
  let enumerated = 0, excludedOverBudget = 0;
  const tested = [];
  for (const candidate of auditCandidates()) {
    enumerated++;
    if (!validate(candidate.design).valid) throw new Error(`Invalid audit fixture: ${JSON.stringify(candidate.options)}`);
    const cost = costOf(candidate.design.nodes);
    if (cost > LIMIT) { excludedOverBudget++; continue; }
    const results = CHAPTERS.map(chapter => {
      const result = runChapter(candidate.design, chapter);
      return { chapter: chapter.id, passed: result.passed, maxError: result.maxError, estimatedLatencyMs: result.estimatedLatencyMs };
    });
    tested.push({ family: candidate.family, options: candidate.options, cost, results, passed: results.every(result => result.passed) });
  }
  const passing = tested.filter(candidate => candidate.passed);
  const order = (a, b) => a.cost - b.cost || Math.max(...a.results.map(r => r.estimatedLatencyMs)) - Math.max(...b.results.map(r => r.estimatedLatencyMs)) || JSON.stringify(a.options).localeCompare(JSON.stringify(b.options));
  const frontier = passing.filter(candidate => !passing.some(other => dominates(other, candidate))).sort(order);
  const families = FAMILIES.map(family => {
    const all = tested.filter(candidate => candidate.family === family.name), wins = all.filter(candidate => candidate.passed).sort(order);
    return { family: family.name, tested: all.length, passing: wins.length, cheapest: wins[0] ?? null };
  });
  const strategies = ['sequence', 'random', 'service'].map(strategy => {
    const all = tested.filter(candidate => candidate.options.strategy === strategy), wins = all.filter(candidate => candidate.passed).sort(order);
    return { strategy, tested: all.length, passing: wins.length, cheapest: wins[0] ?? null, frontier: frontier.filter(candidate => candidate.options.strategy === strategy).length };
  });
  const base = candidate => JSON.stringify({ ...candidate.options, strategy: undefined, allocator: undefined });
  const hardware = new Map();
  for (const candidate of tested) { const key = base(candidate); if (!hardware.has(key)) hardware.set(key, []); hardware.get(key).push(candidate); }
  const serviceOnlyHardware = [...hardware.values()].filter(group => group.some(c => c.options.strategy === 'service' && c.passed) && !group.some(c => c.options.strategy !== 'service' && c.passed)).length;
  return { modelVersion: MODEL_VERSION, scenarios: CHAPTERS.map(scenarioVersion), budget: LIMIT, enumerated, excludedOverBudget,
    tested: tested.length, passing: passing.length, families, strategies, serviceOnlyHardware,
    frontierCount: frontier.length, frontierMetricPoints: new Set(frontier.map(candidate => JSON.stringify(vector(candidate).map(n => Math.round(n * 1e6) / 1e6)))).size,
    frontier, componentTiers: Object.fromEntries(Object.entries(CATALOG).map(([type, config]) => [type, config.tiers.map(tier => tier.name)])) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(runBalanceAudit(), null, 2));
