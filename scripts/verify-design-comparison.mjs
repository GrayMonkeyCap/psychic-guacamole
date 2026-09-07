import { TEST_URL } from './verification-config.mjs';
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { EMPTY_DESIGN, SAVE_KEY, SAVE_VERSION } from '../src/levelModel.js';
import { compareDesigns } from '../src/designComparison.js';
const require = createRequire(path.join(process.argv[2], 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', locale: 'en-US' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const direct = { nodes: [...EMPTY_DESIGN.nodes, { id: 'api', type: 'api', tier: 1, strategy: 'random', x: 37, y: 43 }, { id: 'db', type: 'database', tier: 1, x: 69, y: 43 }], edges: [{ id: 'a', from: 'internet', to: 'api' }, { id: 'b', from: 'api', to: 'db' }] };
  const cached = { nodes: [...direct.nodes, { id: 'cache', type: 'cache', tier: 0, x: 69, y: 12 }], edges: [...direct.edges, { id: 'c', from: 'api', to: 'cache' }] };
  const snapshots = [{ id: 'direct', name: 'Direct idea', design: direct }, { id: 'cached', name: 'Cached idea', design: cached }, { id: 'draft', name: 'Unfinished idea', design: EMPTY_DESIGN }];
  await page.goto(`${TEST_URL}/`);
  await page.evaluate(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), { key: SAVE_KEY, save: { version: SAVE_VERSION, design: cached, snapshots, chapter: 1, unlocked: 2, guided: false, history: [], certificates: [] } });
  await page.goto(`${TEST_URL}/#system-lab`);
  await page.getByLabel('Playback speed').selectOption('4');
  await page.getByRole('button', { name: 'Send traffic', exact: true }).click();
  await page.getByText('CHALLENGE PASSED', { exact: true }).waitFor();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).history.length === 1, SAVE_KEY);
  const raw = () => page.evaluate(key => localStorage.getItem(key), SAVE_KEY);
  const before = await raw();
  const recordedFrames = await page.getByRole('slider', { name: 'Scrub traffic test' }).getAttribute('max');
  await page.getByRole('button', { name: /^Design shelf ·/ }).click();
  await page.getByRole('button', { name: 'Compare designs', exact: true }).click();
  assert.ok(await page.getByLabel('Design A', { exact: true }).evaluate(el => el === document.activeElement));
  await page.getByLabel('Design A', { exact: true }).selectOption('snapshot:direct');
  await page.getByLabel('Design B', { exact: true }).selectOption('snapshot:cached');
  await page.getByRole('button', { name: 'Run fair comparison', exact: true }).click();
  const results = page.getByRole('region', { name: 'Design comparison results' });
  await results.waitFor();
  assert.ok(await results.getByRole('heading', { name: 'Fresh results, same conditions.' }).evaluate(el => el === document.activeElement));
  const expected = compareDesigns(snapshots[0], snapshots[1]);
  assert.equal(await results.locator('[data-comparison-chapter]').count(), 3);
  for (const chapter of expected.chapters) {
    const section = results.locator(`[data-comparison-chapter="${chapter.id}"]`);
    const reject = section.getByRole('row', { name: /Rejected \/ sample/ }).getByRole('cell');
    const latency = section.getByRole('row', { name: /Est. latency/ }).getByRole('cell');
    for (let side = 0; side < 2; side++) {
      assert.equal(await reject.nth(side).innerText(), chapter.results[side].maxError.toLocaleString('en-US', { maximumFractionDigits: 3 }));
      assert.equal(await latency.nth(side).innerText(), String(chapter.results[side].estimatedLatencyMs));
    }
  }
  const cost = results.getByRole('row', { name: /Monthly cost/ }).getByRole('cell');
  assert.deepEqual(await cost.allInnerTexts(), ['445', '540', '+95']);
  await results.getByText('What changed? · 2 recorded changes', { exact: true }).click();
  assert.ok((await results.innerText()).includes('Added Memory cache'));
  assert.ok((await results.innerText()).includes('Added call: API server → Memory cache'));
  assert.equal(await raw(), before, 'Comparison must not save its fresh reports as certificates or replace the working design.');
  await page.getByLabel('Design A', { exact: true }).selectOption('working');
  assert.equal(await results.count(), 0, 'Selecting another design must clear stale results.');
  await page.getByRole('button', { name: 'Run fair comparison', exact: true }).click();
  for (const row of await results.getByRole('row').all()) {
    const cells = row.getByRole('cell');
    if (await cells.count()) assert.match(await cells.last().innerText(), /^0(?: pp)?$/);
  }
  await page.getByLabel('Design B', { exact: true }).selectOption('snapshot:draft');
  await page.getByRole('button', { name: 'Run fair comparison', exact: true }).click();
  await results.getByRole('heading', { name: 'Fix the setup before comparing traffic.' }).waitFor();
  assert.equal(await results.locator('[data-comparison-chapter]').count(), 0);
  await page.getByLabel('Design A', { exact: true }).selectOption('snapshot:direct');
  await page.getByLabel('Design B', { exact: true }).selectOption('snapshot:cached');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'QuotaExceededError'); }; });
  await page.getByRole('button', { name: 'Run fair comparison', exact: true }).click();
  assert.equal(await results.locator('[data-comparison-chapter]').count(), 3, 'Read-only comparisons do not require storage writes.');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.ok(await results.evaluate(element => [...element.querySelectorAll('table')].every(table => table.scrollWidth <= table.clientWidth + 1)));
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  if (process.argv[3]) { await mkdir(process.argv[3], { recursive: true }); await page.getByRole('dialog').evaluate(el => { el.scrollTop = 0; }); await page.screenshot({ path: path.join(process.argv[3], 'design-comparison.png'), fullPage: true }); }
  await page.getByRole('button', { name: 'Back to design shelf', exact: true }).click();
  assert.ok(await page.getByRole('button', { name: 'Compare designs', exact: true }).evaluate(el => el === document.activeElement));
  await page.getByRole('button', { name: 'Close design shelf' }).click();
  assert.equal(await raw(), before);
  assert.equal(await page.getByRole('slider', { name: 'Scrub traffic test' }).getAttribute('max'), recordedFrames);
  assert.deepEqual(errors, []);
  console.log('Design comparison QA passed: fresh cold results, exact metrics/deltas, configuration differences, equal-design control, invalid setup, stale-result clearing, focus, compact tables and unchanged saved/recorded state.');
} finally { await browser.close(); }
