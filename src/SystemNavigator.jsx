import { useEffect, useRef } from 'react';
import { CATALOG, validate } from './levelModel.js';
import { componentLabel } from './trafficEvidence.js';
const count = value => (value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
export default function SystemNavigator({ design, frame, running, paused, onInspect, onConnect, onConnection, onClose }) {
  const title = useRef(null), validation = validate(design), inspectable = !running || paused;
  useEffect(() => { title.current?.focus(); }, []);
  return <section id="l1-system-navigator" className="l1-system-navigator" aria-label="Text system navigator">
    <button className="l1-text-button" onClick={onClose}>Close system list</button>
    <h2 ref={title} tabIndex={-1}>Your system, in words.</h2>
    <p>Inspect a component to configure, move or remove it. A call includes its returning reply; it is not a one-way data pipe.</p>
    {frame && <p>{inspectable ? `Recorded sample: ${frame.time.toFixed(1)}s. Counts are request rates, not individual packets.` : 'Traffic is running. Pause to inspect a stable sample; component inspection stays available.'}</p>}
    <h3>Components · {design.nodes.length - 1} + visitors</h3>
    <ul aria-label="System components">{design.nodes.map(node => {
      const label = componentLabel(design, node.id), load = frame?.loads[node.id];
      return <li key={node.id}><strong>{label}</strong><p>{node.type === 'internet' ? 'Creates links and opens short codes.' : `${CATALOG[node.type].tiers[node.tier].name} · $${CATALOG[node.type].tiers[node.tier].cost}/month · ${CATALOG[node.type].verb}`}</p>
        {!validation.reachable.has(node.id) && <p>Not reachable from visitors.</p>}
        {inspectable && frame && <p>{node.type === 'internet' ? `${count(frame.rps)} incoming requests/s` : load ? `${count(load.admitted)} admitted/s · ${count(load.rejected)} rejected here/s` : 'No calls recorded at this component in this sample.'}</p>}
        <div><button onClick={() => onInspect(node.id)}>Inspect {label}</button>{['internet', 'api', 'loadBalancer', 'cdn'].includes(node.type) && <button disabled={running} onClick={() => onConnect(node.id)}>Start call from {label}</button>}</div>
      </li>;
    })}</ul>
    <h3>Service calls · {design.edges.length}</h3>
    {design.edges.length ? <ul aria-label="System service calls">{design.edges.map(edge => <li key={edge.id}><p>{componentLabel(design, edge.from)} calls {componentLabel(design, edge.to)}. The reply returns on this connection.</p><button onClick={() => onConnection(edge.id)}>Inspect call from {componentLabel(design, edge.from)} to {componentLabel(design, edge.to)}</button></li>)}</ul> : <p>No service calls yet. Start from a caller to preview available targets.</p>}
  </section>;
}
