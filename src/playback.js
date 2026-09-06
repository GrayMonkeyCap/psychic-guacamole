import { CHAPTERS, tick, report } from './levelModel.js';
export const SAMPLES_PER_SECOND = 5;
export const PLAYBACK_RATES = [1, 2, 4];
export const playbackDelay = rate => 200 / (PLAYBACK_RATES.includes(rate) ? rate : 1);
export function createPlaybackRun(design, chapter, suite = false) {
  if (!Number.isInteger(chapter) || !CHAPTERS[chapter]) throw new Error('Unsupported traffic challenge.');
  return { design, chapter, suite, step: 0, frames: [] };
}
// One fixed model sample. Wall-clock delay and particle animation never enter it.
export function advancePlaybackRun(run) {
  if (!run) return null;
  const chapter = CHAPTERS[run.chapter], step = run.step + 1;
  const frame = tick(run.design, chapter, step / SAMPLES_PER_SECOND, run.frames.at(-1), 1 / SAMPLES_PER_SECOND);
  const frames = [...run.frames, frame];
  const completed = step >= chapter.duration * SAMPLES_PER_SECOND ? report(run.design, chapter, frames) : null;
  const next = completed ? run.suite && completed.passed && run.chapter < CHAPTERS.length - 1 ? createPlaybackRun(run.design, run.chapter + 1, true) : null : { ...run, step, frames };
  return { next, completed, chapter: next?.chapter ?? run.chapter, frames: next?.frames ?? frames, report: next ? null : completed, suite: run.suite };
}
