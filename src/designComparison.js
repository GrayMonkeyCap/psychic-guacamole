import { CATALOG, CHAPTERS, LIMIT, MODEL_VERSION, STRATEGIES, costOf, normalizeDesign, runChapter, scenarioVersion, validate } from './levelModel.js';
import { componentLabel } from './trafficEvidence.js';

const tier = node => CATALOG[node.type]?.tiers[node.tier]?.name || 'Fixed';
const strategy = node => STRATEGIES[node.strategy || 'sequence']?.name;
export function designChanges(a, b) {
  const changes = [];
  for (const node of a.nodes) {
    const next = b.nodes.find(item => item.id === node.id);
    if (!next || next.type !== node.type) changes.push(`Removed ${componentLabel(a, node.id)} (${tier(node)}).`);
    else {
      if (node.type !== 'internet' && node.tier !== next.tier) changes.push(`${componentLabel(b, node.id)} capacity: ${tier(node)} → ${tier(next)}.`);
      if (node.type === 'api' && (node.strategy || 'sequence') !== (next.strategy || 'sequence')) changes.push(`${componentLabel(b, node.id)} allocation: ${strategy(node)} → ${strategy(next)}.`);
    }
  }
  for (const node of b.nodes) if (!a.nodes.some(item => item.id === node.id && item.type === node.type)) changes.push(`Added ${componentLabel(b, node.id)} (${tier(node)}${node.type === 'api' ? `, ${strategy(node)}` : ''}).`);
  for (const [source, other, action] of [[a, b, 'Removed'], [b, a, 'Added']]) {
    for (const edge of source.edges) if (!other.edges.some(item => item.from === edge.from && item.to === edge.to)) changes.push(`${action} call: ${componentLabel(source, edge.from)} → ${componentLabel(source, edge.to)}.`);
  }
  return changes;
}

export function metricDelta(a, b) {
  return Number.isFinite(a) && Number.isFinite(b) ? b - a : null;
}

export function compareDesigns(left, right) {
  const sides = [left, right].map(source => {
    const design = normalizeDesign(source?.design);
    if (!design) throw new Error('A selected design is damaged or unsupported. Reopen the design shelf.');
    const validation = validate(design), cost = costOf(design.nodes);
    return { name: source.name, design, cost, issues: [...new Set(validation.issues.map(issue => issue.text)), ...(cost > LIMIT ? [`Over the ${LIMIT} game budget by ${cost - LIMIT}.`] : [])] };
  });
  const base = { modelVersion: MODEL_VERSION, scenarioVersions: CHAPTERS.map(scenarioVersion), cacheStart: 'cold', sides,
    changes: designChanges(sides[0].design, sides[1].design), costDelta: metricDelta(sides[0].cost, sides[1].cost) };
  if (sides.some(side => side.issues.length)) return { ...base, comparable: false, chapters: [] };
  const chapters = CHAPTERS.map(chapter => {
    // Fresh independent runs; no historical reports, certificates or cached state are accepted.
    const results = sides.map(side => {
      const result = runChapter(side.design, chapter);
      return { passed: result.passed, cost: result.cost, maxError: result.maxError, estimatedLatencyMs: result.estimatedLatencyMs,
        fingerprint: result.fingerprint, modelVersion: result.modelVersion, scenarioVersion: result.scenarioVersion };
    });
    return { id: chapter.id, name: chapter.name, results, rejectionDelta: metricDelta(results[0].maxError, results[1].maxError), latencyDelta: metricDelta(results[0].estimatedLatencyMs, results[1].estimatedLatencyMs) };
  });
  return { ...base, comparable: true, chapters };
}
