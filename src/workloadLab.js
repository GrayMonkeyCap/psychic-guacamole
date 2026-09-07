import { CATALOG, MODEL_VERSION, costOf, fingerprint, normalizeDesign, runChapter, validate } from './levelModel.js';
import { componentLabel } from './trafficEvidence.js';

export const WORKLOAD_RATES = [100, 500, 1000, 1400, 2400];
export const WORKLOAD_SHAPES = [
  { key: 'repeat', name: 'Repeat a popular link', reads: .8, hot: .92, example: '80 requests open links; 20 create new ones. Most readers want the same link.' },
  { key: 'scatter', name: 'Explore different links', reads: .8, hot: .15, example: 'Still 80 opens and 20 creations. Now readers mostly want different links.' },
  { key: 'create', name: 'Create lots of links', reads: .15, hot: .15, example: '15 requests open links; 85 create new ones. Every creation needs a saved mapping.' },
];

// An ungraded read-only experiment. Never return certificates or invoke the save/session loop.
export function runWorkloadLab(source, peak) {
  const design = normalizeDesign(source);
  if (!design) throw new Error('This board cannot be read. Return to building and check your saved design.');
  if (!WORKLOAD_RATES.includes(peak)) throw new Error('Choose one of the available traffic rates.');
  const validation = validate(design);
  if (!validation.valid) return { ready: false, issues: [...new Set(validation.issues.map(issue => issue.text))] };
  const runs = WORKLOAD_SHAPES.map(shape => {
    // Identical ramp/duration/peak and independently cold caches. Only operation mix/reuse changes.
    const chapter = { ...shape, id: -1, peak, duration: 12, takeaway: '' };
    const { frames, maxError } = runChapter(design, chapter);
    const last = frames.at(-1);
    return { key: shape.key, name: shape.name, maxError, incoming: last.rps, reads: last.reads, writes: last.writes,
      cacheHit: last.cacheHit, coldCacheHit: frames[0].cacheHit,
      nodes: design.nodes.filter(n => CATALOG[n.type]).map(node => {
        const load = last.loads[node.id];
        return { id: node.id, name: componentLabel(design, node.id), type: node.type,
          observed: Boolean(load), reads: load?.reads || 0, writes: load?.writes || 0,
          rejected: load?.rejected || 0, ratio: load?.ratio || 0 };
      }) };
  });
  return { ready: true, modelVersion: MODEL_VERSION, fingerprint: fingerprint(design), cost: costOf(design.nodes), peak, duration: 12, runs };
}
