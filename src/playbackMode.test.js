import { describe, expect, it } from 'vitest';
import { playbackMode, stopPlayback } from './playbackMode.js';

const idle = { running: false, paused: false, frames: [], report: null, suite: false };
describe('explicit play and review modes', () => {
  it('distinguishes fresh building, live, paused, complete review and partial review', () => {
    expect(playbackMode(idle).id).toBe('build');
    expect(playbackMode({ ...idle, running: true }).id).toBe('running');
    expect(playbackMode({ ...idle, running: true, paused: true }).id).toBe('paused');
    expect(playbackMode({ ...idle, frames: [{ time: .2 }] }).id).toBe('partial');
    expect(playbackMode({ ...idle, report: { passed: false } }).id).toBe('review');
    expect(playbackMode({ ...idle, report: { passed: true } }).id).toBe('review');
  });
  it('stops immutably without inventing a report or discarding captured evidence', () => {
    const live = { ...idle, running: true, paused: true, suite: true, frames: [{ time: .2 }] };
    const stopped = stopPlayback(live);
    expect(stopped.frames).toBe(live.frames);
    expect(stopped.report).toBeNull();
    expect(stopped.running || stopped.paused || stopped.suite).toBe(false);
    expect(live.running).toBe(true);
    expect(playbackMode(stopped).hint).toContain('Not graded');
    expect(stopPlayback(idle)).toBe(idle);
  });
  it('does not label a stopped-before-first-sample run as recorded or graded', () => {
    expect(playbackMode(stopPlayback({ ...idle, running: true })).id).toBe('build');
  });
});
