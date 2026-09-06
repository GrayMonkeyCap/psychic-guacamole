// Isolated browser context; never reads or changes the player's saved board.
// Usage: node scripts/verify-outcomes.mjs <directory containing playwright>
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
import { SAVE_KEY, SAVE_VERSION } from '../src/levelModel.js';
const require = createRequire(path.join(process.argv[2], 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/');
  const design = { nodes: [{ id: 'internet', type: 'internet', tier: 0, x: 7, y: 43 },
    { id: 'api', type: 'api', tier: 1, strategy: 'random', x: 37, y: 43 },
    { id: 'db', type: 'database', tier: 1, x: 69, y: 43 }, { id: 'cache', type: 'cache', tier: 0, x: 69, y: 12 }],
  edges: [{ id: '1', from: 'internet', to: 'api' }, { id: '2', from: 'api', to: 'db' }, { id: '3', from: 'api', to: 'cache' }] };
  await page.evaluate(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), { key: SAVE_KEY, save: { version: SAVE_VERSION, design, chapter: 1, unlocked: 2, history: [], certificates: [], guided: false } });
  await page.goto('http://127.0.0.1:5173/#system-lab');
  await page.getByRole('button', { name: 'Send traffic', exact: true }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Pause traffic' }).click();
  const picker = page.getByRole('region', { name: 'Recorded traffic outcomes' });
  await picker.getByLabel('Show outcomes').selectOption('completed');
  await picker.getByRole('button').filter({ hasText: 'After a cache miss' }).first().click();
  await page.getByRole('heading', { name: 'Recorded redirects' }).waitFor();
  await page.getByRole('button', { name: /Cache miss returns to API/ }).click();
  assert.ok((await page.locator('.l1-trace-detail').innerText()).includes('cache does not call the database'));
  await page.getByRole('button', { name: /Read the saved mapping/ }).click();
  assert.ok((await page.locator('.l1-trace-detail').innerText()).includes('API server calls storage directly'));
  await page.getByRole('button', { name: 'Resume traffic' }).click();
  assert.equal(await page.getByRole('heading', { name: 'Recorded redirects' }).count(), 0);
  await page.getByText('CHALLENGE PASSED', { exact: true }).waitFor({ timeout: 22000 });
  await picker.getByRole('button').filter({ hasText: 'Hit in Memory cache' }).first().click();
  assert.equal(await page.getByRole('button', { name: /Read the saved mapping/ }).count(), 0);
  await page.getByRole('slider', { name: 'Scrub traffic test' }).fill('0');
  assert.equal(await page.getByRole('heading', { name: 'Recorded redirects' }).count(), 0);
  assert.ok((await picker.innerText()).includes('0.2s'));
  // A real behavioral edit discards the recording; no stale path survives it.
  await page.getByRole('button', { name: 'Inspect API server', exact: true }).click();
  await page.locator('.l1-tiers').getByRole('button', { name: /Small/ }).click();
  await page.getByRole('button', { name: 'Apply Small tier', exact: true }).click();
  assert.equal(await picker.count(), 0);
  await page.getByRole('button', { name: 'Send traffic', exact: true }).click();
  await page.getByText('A USEFUL FAILURE', { exact: true }).waitFor({ timeout: 22000 });
  await page.getByRole('button', { name: 'Inspect bottleneck' }).click();
  await picker.getByLabel('Show outcomes').selectOption('rejected');
  await picker.getByRole('button').filter({ hasText: 'Stopped at API server' }).first().click();
  assert.equal(await page.getByRole('button', { name: /Persist the new mapping|Read the saved mapping/ }).count(), 0);
  await page.getByRole('button', { name: /Request rejected · no successful result/ }).click();
  assert.ok((await page.locator('.l1-trace-detail').innerText()).includes('No successful mapping or redirect is claimed'));
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('Outcome browser QA passed: pause, filters, recorded miss/hit, reply semantics, resume, scrub, edit invalidation, actual rejection, mobile overflow; no page errors.');
} finally { await browser.close(); }
