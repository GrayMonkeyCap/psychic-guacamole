import { describe, expect, it } from 'vitest';
import { CHAPTERS, EMPTY_DESIGN, runChapter } from './levelModel.js';
import { advancePlaybackRun, createPlaybackRun, playbackDelay } from './playback.js';
const design = { nodes: [...EMPTY_DESIGN.nodes,
  { id: 'api', type: 'api', tier: 1, strategy: 'random', x: 37, y: 43 }, { id: 'db', type: 'database', tier: 1, x: 69, y: 43 }, { id: 'cache', type: 'cache', tier: 0, x: 69, y: 12 }],
edges: [{ id: 'a', from: 'internet', to: 'api' }, { id: 'b', from: 'api', to: 'db' }, { id: 'c', from: 'api', to: 'cache' }] };
describe('fixed-sample playback controller', () => {
  it('produces exactly the canonical run, including every frame and certificate field', () => {
    for (const chapter of CHAPTERS) {
      let run = createPlaybackRun(design, chapter.id), event, steps = 0;
      while (run) { event = advancePlaybackRun(run); run = event.next; steps++; }
      expect(steps).toBe(chapter.duration * 5);
      expect(event.report).toEqual(runChapter(design, chapter));
      expect(event.frames).toHaveLength(steps);
    }
  });
  it('steps immutably, preserving a previously inspected sample', () => {
    const initial = createPlaybackRun(design, 0), first = advancePlaybackRun(initial), saved = JSON.stringify(first);
    const second = advancePlaybackRun(first.next);
    expect(initial.frames).toEqual([]);
    expect(second.frames.map(f => f.time)).toEqual([.2, .4]);
    expect(JSON.stringify(first)).toBe(saved);
    expect(second.completed).toBeNull();
  });
  it('starts each suite challenge cold and emits each completion once', () => {
    let run = createPlaybackRun(design, 0, true), completed = [], boundaries = [];
    while (run) {
      const event = advancePlaybackRun(run);
      if (event.completed) {
        completed.push(event.completed);
        if (event.next) {
          expect(event.frames).toEqual([]);
          expect(event.next.step).toBe(0);
          boundaries.push(advancePlaybackRun(event.next).frames[0]);
        }
      }
      run = event.next;
    }
    expect(completed).toEqual(CHAPTERS.map(chapter => runChapter(design, chapter)));
    expect(boundaries).toEqual(CHAPTERS.slice(1).map(chapter => runChapter(design, chapter).frames[0]));
    expect(advancePlaybackRun(null)).toBeNull();
  });
  it('stops a suite at failure and does not invent later passes', () => {
    let run = createPlaybackRun(EMPTY_DESIGN, 0, true), event;
    while (run) { event = advancePlaybackRun(run); run = event.next; }
    expect(event.report.passed).toBe(false);
    expect(event.chapter).toBe(0);
    expect(event.report).toEqual(runChapter(EMPTY_DESIGN, CHAPTERS[0]));
  });
  it('changes only wall-clock delays and guards unsupported selections', () => {
    expect([1, 2, 4].map(playbackDelay)).toEqual([200, 100, 50]);
    for (const speed of [0, -1, NaN, Infinity, 100]) expect(playbackDelay(speed)).toBe(200);
    expect(() => createPlaybackRun(design, -1)).toThrow('Unsupported');
    expect(() => createPlaybackRun(design, 0.5)).toThrow('Unsupported');
  });
});
