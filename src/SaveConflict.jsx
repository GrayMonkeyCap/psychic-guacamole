import { useState } from 'react';
export default function SaveConflict({ snapshot, currentSave, busy, onResolve }) {
  const [message, setMessage] = useState('');
  async function choose(useStored) {
    const result = await onResolve(useStored ? snapshot.save : currentSave, { ...snapshot, keepLocal: !useStored });
    setMessage(result?.error || 'Save choice applied.');
  }
  function downloadOriginal() {
    const url = URL.createObjectURL(new Blob([snapshot.raw], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'system-sandbox-protected-browser-save.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="l1-backup-preview" aria-label="Resolve save conflict">
    <h3>Two copies. Your choice.</h3>
    <p>Automatic saving is paused. Your open board has {currentSave.design.nodes.length - 1} components. {snapshot.save ? `The browser copy has ${snapshot.save.design.nodes.length - 1} components and ${snapshot.save.design.edges.length} connections.` : snapshot.raw === null ? 'The browser save was removed elsewhere.' : 'The browser copy is damaged or uses an unsupported version.'}</p>
    <p>Download your open board below before choosing. Replacing this board clears its recording and link experiment. The displaced valid board is kept as the recovery checkpoint; unsupported data is preserved separately before replacement.</p>
    {snapshot.raw !== null && <button className="l1-text-button" onClick={downloadOriginal}>Download browser copy</button>}
    {snapshot.save && <button className="l1-secondary" disabled={busy} onClick={() => choose(true)}>Replace this board with saved copy</button>}
    <button className="l1-secondary" disabled={busy} onClick={() => choose(false)}>Replace browser save with this board</button>
    <p role="status">{message}</p>
  </section>;
}
