// Inspection and layout are not new traffic; an unfinished capture never earns a pass.
export function playbackMode(sim) {
  if (sim.running) return sim.paused
    ? { id: 'paused', label: 'TRAFFIC PAUSED', hint: 'Inspect or step. End the run before editing.' }
    : { id: 'running', label: 'LIVE TRAFFIC', hint: 'Design locked. Pause to inspect the evidence.' };
  if (sim.report) return { id: 'review', label: 'TEST RECORDING', hint: 'Inspect or edit. Behavior changes clear this recording.' };
  if (sim.frames.length) return { id: 'partial', label: 'PARTIAL RECORDING', hint: 'Not graded. Inspect or edit; behavior changes clear the recording.' };
  return { id: 'build', label: 'BUILD MODE', hint: 'Build freely. Send traffic to test your design.' };
}

export function stopPlayback(sim) {
  if (!sim.running) return sim;
  return { ...sim, running: false, paused: false, suite: false, report: null };
}
