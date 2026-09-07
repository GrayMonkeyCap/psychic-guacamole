import { useState } from 'react';
import { costOf, passedChapters } from './levelModel.js';
import { encodeBackup, MAX_BACKUP_BYTES, parseBackup } from './saveBackups.js';
export default function SaveBackups({ save, recovery, onRestore, restoreDisabled = false }) {
  const [pending, setPending] = useState(null), [message, setMessage] = useState('');
  const [restoring, setRestoring] = useState(false);
  async function restore() {
    setRestoring(true);
    try {
      const result = await onRestore(pending);
      if (result?.error) setMessage(result.error);
      else { setPending(null); setMessage('Backup restored. Your previous board is available as the recovery copy.'); }
    } catch { setMessage('Restore could not finish. Keep this tab open and download a backup.'); }
    finally { setRestoring(false); }
  }
  function download(value = save, recoveryCopy = false) {
    try {
      const url = URL.createObjectURL(new Blob([encodeBackup(value)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = recoveryCopy ? 'system-sandbox-level-1-recovery.json' : 'system-sandbox-level-1.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Backup download started. It includes your board, design shelf and earned passes, not experiment URLs or traffic recordings.');
    } catch (error) { setMessage(error.message); }
  }
  async function pickFile(e) {
    const file = e.target.files?.[0]; e.target.value = ''; setPending(null);
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) { setMessage('Backup is too large. The limit is 1 MiB.'); return; }
    try {
      const result = parseBackup(await file.text());
      if (result.error) setMessage(result.error);
      else { setPending(result.save); setMessage('Review this backup before replacing anything.'); }
    } catch { setMessage('The file could not be read. Nothing changed.'); }
  }
  return <section className="l1-backups" aria-label="Portable saves">
    <p>Download a copy of your board, design shelf and earned passes. Files stay on your device; no account or upload is involved.</p>
    <button className="l1-primary" onClick={() => download()}>Download current save</button>
    <label>Choose a Level 1 backup<input type="file" disabled={restoring} accept=".json,application/json" onChange={pickFile} /></label>
    {recovery && <button className="l1-secondary" disabled={restoring} onClick={() => { setPending(recovery); setMessage('Review the last saved recovery checkpoint.'); }}>Review recovery copy</button>}
    {recovery && <button className="l1-text-button" onClick={() => download(recovery, true)}>Download recovery copy</button>}
    <p role="status">{message}</p>
    {pending && <div className="l1-backup-preview"><h3>Backup preview</h3><p>{pending.design.nodes.length - 1} components · {pending.design.edges.length} connections · ${costOf(pending.design.nodes)}/month</p><p>{passedChapters(pending.certificates, pending.design).filter(Boolean).length} / 3 challenges passed under current rules. Older certificates remain recorded.</p><p>Design shelf: {pending.snapshots?.length || 0} snapshots{pending.snapshots?.length ? ` · ${pending.snapshots.map(snapshot => snapshot.name).join(' · ')}` : ' · empty'}.</p><p>Restoring replaces this board and its design shelf, and clears the current recording and unsaved link experiment. A recovery copy of the current board and shelf is kept first. Download it above if you also want a separate file.</p><button className="l1-primary" disabled={restoreDisabled || restoring} onClick={restore}>{restoring ? 'Saving safely…' : 'Restore this backup'}</button><button className="l1-text-button" disabled={restoring} onClick={() => { setPending(null); setMessage('Restore cancelled. Your board is unchanged.'); }}>Keep current board</button></div>}
  </section>;
}
