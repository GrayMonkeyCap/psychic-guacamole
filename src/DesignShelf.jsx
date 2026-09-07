import { useEffect, useRef, useState } from 'react';
import { costOf, MAX_DESIGN_SNAPSHOTS, passedChapters } from './levelModel.js';
import { sameDesign } from './editorHistory.js';

export default function DesignShelf({ save, onAction, busy, unavailable, onBackups }) {
  const [name, setName] = useState(''), [pending, setPending] = useState(null), [message, setMessage] = useState('');
  const confirmation = useRef(null), nameInput = useRef(null);
  useEffect(() => { if (pending) confirmation.current?.focus(); }, [pending]);
  const snapshots = save.snapshots || [];
  const target = snapshots.find(snapshot => snapshot.id === pending?.id);
  async function act(action) {
    const result = await onAction(action);
    if (result?.error) setMessage(result.error);
    else {
      setPending(null);
      if (action.type === 'save') setName('');
      setMessage(action.type === 'save' ? 'Snapshot saved. Future edits change only your working board.' : action.type === 'remove' ? 'Snapshot removed. Your working board and earned passes are unchanged. The previous save is in the recovery copy.' : 'Working copy loaded. Your previous board is kept on the shelf. Run evidence starts fresh.');
      requestAnimationFrame(() => nameInput.current?.focus());
    }
  }
  return <section className="l1-design-shelf" aria-label="Named design snapshots">
    <p>Keep a working idea before changing it. Snapshots never change as you edit. Loading opens a working copy and keeps your current board on this shelf first.</p>
    <p>{snapshots.length} / {MAX_DESIGN_SNAPSHOTS} snapshots · device-local. Backups include the shelf. Traffic recordings and mapping-experiment URLs are not included.</p>
    {unavailable && <p role="alert">Resolve the save warning or restore safe storage before changing the shelf. You can still download your current save.</p>}
    <form onSubmit={event => { event.preventDefault(); act({ type: 'save', name }); }}>
      <label htmlFor="snapshot-name">Name this design<input ref={nameInput} id="snapshot-name" value={name} maxLength={48} onChange={event => setName(event.target.value)} disabled={busy} placeholder="For example: my first working link" /></label>
      <button className="l1-primary" disabled={busy || unavailable || !name.trim() || snapshots.length >= MAX_DESIGN_SNAPSHOTS}>Save snapshot</button>
    </form>
    <p role="status">{busy ? 'Saving safely…' : message}</p>
    <ul>{snapshots.map(snapshot => <li key={snapshot.id}>
      <h3>{snapshot.name}</h3>
      <p>{snapshot.design.nodes.length - 1} components · {snapshot.design.edges.length} calls · ${costOf(snapshot.design.nodes)}/month</p>
      <p>{passedChapters(save.certificates, snapshot.design).filter(Boolean).length} / 3 challenges passed under current rules. {sameDesign(save.design, snapshot.design) ? 'Matches your working board.' : 'Saved design; edits here do not change it.'}</p>
      <div className="l1-shelf-actions"><button className="l1-secondary" aria-label={`Review loading ${snapshot.name}`} disabled={busy || unavailable || sameDesign(save.design, snapshot.design)} onClick={() => { setPending({ type: 'load', id: snapshot.id }); setMessage(''); }}>Load a copy</button><button className="l1-text-button" aria-label={`Review removing ${snapshot.name}`} disabled={busy || unavailable} onClick={() => { setPending({ type: 'remove', id: snapshot.id }); setMessage(''); }}>Remove</button></div>
    </li>)}</ul>
    {target && <section className="l1-backup-preview" aria-label="Snapshot confirmation">
      <h3 ref={confirmation} tabIndex={-1}>{pending.type === 'load' ? 'Load a working copy of' : 'Remove snapshot'} “{target.name}”?</h3>
      <p>{pending.type === 'load' ? 'Your current board is kept on the shelf first unless an identical snapshot already exists. The editable board changes; the recording, undo history and session mapping experiment reset. Certificates stay yours. If there is no room, loading is blocked without replacing anything.' : 'This removes only the named snapshot, not your working board or earned passes. The previous save is kept in the recovery slot, which later saves can replace. Download a backup for longer-term recovery.'}</p>
      <button className="l1-primary" disabled={busy || unavailable} onClick={() => act(pending)}>{pending.type === 'load' ? 'Keep current & load copy' : 'Remove this snapshot'}</button>
      <button className="l1-text-button" disabled={busy} onClick={() => { setPending(null); setMessage('Cancelled. Nothing changed.'); }}>Cancel snapshot action</button>
    </section>}
    <button className="l1-guide-button" disabled={busy} onClick={onBackups}>Backups & recovery</button>
  </section>;
}
