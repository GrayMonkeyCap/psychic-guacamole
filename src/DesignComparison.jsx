import { useEffect, useRef, useState } from 'react';
import { compareDesigns } from './designComparison.js';

const number = (value, decimals = 3) => value == null ? 'Unavailable' : value.toLocaleString(undefined, { maximumFractionDigits: decimals });
const delta = value => value == null ? 'Unavailable' : Math.abs(value) < .0005 ? '0' : `${value > 0 ? '+' : '−'}${number(Math.abs(value))}`;
export default function DesignComparison({ design, snapshots, onClose }) {
  const options = [{ id: 'working', name: 'Working board', design }, ...snapshots.map(snapshot => ({ ...snapshot, id: `snapshot:${snapshot.id}` }))];
  const [left, setLeft] = useState('working'), [right, setRight] = useState(options[1]?.id || 'working');
  const [result, setResult] = useState(null), [error, setError] = useState('');
  const first = useRef(null), heading = useRef(null);
  useEffect(() => { first.current?.focus(); }, []);
  useEffect(() => { setResult(null); setError(''); }, [design, snapshots]);
  useEffect(() => { if (result) heading.current?.focus(); }, [result]);
  function select(setter, value) { setter(value); setResult(null); setError(''); }
  function compare() {
    try {
      const a = options.find(option => option.id === left), b = options.find(option => option.id === right);
      if (!a || !b) throw new Error('A selection is no longer available. Choose two designs again.');
      setResult(compareDesigns(a, b)); setError('');
    } catch (failure) { setResult(null); setError(failure.message); }
  }
  const headers = result ? <tr><th scope="col">Metric</th><th scope="col">A · {result.sides[0].name}</th><th scope="col">B · {result.sides[1].name}</th><th scope="col">B − A</th></tr> : null;
  return <section className="l1-design-comparison" aria-label="Fair design comparison">
    <button className="l1-text-button" onClick={onClose}>Back to design shelf</button>
    <h3>Same traffic. Two ideas.</h3>
    <p>Run both designs against all three Level 1 contracts with identical traffic and a fresh cold cache for every test. This does not load a board, unlock challenges or award passes.</p>
    <div className="l1-comparison-choices">
      <div><label htmlFor="comparison-design-a">Design A</label><select id="comparison-design-a" ref={first} value={left} onChange={event => select(setLeft, event.target.value)}>{options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>
      <div><label htmlFor="comparison-design-b">Design B</label><select id="comparison-design-b" value={right} onChange={event => select(setRight, event.target.value)}>{options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>
    </div>
    <button className="l1-primary" onClick={compare}>Run fair comparison</button>
    {error && <p role="alert">{error}</p>}
    {result && <section aria-label="Design comparison results">
      <h3 ref={heading} tabIndex={-1}>{result.comparable ? 'Fresh results, same conditions.' : 'Fix the setup before comparing traffic.'}</h3>
      <p>Model {result.modelVersion} · cold start · deterministic 0.2-second samples. No random seed is used in this aggregate model. Historical passes and previous cache warmth are not reused.</p>
      <table><caption>Cost of every placed component</caption><thead>{headers}</thead><tbody><tr><th scope="row">Monthly cost ($)</th><td>{number(result.sides[0].cost, 0)}</td><td>{number(result.sides[1].cost, 0)}</td><td>{delta(result.costDelta)}</td></tr></tbody></table>
      {!result.comparable && result.sides.map((side, index) => side.issues.length > 0 && <div key={index}><h4>{index ? 'B' : 'A'} · {side.name}</h4><ul>{side.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>)}
      {result.chapters.map(chapter => <section key={chapter.id} data-comparison-chapter={chapter.id}>
        <h4>{chapter.name}</h4><p>A: {chapter.results[0].passed ? 'Pass' : 'Fail'} · B: {chapter.results[1].passed ? 'Pass' : 'Fail'}</p>
        <table><caption>{chapter.name} · worst sample and peak estimate</caption><thead>{headers}</thead><tbody>
          <tr><th scope="row">Rejected / sample (%)</th><td>{number(chapter.results[0].maxError)}</td><td>{number(chapter.results[1].maxError)}</td><td>{delta(chapter.rejectionDelta)} pp</td></tr>
          <tr><th scope="row">Est. latency (ms)</th><td>{number(chapter.results[0].estimatedLatencyMs)}</td><td>{number(chapter.results[1].estimatedLatencyMs)}</td><td>{delta(chapter.latencyDelta)}</td></tr>
        </tbody></table>
      </section>)}
      <p>Δ is B minus A; pp means percentage points. Lower values are preferable for these metrics, not a universal architecture ranking. Latency describes completed requests: check rejected work before calling a design faster. Displayed numbers are rounded; contract checks use full precision.</p>
      <details><summary>What changed? · {result.changes.length} recorded changes</summary>{result.changes.length ? <ul>{result.changes.map((change, index) => <li key={index}>{change}</li>)}</ul> : <p>No component, tier, allocation or call changes. Layout and wire identifiers are ignored.</p>}<p>Changes are matched by saved component identity. Rebuilding a component counts as removal/addition. Several changes together do not isolate a cause; try changing one thing next.</p></details>
      <p>These are game costs and modeled outcomes, not production sizing or reliability benchmarks. Comparison results are session-only; your board, recording, shelf and earned passes remain unchanged.</p>
    </section>}
  </section>;
}
