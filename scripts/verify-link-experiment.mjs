// Isolated behavior experiment QA: no navigation to entered destinations.
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
import { SAVE_KEY, SAVE_VERSION } from '../src/levelModel.js';
const require = createRequire(path.join(process.argv[2], 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [], destinationRequests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', request => { if (request.url().includes('bakery.example')) destinationRequests.push(request.url()); });
  await page.goto('http://127.0.0.1:5173/');
  const design = { nodes: [{ id: 'internet', type: 'internet', tier: 0, x: 7, y: 43 },
    { id: 'api', type: 'api', tier: 1, strategy: 'random', x: 37, y: 43 },
    { id: 'db', type: 'database', tier: 1, x: 69, y: 43 }, { id: 'cache', type: 'cache', tier: 0, x: 69, y: 12 }],
  edges: [{ id: '1', from: 'internet', to: 'api' }, { id: '2', from: 'api', to: 'db' }, { id: '3', from: 'api', to: 'cache' }] };
  await page.evaluate(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), { key: SAVE_KEY, save: { version: SAVE_VERSION, design, chapter: 0, unlocked: 2, history: [], certificates: [], guided: false } });
  await page.goto('http://127.0.0.1:5173/#system-lab');
  const launch = page.getByRole('button', { name: 'Try creating a real mapping' });
  await launch.click();
  const dialog = page.getByRole('dialog', { name: 'Where does your link live?' });
  await dialog.getByRole('button', { name: 'Create short link', exact: true }).click();
  const first = await dialog.getByLabel('Short code to open').inputValue();
  assert.ok(first.length > 0);
  await dialog.getByRole('button', { name: 'Open short link', exact: true }).click();
  assert.ok((await dialog.getByRole('status').innerText()).includes('Opened from the saved database mapping'));
  await dialog.getByRole('button', { name: 'Open short link', exact: true }).click();
  assert.ok((await dialog.getByRole('status').innerText()).includes('Opened from a cached copy'));
  await dialog.getByRole('button', { name: 'Clear cached copies', exact: true }).click();
  await dialog.getByRole('button', { name: 'Open short link', exact: true }).click();
  assert.ok((await dialog.getByRole('status').innerText()).includes('Opened from the saved database mapping'));
  await dialog.getByLabel('Destination URL').fill('https://bakery.example/cakes');
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Create short link', exact: true }).click();
  assert.ok((await dialog.getByRole('status').innerText()).includes('UNIQUE rejected the candidate'));
  assert.notEqual(await dialog.getByLabel('Short code to open').inputValue(), first);
  await dialog.getByRole('button', { name: first, exact: true }).click();
  assert.ok((await dialog.getByRole('status').innerText()).includes('Destination: https://bakery.example/menu'));
  // Escape closes and returns focus; reopening keeps the experiment's table.
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(), 0);
  assert.ok(await launch.evaluate(el => el === document.activeElement));
  await launch.click();
  assert.equal(await dialog.locator('tbody tr').count(), 2);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await dialog.getByRole('button', { name: 'Reset this experiment…' }).click();
  await dialog.getByRole('button', { name: 'Keep my experiment' }).click();
  assert.equal(await dialog.locator('tbody tr').count(), 2);
  await dialog.getByRole('button', { name: 'Reset this experiment…' }).click();
  await dialog.getByRole('button', { name: 'Reset experiment data' }).click();
  assert.equal(await dialog.locator('tbody tr').count(), 0);
  const stored = await page.evaluate(key => localStorage.getItem(key), SAVE_KEY);
  assert.ok(!stored.includes('bakery.example'));
  assert.deepEqual(JSON.parse(stored).design, design);
  assert.deepEqual(destinationRequests, []);
  assert.deepEqual(errors, []);
  console.log('Link experiment browser QA passed: create, open, hit/miss, cache loss, collision retry, table integrity, close/reopen, Escape focus, reset confirmation, mobile overflow, no destination requests or persisted URLs.');
} finally { await browser.close(); }
