import { useEffect, useRef } from 'react';
import { completionRecap } from './completionRecap.js';
export default function CompletionRecap({ design, chapter, result, onClose, onFollow }) {
  const title = useRef(null), recap = completionRecap(design, chapter, result);
  useEffect(() => { title.current?.focus(); }, []);
  if (!recap) return null;
  return <section className="l1-completion-recap" aria-label="Pass explanation">
    <button className="l1-text-button" onClick={onClose}>Close pass explanation</button>
    <h2 ref={title} tabIndex={-1}>Your design, explained.</h2>
    <h3>What this run demonstrated</h3><p>{recap.demonstrated}</p><p>{recap.operation}</p>
    <h3>What your choices buy</h3><ul>{recap.choices.map(choice => <li key={choice}>{choice}</li>)}</ul>
    <h3>Still an open question</h3><p>{recap.question}</p><p>{recap.limitation}</p>
    <div className="l1-recap-traces">{recap.traces.map(ref => <button className="l1-secondary" key={ref.kind} onClick={() => onFollow(ref)}>{ref.kind === 'write' ? 'Follow a recorded creation' : 'Follow a recorded redirect'}</button>)}</div>
    <p>These traces show recorded request groups. Exploring them is optional; your earned pass stays yours.</p>
  </section>;
}
