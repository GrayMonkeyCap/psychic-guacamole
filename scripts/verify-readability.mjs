import { TEST_URL } from './verification-config.mjs';
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { contrast } from './text-contrast.mjs';
import { EMPTY_DESIGN, SAVE_KEY, SAVE_VERSION } from '../src/levelModel.js';
const require = createRequire(path.join(process.argv[2], 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const selectors = ['.l1-metrics small', '.l1-metrics i', '.l1-metrics strong', '.l1-system-state small', '.l1-system-state strong', '.l1-node-head small', '.l1-node-readout small', '.l1-node-readout b', '.l1-tools small', '.l1-forecast span', '.l1-forecast > b', '.l1-contract > div', '.l1-rules', '.l1-rules b', '.l1-inspector-heading small', '.l1-save-note', '.l1-guide-button', '.l1-section-label', '.l1-strategy label', '.l1-strategy select', '.l1-node-telemetry span', '.l1-node-telemetry b', '.l1-trace-steps button', '.l1-trace-steps small', '.l1-result-title small', '.l1-result-title strong', '.l1-result-explanation > small', '.l1-result-actions > small'];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [], measurements = [];
  page.on('pageerror', e => errors.push(e.message));
  const design = { nodes: [...EMPTY_DESIGN.nodes, { id: 'api', type: 'api', tier: 0, strategy: 'sequence', x: 37, y: 43 }, { id: 'db', type: 'database', tier: 0, x: 69, y: 43 }], edges: [{ id: 'a', from: 'internet', to: 'api' }, { id: 'b', from: 'api', to: 'db' }] };
  await page.goto(`${TEST_URL}/`);
  await page.evaluate(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), { key: SAVE_KEY, save: { version: SAVE_VERSION, design, chapter: 0, unlocked: 2, guided: false, history: [], certificates: [], snapshots: [] } });
  await page.goto(`${TEST_URL}/#system-lab`);
  async function inspect(phase) {
    const values = await page.evaluate(selectors => selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(element => element.getClientRects().length && !element.closest('button:disabled')).map(element => {
      const style = getComputedStyle(element);
      let parent = element, background;
      while (parent) {
        const computed = getComputedStyle(parent);
        if (computed.opacity !== '1') throw new Error(`Opacity needs a separate audit: ${selector}`);
        if (computed.filter !== 'none' || computed.mixBlendMode !== 'normal') throw new Error(`Blending needs a separate audit: ${selector}`);
        if (!background) {
          if (computed.backgroundImage !== 'none') throw new Error(`Gradient needs a separate audit: ${selector}`);
          if (!['rgba(0, 0, 0, 0)', 'transparent'].includes(computed.backgroundColor)) background = computed.backgroundColor;
        }
        parent = parent.parentElement;
      }
      return { selector, text: element.innerText.slice(0, 100), color: style.color, background, fontSize: parseFloat(style.fontSize) };
    })), selectors);
    for (const value of values) measurements.push({ phase, ...value, ratio: contrast(value.color, value.background) });
  }
  await page.getByRole('button', { name: 'Inspect API server', exact: true }).click(); await inspect('building');
  await page.getByRole('button', { name: 'Follow one request', exact: true }).click(); await inspect('illustrative trace');
  await page.getByRole('button', { name: 'Close request trace' }).click();
  await page.getByLabel('Playback speed').selectOption('4');
  await page.getByRole('button', { name: 'Send traffic', exact: true }).click();
  await page.getByText('CHALLENGE PASSED', { exact: true }).waitFor(); await inspect('passed');
  await page.getByRole('button', { name: 'Next challenge', exact: true }).click();
  await page.getByRole('button', { name: 'Send traffic', exact: true }).click();
  await page.getByText('A USEFUL FAILURE', { exact: true }).waitFor(); await inspect('failed');
  await page.getByRole('button', { name: 'Inspect bottleneck', exact: true }).click();
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 }); await inspect(`${width}px`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.getByRole('button', { name: 'Try again', exact: true }).scrollIntoViewIfNeeded();
    assert.ok((await page.getByRole('button', { name: 'Try again', exact: true }).boundingBox()).y < 900);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  if (process.argv[3]) { await mkdir(process.argv[3], { recursive: true }); await page.screenshot({ path: path.join(process.argv[3], 'readability-failure.png'), fullPage: true }); }
  const failures = measurements.filter(value => value.ratio < 4.5 || value.fontSize < 10);
  console.log(JSON.stringify({ sampled: measurements.length, minimumRatio: Math.min(...measurements.map(value => value.ratio)), minimumFontPx: Math.min(...measurements.map(value => value.fontSize)), failures }, null, 2));
  assert.deepEqual(errors, []);
  assert.equal(failures.length, 0, 'Sampled essential text must have >=4.5:1 solid-background contrast and at least 10 CSS px. This is not a full accessibility audit.');
  console.log('Readability QA passed: sampled solid-surface HUD, components, inspector, trace and pass/fail labels; compact overflow and reachable controls. Gradients, canvas pixels, disabled controls and full conformance are outside this check.');
} finally { await browser.close(); }
