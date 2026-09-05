import { costOf, LIMIT, validate, STRATEGIES } from './levelModel.js';
import { componentLabel } from './trafficEvidence.js';

export function contextualHelp(design, chapter, result, frame) {
  const valid = validate(design), cost = costOf(design.nodes);
  if (!valid.valid) {
    const issue = valid.issues[0], node = design.nodes.find(n => n.id === issue.node);
    const allocator = node?.type === 'api' && node.strategy === 'service' && issue.text.includes('ID service');
    return { key: `structure:${issue.node}:${issue.text}`, node: issue.node,
      question: allocator ? 'Where will this API get the code it chose to request?' : 'Which user operation cannot finish with these connections?',
      evidence: issue.text,
      experiment: allocator ? 'Keep the dedicated strategy and connect its allocator, or compare a database sequence / random codes on the API. All three strategies can be valid.' : 'Inspect the highlighted component and preview its available service calls. Make one connection change, then check whether the functional warning disappears.' };
  }
  if (cost > LIMIT) return { key: 'budget', question: 'Which cost is buying useful work?',
    evidence: `All placed components cost $${cost}/month, $${cost - LIMIT} above the contract. Unused components also count.`,
    experiment: 'Inspect unused components or compare a smaller tier. Change one cost at a time and rerun the same traffic; less capacity can move a bottleneck.' };
  if (result && !result.passed && frame?.bottleneck) {
    const id = frame.bottleneck, node = design.nodes.find(n => n.id === id);
    const failures = frame.outcomes.filter(o => o.blockedBy === id);
    const reads = failures.filter(o => o.kind === 'read').reduce((n, o) => n + o.rate, 0), writes = failures.filter(o => o.kind === 'write').reduce((n, o) => n + o.rate, 0);
    const alternatives = node?.type === 'database' ? writes > reads ? 'Compare storage write capacity and the API’s allocation strategy. A read cache cannot persist new mappings.' : 'Compare reusing reads with more storage capacity. Check a recorded path before choosing; cache misses still call storage.'
      : node?.type === 'api' ? 'Compare one API upgrade, balanced replicas, or an edge answering repeated redirects. Inspect the next dependency too; moving a bottleneck is not eliminating it.'
      : node?.type === 'idGenerator' ? 'Compare allocator capacity with a different API code strategy. An extra allocator is optional, but the selected dedicated strategy depends on it.'
      : 'Inspect this component’s admitted/rejected work, then compare capacity or a different valid request path. Change one thing before retesting.';
    return { key: `rejected:${chapter.id}:${id}`, node: id,
      question: `Why did these requests stop at ${componentLabel(design, id)}?`,
      evidence: `At ${frame.time.toFixed(1)}s, this component rejected approximately ${Math.round(reads)} redirects/s and ${Math.round(writes)} creations/s. Those requests did not call downstream services. Other components may also reject work.`, experiment: alternatives };
  }
  if (result?.passed) return { key: `passed:${chapter.id}`, question: 'What does this pass prove—and what does it leave untested?',
    evidence: 'This design met the selected workload, budget and sample thresholds. It does not establish production readiness or prove you can explain the result.',
    experiment: 'Follow a completed and a rejected group if available, or compare a cheaper design. Predict which resource changes before the next run.' };
  const strategies = [...new Set(valid.apis.map(api => STRATEGIES[api.strategy || 'sequence'].name))].join(', ');
  return { key: `ready:${chapter.id}`, node: valid.apis[0]?.id,
    question: chapter.question,
    evidence: `The functional checks pass. Your API code strategy choices are: ${strategies}. Capacity is not proven until you test traffic.`,
    experiment: 'Try creating and opening a mapping, then send the forecast traffic. Watch one operation before inspecting the whole system; no component checklist defines the only solution.' };
}
