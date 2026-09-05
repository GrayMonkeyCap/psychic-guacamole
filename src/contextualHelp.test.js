import { describe, expect, it } from 'vitest';
import { CHAPTERS, EMPTY_DESIGN, runChapter } from './levelModel.js';
import { contextualHelp } from './contextualHelp.js';
const d = (strategy = 'sequence') => ({ nodes: [...EMPTY_DESIGN.nodes, { id: 'api', type: 'api', tier: 0, strategy, x: 37, y: 43 }, { id: 'db', type: 'database', tier: 0, x: 69, y: 43 }], edges: [{ id: 'a', from: 'internet', to: 'api' }, { id: 'b', from: 'api', to: 'db' }] });
describe('contextual help without mandatory recipes', () => {
  it('does not ask a valid random/sequence design to add an ID service', () => {
    for (const strategy of ['random', 'sequence']) {
      const help = contextualHelp(d(strategy), CHAPTERS[0]);
      expect(help.key).toBe('ready:0');
      expect(help.experiment).not.toContain('connect its allocator');
    }
  });
  it('offers alternate allocation strategies only when a selected service is missing', () => {
    const help = contextualHelp(d('service'), CHAPTERS[0]);
    expect(help.experiment).toContain('database sequence / random');
    expect(help.node).toBe('api');
  });
  it('grounds rejection help in the actual worst sample and node, not the chapter name', () => {
    const design = d(), result = runChapter(design, CHAPTERS[1]), frame = result.frames[result.worstIndex];
    const help = contextualHelp(design, CHAPTERS[1], result, frame);
    expect(help.node).toBe(result.bottleneck);
    expect(help.evidence).toContain(`${frame.time.toFixed(1)}s`);
    expect(help.evidence).toContain('did not call downstream');
    expect(help.experiment).toContain('balanced replicas');
  });
  it('explains the budget before suggesting traffic fixes', () => {
    const design = d(); design.nodes.push(...Array.from({ length: 7 }, (_, i) => ({ id: `extra${i}`, type: 'database', tier: 0, x: 10, y: 10 })));
    expect(contextualHelp(design, CHAPTERS[0]).key).toBe('budget');
  });
  it('does not call a passing run mastery or require more components', () => {
    const design = d(), result = runChapter(design, CHAPTERS[0]);
    const help = contextualHelp(design, CHAPTERS[0], result, result.frames.at(-1));
    expect(help.key).toBe('passed:0');
    expect(help.evidence).toContain('does not establish production readiness');
    expect(help.experiment).toContain('cheaper design');
  });
});
