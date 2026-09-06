import { describe, expect, it } from 'vitest';
import snapshot from '../docs/level-1-balance-audit.json';
import { auditCandidates, auditDesign, dominates, runBalanceAudit } from '../scripts/balance-audit.mjs';
import { CHAPTERS, costOf, runChapter, validate } from './levelModel.js';

describe('representative balance audit', () => {
  it('reproduces the published versioned grid and frontier', () => {
    expect(runBalanceAudit()).toEqual(snapshot);
  }, 30000);
  it('enumerates unique valid hardware/strategy options including asymmetric APIs', () => {
    const candidates = [...auditCandidates()];
    expect(new Set(candidates.map(c => JSON.stringify(c.options))).size).toBe(candidates.length);
    expect(candidates.every(c => validate(c.design).valid)).toBe(true);
    expect(candidates.some(c => c.options.api.join() === '0,2')).toBe(true);
    expect(candidates.every(c => c.options.strategy === 'service' ? c.options.allocator !== null : c.options.allocator === null)).toBe(true);
  });
  it('preserves distinct passing architectures and all allocation alternatives', () => {
    for (const example of [...snapshot.families, ...snapshot.strategies].map(group => group.cheapest)) {
      const design = auditDesign(example.options);
      expect(costOf(design.nodes)).toBe(example.cost);
      expect(CHAPTERS.every(chapter => runChapter(design, chapter).passed)).toBe(true);
    }
    expect(new Set(snapshot.frontier.map(c => c.family)).size).toBeGreaterThanOrEqual(3);
  });
  it('requires a strict improvement, retains equivalent points and rejects invalid metrics', () => {
    const candidate = (cost, maxError = 0, estimatedLatencyMs = 40) => ({ cost, results: [{ maxError, estimatedLatencyMs }] });
    expect(dominates(candidate(445), candidate(540))).toBe(true);
    expect(dominates(candidate(445), candidate(445))).toBe(false);
    expect(dominates(candidate(445, 1), candidate(540, 0))).toBe(false);
    expect(dominates(candidate(445), candidate(445 + 1e-10))).toBe(false);
    expect(() => dominates(candidate(445), candidate(500, 0, null))).toThrow('finite');
    expect(() => dominates(candidate(445), { cost: 500, results: [] })).toThrow('matching');
  });
});
