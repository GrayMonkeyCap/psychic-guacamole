import { useId } from 'react';
import { componentLabel } from './trafficEvidence.js';

export const uniqueIssues = validation => [...new Map(validation.issues.map(issue => [JSON.stringify([issue.node, issue.text]), issue])).values()];

export default function StructureReview({ design, validation, onInspect }) {
  const issues = uniqueIssues(validation);
  if (!issues.length) return null;
  return <details className="l1-structure-review">
    <summary>Review {issues.length} connection {issues.length === 1 ? 'issue' : 'issues'}</summary>
    <p>These functional checks block traffic. Inspect a cause and choose how to fix it; capacity is tested separately.</p>
    <ol aria-label="Connection issues">{issues.map(issue => <li key={JSON.stringify([issue.node, issue.text])}><button onClick={() => onInspect(issue.node)}><strong>{componentLabel(design, issue.node)}</strong><span>{issue.text}</span><small>Inspect this issue →</small></button></li>)}</ol>
  </details>;
}

export function LocalStructureIssues({ selected, validation }) {
  const title = useId(), issues = uniqueIssues(validation).filter(issue => issue.node === selected);
  if (!issues.length) return null;
  return <section className="l1-local-issues" aria-labelledby={title}>
    <h3 id={title}>Connection issue here</h3>
    {issues.map(issue => <p key={issue.text}>{issue.text}</p>)}
    <p>Fixing the connection or configuration removes this warning. It does not yet prove enough capacity.</p>
  </section>;
}
