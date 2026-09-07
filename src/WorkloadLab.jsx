import { useEffect, useState } from 'react';
import { fingerprint, LIMIT } from './levelModel.js';
import { runWorkloadLab, WORKLOAD_RATES, WORKLOAD_SHAPES } from './workloadLab.js';

const number = value => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
export default function WorkloadLab({ design, initialPeak = 100 }) {
  const [peak, setPeak] = useState(WORKLOAD_RATES.includes(initialPeak) ? initialPeak : 1000), [result, setResult] = useState(null), [error, setError] = useState('');
  const signature = fingerprint(design);
  useEffect(() => { setResult(null); setError(''); }, [signature]);
  function compare() {
    try { setResult(runWorkloadLab(design, peak)); setError(''); }
    catch (e) { setError(e.message); setResult(null); }
  }
  const validResult = result?.ready && result.fingerprint === signature ? result : null;
  return <div className="l1-workload-lab">
    <p>Same board. Same request volume. Different jobs. Before comparing, predict which workload will put the most pressure on your database.</p>
    <div className="l1-workload-shapes">{WORKLOAD_SHAPES.map(shape => <article key={shape.key}><h3>{shape.name}</h3><small>Imagine 100 requests</small><p>{shape.example}</p><p>{Math.round(shape.hot * 100)}% of redirect reads revisit one hot link.</p></article>)}</div>
    <p>“Hot” means requested repeatedly, not already cached. Every experiment starts cold; a successful origin read must fill a copy before it can be reused.</p>
    <label>Shared peak traffic<select value={peak} onChange={e => { setPeak(Number(e.target.value)); setResult(null); setError(''); }}>{WORKLOAD_RATES.map(rate => <option key={rate} value={rate}>{rate.toLocaleString()} requests / second</option>)}</select></label>
    <p>All three use the same five-second ramp and 12-second duration. This does not change your challenge, board, recording or earned passes.</p>
    <button className="l1-primary" onClick={compare}>Compare these workloads</button>
    {error && <p role="alert">{error}</p>}
    {result && !result.ready && <section role="status"><h3>Connect a working request path first</h3><ul>{result.issues.map(issue => <li key={issue}>{issue}</li>)}</ul><p>No experiment was run. Return to the board and use the structural checklist.</p></section>}
    {validResult && <section aria-label="Workload experiment results">
      <p role="status">Three ungraded experiments complete. No pass or progress awarded.</p>
      <h3>What changed at the same {number(peak)} requests/sec?</h3>
      <p>Component work below is offered work in the final 12.0s sample, not completed user requests. Rejected work stops before later dependencies. Zero work may mean an unused component or an upstream rejection.</p>
      <div className="l1-workload-table" tabIndex={0} role="region" aria-label="Workload comparison table; scroll horizontally on small screens"><table>
        <caption>Your unchanged design · ${validResult.cost}/mo in game units{validResult.cost > LIMIT ? ' · over the challenge budget' : ''}</caption>
        <thead><tr><th scope="col">Compare</th>{validResult.runs.map(run => <th scope="col" key={run.key}>{run.name}</th>)}</tr></thead>
        <tbody>
          <tr><th scope="row">Incoming redirects / creations per sec</th>{validResult.runs.map(run => <td key={run.key}>{number(run.reads)} / {number(run.writes)}</td>)}</tr>
          <tr><th scope="row">Reads answered by caches at 12s</th>{validResult.runs.map(run => <td key={run.key}>{number(run.cacheHit)}%</td>)}</tr>
          <tr><th scope="row">Worst rejected requests · whole run</th>{validResult.runs.map(run => <td key={run.key}>{number(run.maxError)}%</td>)}</tr>
          {validResult.runs[0].nodes.map(node => <tr key={node.id}><th scope="row">{node.name}<small>read / write work per sec<br />rejected requests per sec</small></th>{validResult.runs.map(run => { const load = run.nodes.find(n => n.id === node.id); return <td key={run.key}>{load.observed ? <>{number(load.reads)} / {number(load.writes)}<small>{number(load.rejected)} rejected</small></> : 'No recorded work'}</td>; })}</tr>)}
        </tbody>
      </table></div>
      <p>Database write work includes the chosen allocation strategy. Memory-cache writes are optional fills; edge-cache write work includes forwarded creations and fills. API allocation compute also affects capacity; these counts are not a count of CPU instructions.</p>
      <h3>Try explaining the difference</h3>
      <p>Compare the first two columns to isolate repeated versus scattered reads. Compare the last two to isolate creating versus opening links. If you have no cache, changing repetition alone will not change work in this model. A read cache cannot remove the durable writes in the third column.</p>
      <p>Change one component or configuration on the board, then reopen this experiment with the same rate. These are model estimates, not production benchmarks or new challenges. Your previous traffic recording stays available.</p>
    </section>}
  </div>;
}
