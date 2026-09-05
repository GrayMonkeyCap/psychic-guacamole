import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CampaignHome from './CampaignHome';
import FirstLevel from './FirstLevel';
import { CHAPTERS, EMPTY_DESIGN, SAVE_VERSION, recordCertificate, runChapter } from './levelModel';

const design = { nodes: [...EMPTY_DESIGN.nodes,
  { id: 'api', type: 'api', tier: 2, strategy: 'sequence', x: 37, y: 43 },
  { id: 'db', type: 'database', tier: 2, x: 69, y: 43 }],
edges: [{ id: '1', from: 'internet', to: 'api' }, { id: '2', from: 'api', to: 'db' }] };
const summaries = CHAPTERS.map(c => { const { frames, ...r } = runChapter(design, c); return r; });
const certificateSet = summaries.reduce(recordCertificate, []);
const save = patch => ({ version: SAVE_VERSION, design, history: [], certificates: certificateSet, chapter: 2, unlocked: 2, ...patch });
const render = (value, level = false) => {
  vi.stubGlobal('localStorage', { getItem: () => value == null ? null : JSON.stringify(value) });
  return renderToStaticMarkup(level ? <FirstLevel onExit={() => {}} onLevelResult={() => {}} /> : <CampaignHome onOpenLevel={() => {}} onOpenTutorial={() => {}} />);
};
afterEach(() => vi.unstubAllGlobals());

describe('landing and level consume the same durable progress', () => {
  it('shows a completed contract even with an empty recent history', () => {
    expect(render(save())).toContain('CONTRACT COMPLETE');
    expect(render(save())).toContain('3 / 3 challenges passed');
    expect(render(save(), true).match(/aria-label="[^"]+ · Passed for this design"/g)).toHaveLength(3);
  });
  it('does not show completion for changed behavior or mismatched model versions', () => {
    const edited = { ...design, nodes: design.nodes.map(n => n.id === 'api' ? { ...n, tier: 0 } : n) };
    expect(render(save({ design: edited }))).not.toContain('CONTRACT COMPLETE');
    const old = certificateSet.map(c => ({ ...c, modelVersion: 'old-model' }));
    expect(render(save({ certificates: old }))).not.toContain('CONTRACT COMPLETE');
    expect(render(save({ certificates: old }))).toContain('Earlier-rule passes are saved');
    expect(render(save({ certificates: old }), true)).toContain('Earlier-rule passes are kept');
  });
  it('shows the same completion after migration from original p99-shaped v2 records', () => {
    const history = summaries.map(({ estimatedLatencyMs, modelVersion, scenarioVersion, ...r }) => ({ ...r, p99: estimatedLatencyMs }));
    expect(render(save({ version: 2, certificates: undefined, history }))).toContain('CONTRACT COMPLETE');
  });
  it('explains the metric name and per-sample success without presenting measured p99', () => {
    const markup = render(save(), true);
    expect(markup).toContain('EST. LATENCY');
    expect(markup).toContain('Success / sample');
    expect(markup).toContain('How tests are measured');
    expect(markup).not.toMatch(/p99/i);
  });
  it('keeps the first-time experience available without a save', () => {
    expect(render(null)).toContain('Play your first level');
    expect(render(null, true)).toContain('Let’s build a link');
  });
});
