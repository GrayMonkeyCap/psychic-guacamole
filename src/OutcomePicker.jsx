import { useState } from 'react';
import { componentLabel } from './trafficEvidence.js';

export default function OutcomePicker({ frame, design, onSelect }) {
  const [filter, setFilter] = useState('all');
  if (!frame?.outcomes?.length || frame.evidenceVersion !== 1) return null;
  const outcomes = frame.outcomes.map((outcome, index) => ({ outcome, index })).filter(({ outcome }) => filter === 'all' || (filter === 'rejected' ? outcome.blockedBy : !outcome.blockedBy));
  return <section className="l1-outcomes" aria-label="Recorded traffic outcomes">
    <h3>What happened at {frame.time.toFixed(1)}s?</h3>
    <p>Recorded paths for groups of requests—not individual packet captures. Choose a group to follow its calls and replies.</p>
    <label>Show outcomes<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All outcomes</option><option value="rejected">Rejected</option><option value="completed">Completed</option></select></label>
    <div className="l1-outcome-list">{outcomes.map(({ outcome, index }) => {
      const apiCall = outcome.calls?.find(c => design.nodes.find(n => n.id === c.to)?.type === 'api');
      const hit = outcome.cacheDecisions?.find(d => d.status === 'hit');
      return <button key={index} onClick={() => onSelect(index)} className={outcome.blockedBy ? 'rejected' : ''}>
        <strong>{outcome.kind === 'read' ? 'Redirect' : 'Create link'} · {outcome.blockedBy ? 'Rejected' : 'Completed'}</strong>
        <span>{outcome.blockedBy ? `Stopped at ${componentLabel(design, outcome.blockedBy)}` : apiCall ? `Via ${componentLabel(design, apiCall.to)}` : 'Served at the edge'}</span>
        <span>{hit ? `Hit in ${componentLabel(design, hit.node)}` : outcome.cacheDecisions?.some(d => d.status === 'miss') ? 'After a cache miss' : outcome.kind === 'write' ? 'Creation path' : 'Direct request path'}</span>
        <small>≈ {outcome.rate.toLocaleString(undefined, { maximumFractionDigits: 1 })} requests/sec · Follow path →</small>
      </button>;
    })}{!outcomes.length && <p>No {filter} requests in this sample.</p>}</div>
  </section>;
}
