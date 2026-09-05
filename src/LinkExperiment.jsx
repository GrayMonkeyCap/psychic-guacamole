import { useState } from 'react';
import { STRATEGIES } from './levelModel.js';
import { componentLabel } from './trafficEvidence.js';
import { clearExperimentCaches, createExperimentLink, createLinkExperiment, experimentContext, openExperimentLink } from './linkExperiment.js';

export default function LinkExperiment({ design, state, onChange }) {
  const [apiId, setApiId] = useState(''), [url, setUrl] = useState('https://bakery.example/menu');
  const [code, setCode] = useState(''), [collision, setCollision] = useState(false), [result, setResult] = useState(null), [confirmReset, setConfirmReset] = useState(false);
  const context = experimentContext(design, apiId);
  const records = state.records.filter(r => r.database === context.database?.id);
  const apply = response => { onChange(response.state); setResult(response.result); if (response.result.ok) setCode(response.result.code); };
  return <section className="l1-link-experiment" aria-label="Create and open a link experiment">
    <p>Create a mapping, then see where it is read from. This is a small behavior experiment—not the traffic test. Destinations are shown here, never fetched or opened.</p>
    <p className="l1-experiment-boundary">We call the chosen API directly, bypassing the edge and load balancer. The table represents durable storage inside this experiment; it survives clearing cache, but resets when you leave or reload the level.</p>
    {context.error ? <p role="status">{context.error} Close this panel to finish your architecture first.</p> : <>
      <label>API handling this experiment<select value={context.api.id} onChange={e => { setApiId(e.target.value); setResult(null); }}>{context.apis.map(api => <option key={api.id} value={api.id}>{componentLabel(design, api.id)}</option>)}</select></label>
      <p>Code strategy: <strong>{STRATEGIES[context.api.strategy || 'sequence'].name}</strong>. Change it in the component inspector; no dedicated ID service is required for the other strategies.</p>
      <form onSubmit={e => { e.preventDefault(); apply(createExperimentLink(state, design, url, { apiId: context.api.id, forceCollision: collision })); }}>
        <label>Destination URL<input type="url" maxLength={2048} required value={url} onChange={e => setUrl(e.target.value)} /></label>
        {context.api.strategy === 'random' && <label className="l1-experiment-check"><input type="checkbox" checked={collision} disabled={!records.length} onChange={e => setCollision(e.target.checked)} /> Force one collision with an existing code (toy experiment)</label>}
        <button className="l1-primary" type="submit">Create short link</button>
      </form>
      <form onSubmit={e => { e.preventDefault(); apply(openExperimentLink(state, design, code.trim(), { apiId: context.api.id })); }}>
        <label>Short code to open<input required maxLength={64} value={code} onChange={e => setCode(e.target.value)} /></label>
        <button className="l1-secondary" type="submit">Open short link</button>
      </form>
      <button className="l1-secondary" disabled={!Object.keys(state.caches).length} onClick={() => { onChange(clearExperimentCaches(state)); setResult({ ok: true, message: 'Cached copies cleared. The database table is unchanged. Open the same code again.', events: [] }); }}>Clear cached copies</button>
      {!context.cache && <p>No memory cache is connected to this API. Opening a link reads storage directly.</p>}
      {result && <div className="l1-experiment-result" role="status"><strong>{result.message}</strong>{result.destination && <p>Destination: {result.destination}</p>}<ol>{result.events.map((e, index) => <li key={index}><strong>{e.title}</strong><small>{componentLabel(design, e.node)}</small><p>{e.detail}</p></li>)}</ol></div>}
      <h3>Simulated database table · {records.length} links</h3>
      {records.length ? <div className="l1-experiment-table"><table><thead><tr><th scope="col">Code</th><th scope="col">Destination</th></tr></thead><tbody>{records.map(r => <tr key={r.code}><td><button onClick={() => { setCode(r.code); apply(openExperimentLink(state, design, r.code, { apiId: context.api.id })); }}>{r.code}</button></td><td>{r.destination}</td></tr>)}</tbody></table></div> : <p>No mappings saved in this database yet.</p>}
    </>}
    {state.records.length > 0 && <div className="l1-experiment-reset">{confirmReset ? <><p>Remove only this experiment’s mappings and cache copies? Your architecture and earned passes stay unchanged.</p><button className="l1-danger-button" onClick={() => { onChange(createLinkExperiment()); setResult(null); setCode(''); setConfirmReset(false); }}>Reset experiment data</button><button className="l1-text-button" onClick={() => setConfirmReset(false)}>Keep my experiment</button></> : <button className="l1-text-button" onClick={() => setConfirmReset(true)}>Reset this experiment…</button>}</div>}
  </section>;
}
