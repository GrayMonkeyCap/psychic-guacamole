import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
import { EMPTY_DESIGN, SAVE_KEY, SAVE_VERSION } from '../src/levelModel.js';
const require = createRequire(path.join(process.argv[2], 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/');
  const design = { nodes: [...EMPTY_DESIGN.nodes,
    { id: 'api', type: 'api', tier: 1, strategy: 'random', x: 37, y: 43 },
    { id: 'db', type: 'database', tier: 1, x: 69, y: 43 },
    { id: 'cache', type: 'cache', tier: 0, x: 69, y: 12 }],
  edges: [{ id: 'a', from: 'internet', to: 'api' }, { id: 'b', from: 'api', to: 'db' }, { id: 'c', from: 'api', to: 'cache' }] };
  await page.evaluate(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), { key: SAVE_KEY, save: { version: SAVE_VERSION, design, chapter: 0, unlocked: 0, guided: false, certificates: [], history: [] } });
  await page.goto('http://127.0.0.1:5173/#system-lab');
  await page.getByRole('button', { name: 'Send traffic', exact: true }).click();
  await page.getByRole('button', { name: 'Explain this pass', exact: true }).waitFor({ timeout: 20000 });
  const ledger = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).certificates, SAVE_KEY);
  assert.equal(ledger.length, 1);
  const open = () => page.getByRole('button', { name: 'Explain this pass', exact: true }).click();
  await open();
  const recap = page.getByRole('region', { name: 'Pass explanation' });
  assert.ok((await recap.innerText()).includes('not an assessment of your understanding'));
  assert.ok(await recap.getByRole('heading', { name: 'Your design, explained.' }).evaluate(el => el === document.activeElement));
  await recap.getByRole('button', { name: 'Close pass explanation' }).click();
  assert.ok(await page.getByRole('button', { name: 'Explain this pass', exact: true }).evaluate(el => el === document.activeElement));
  await open();
  await recap.getByRole('button', { name: 'Follow a recorded creation' }).click();
  const creation = page.getByRole('heading', { name: 'Recorded creations', exact: true });
  assert.ok(await creation.isVisible());
  assert.ok(await creation.evaluate(el => el === document.activeElement));
  assert.ok(await page.getByRole('button', { name: /Persist the new mapping/ }).isVisible());
  await open();
  await recap.getByRole('button', { name: 'Follow a recorded redirect' }).click();
  assert.ok(await page.getByRole('heading', { name: 'Recorded redirects', exact: true }).isVisible());
  assert.ok(await page.getByRole('button', { name: /Cache hit · origin skipped/ }).isVisible());
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).certificates, SAVE_KEY), ledger);
  await open();
  await page.getByRole('button', { name: 'Inspect API server', exact: true }).click();
  assert.equal(await recap.count(), 0);
  assert.ok(await page.getByRole('heading', { name: 'API server', exact: true }).isVisible());
  await open(); await page.setViewportSize({ width: 390, height: 844 });
  await recap.getByRole('button', { name: 'Follow a recorded creation' }).scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  assert.deepEqual(errors, []);
  console.log('Pass recap QA passed: real completed run, contextual explanation, optional recorded creation/hit traces, focus transfer, unchanged certificate, board selection and compact layout.');
} finally { await browser.close(); }
