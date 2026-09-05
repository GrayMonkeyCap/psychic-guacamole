import { useState } from 'react';
import { componentLabel } from './trafficEvidence.js';
import { describeConnection } from './connectionGuidance.js';
export default function ConnectionPlanner({ design, from, onConnect, onCancel }) {
  const [target, setTarget] = useState('');
  const preview = target ? describeConnection(design, from, target) : null;
  return <section className="l1-connection-planner" aria-label="Plan a service call">
    <h2>{componentLabel(design, from)} calls…</h2>
    <p>Choose a target to understand the conversation before connecting it. You can also use a highlighted component on the board.</p>
    <label>Target service<select value={target} onChange={e => setTarget(e.target.value)}><option value="">Choose a component</option>{design.nodes.filter(n => n.id !== from).map(n => <option key={n.id} value={n.id}>{componentLabel(design, n.id)}</option>)}</select></label>
    {preview && <div className="l1-call-preview" role="status">{preview.valid ? <><h3>Request →</h3><p>{preview.request}</p><h3>← Response</h3><p>{preview.response}</p><p>{preview.note}</p><strong>{preview.reply}</strong></> : <p>{preview.error}</p>}</div>}
    <button className="l1-primary" disabled={!preview?.valid} onClick={() => onConnect(target)}>Connect this call</button>
    <button className="l1-text-button" onClick={onCancel}>Cancel connection</button>
  </section>;
}
