import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHAPTERS, EMPTY_DESIGN, runChapter } from './levelModel.js';
import { completionRecap } from './completionRecap.js';
import CompletionRecap from './CompletionRecap.jsx';
const design = { nodes: [...EMPTY_DESIGN.nodes,
  { id: 'api', type: 'api', tier: 1, strategy: 'random', x: 37, y: 43 },
  { id: 'db', type: 'database', tier: 1, x: 69, y: 43 },
  { id: 'cache', type: 'cache', tier: 0, x: 69, y: 12 }],
edges: [{ id: 'a', from: 'internet', to: 'api' }, { id: 'b', from: 'api', to: 'db' }, { id: 'c', from: 'api', to: 'cache' }] };
describe('honest pass recap', () => {
  it('links to actual completed creation and cached redirect groups in each chapter', () => {
    for (const chapter of CHAPTERS) {
      const result = runChapter(design, chapter), recap = completionRecap(design, chapter, result);
      expect(recap.traces).toHaveLength(2);
      expect(recap.demonstrated).toContain(`${chapter.duration}-second`);
      expect(recap.choices.join(' ')).toContain('Random codes in the API');
      for (const ref of recap.traces) {
        const o = result.frames[ref.frameIndex].outcomes[ref.outcomeIndex];
        expect(o.blockedBy).toBeFalsy();
        expect(o.kind).toBe(ref.kind);
        if (ref.kind === 'write') expect(o.calls.at(-1).to).toBe('db');
        else expect(o.cacheDecisions.some(d => d.status === 'hit')).toBe(true);
      }
    }
  });
  it('does not infer cache benefits from an unused component on the board', () => {
    const direct = { ...design, edges: design.edges.slice(0, 2) };
    const recap = completionRecap(direct, CHAPTERS[0], runChapter(direct, CHAPTERS[0]));
    expect(recap.choices.join(' ')).toContain('No cache-served redirect');
    expect(recap.choices.join(' ')).not.toContain('completed from a cached copy');
  });
  it('represents all three allocation choices without declaring a mandatory ID service', () => {
    for (const strategy of ['sequence', 'random', 'service']) {
      const other = { nodes: [...design.nodes.map(n => n.type === 'api' ? { ...n, strategy } : n), { id: 'id', type: 'idGenerator', tier: 0, x: 10, y: 20 }], edges: [...design.edges, { id: 'd', from: 'api', to: 'id' }] };
      const recap = completionRecap(other, CHAPTERS[0], runChapter(other, CHAPTERS[0]));
      expect(recap.choices[0]).toContain(strategy === 'service' ? 'another paid dependency' : strategy === 'sequence' ? 'extra database work' : 'without a separate allocation service');
    }
  });
  it('rejects stale, mismatched and failed reports while allowing layout-only moves', () => {
    const result = runChapter(design, CHAPTERS[0]);
    expect(completionRecap(design, CHAPTERS[0], { ...result, passed: false })).toBeNull();
    expect(completionRecap(design, CHAPTERS[0], { ...result, modelVersion: 'old' })).toBeNull();
    expect(completionRecap(design, CHAPTERS[1], result)).toBeNull();
    expect(completionRecap({ ...design, edges: design.edges.slice(0, 2) }, CHAPTERS[0], result)).toBeNull();
    expect(completionRecap({ ...design, nodes: design.nodes.map(n => ({ ...n, x: 2 })) }, CHAPTERS[0], result)).not.toBeNull();
  });
  it('does not synthesize traces or cache benefits when supported evidence is missing', () => {
    const result = runChapter(design, CHAPTERS[0]);
    for (const frames of [[], result.frames.map(f => ({ ...f, evidenceVersion: 999 }))]) {
      const recap = completionRecap(design, CHAPTERS[0], { ...result, frames });
      expect(recap.traces).toEqual([]);
      expect(recap.choices.join(' ')).toContain('does not prove it served requests');
    }
  });
  it('distinguishes passing a workload from mastery, with optional recorded follow-ups', () => {
    const markup = renderToStaticMarkup(<CompletionRecap design={design} chapter={CHAPTERS[0]} result={runChapter(design, CHAPTERS[0])} onClose={() => {}} onFollow={() => {}} />);
    expect(markup).toContain('not an assessment of your understanding');
    expect(markup).toContain('Follow a recorded creation');
    expect(markup).toContain('Exploring them is optional');
    expect(markup).not.toContain('role="dialog"');
  });
});
