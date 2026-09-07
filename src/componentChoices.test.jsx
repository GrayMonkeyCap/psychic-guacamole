import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CATALOG, CHAPTERS, EMPTY_DESIGN, runChapter } from './levelModel.js';
import { componentChoice } from './componentChoices.js';
import { LEARNING_RESOURCES } from './learningResources.js';
import ComponentAdvice from './ComponentAdvice.jsx';
import LearningResources from './LearningResources.jsx';

const design = { nodes: [...EMPTY_DESIGN.nodes, { id: 'api', type: 'api', tier: 0, strategy: 'random' }, { id: 'db', type: 'database', tier: 0 }], edges: [{ id: 'a', from: 'internet', to: 'api' }, { id: 'b', from: 'api', to: 'db' }] };
describe('player-feedback component choices', () => {
  it('explains every choice before placement without mutating the board', () => {
    const before = JSON.stringify(EMPTY_DESIGN);
    for (const type of Object.keys(CATALOG)) {
      const advice = componentChoice({ design: EMPTY_DESIGN, type });
      for (const value of Object.values(advice)) expect(value.length).toBeGreaterThan(15);
      expect(advice.evidence).toContain('Forecast only');
      expect(renderToStaticMarkup(<ComponentAdvice design={EMPTY_DESIGN} type={type} />)).toContain('Why consider it now?');
    }
    expect(JSON.stringify(EMPTY_DESIGN)).toBe(before);
  });
  it('reacts to existing components and allocation strategy, not a required recipe', () => {
    expect(componentChoice({ design: EMPTY_DESIGN, type: 'api' }).reason).toContain('no API yet');
    expect(componentChoice({ design, type: 'database' }).reason).toContain('already have storage');
    expect(componentChoice({ design, type: 'loadBalancer' }).reason).toContain('1 API replica');
    expect(componentChoice({ design, type: 'idGenerator' }).reason).toContain('both work without');
    const service = { ...design, nodes: design.nodes.map(n => n.type === 'api' ? { ...n, strategy: 'service' } : n) };
    expect(componentChoice({ design: service, type: 'idGenerator' }).reason).toContain('1 API uses');
  });
  it('does not claim caches solve creations or bypass cold origin work', () => {
    expect(componentChoice({ design, type: 'cache', chapter: CHAPTERS[1] }).reason).toContain('98%');
    expect(componentChoice({ design, type: 'cache', chapter: CHAPTERS[2] }).reason).toContain('cannot save these writes');
    expect(componentChoice({ design, type: 'cdn', chapter: CHAPTERS[2] }).reason).toContain('still need the origin');
  });
  it('uses the selected recorded sample, and clears evidence when there is none', () => {
    const frame = runChapter(design, CHAPTERS[1]).frames.at(-1);
    const node = design.nodes[1];
    const advice = componentChoice({ design, type: 'api', node, frame });
    expect(advice.evidence).toContain(`Recorded sample ${frame.time.toFixed(1)}s`);
    expect(advice.evidence).not.toMatch(/NaN|undefined/);
    expect(componentChoice({ design, type: 'cache', frame }).evidence).toContain('No work recorded');
    expect(componentChoice({ design, type: 'api', node }).evidence).toContain('Forecast only');
  });
  it('links only to official HTTPS documentation with safe explicit new-tab navigation', () => {
    for (const type of Object.keys(CATALOG)) {
      expect(LEARNING_RESOURCES[type]).toHaveLength(2);
      for (const [, , href] of LEARNING_RESOURCES[type]) {
        const url = new URL(href);
        expect(url.protocol).toBe('https:');
        expect(['docs.aws.amazon.com', 'docs.cloud.google.com', 'www.postgresql.org']).toContain(url.hostname);
      }
      const markup = renderToStaticMarkup(<LearningResources type={type} />);
      expect(markup).toContain('rel="noopener noreferrer"');
      expect(markup).toContain('target="_blank"');
      expect(markup).toContain('not AWS/GCP quotes');
      expect(markup).not.toMatch(/iframe|<script/);
    }
  });
});
