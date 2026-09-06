import { TEST_URL } from './verification-config.mjs';
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(path.join(process.argv[2], 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${TEST_URL}/#system-lab`);
  await page.getByRole('button', { name: 'Let’s build a link' }).click();
  const summary = page.locator('.l1-structure-review summary'), issues = page.getByRole('list', { name: 'Connection issues' });
  await summary.focus(); await page.keyboard.press('Enter');
  await issues.getByRole('button').click();
  assert.ok(await page.getByRole('button', { name: 'Inspect Visitors', exact: true }).evaluate(el => el === document.activeElement));
  await page.getByRole('button', { name: 'Add API server', exact: true }).click();
  await page.getByRole('button', { name: 'Add Database', exact: true }).click();
  await page.getByRole('button', { name: 'Start call from Visitors', exact: true }).click();
  await page.getByRole('button', { name: 'Connect to API server', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect API server', exact: true }).click();
  await page.getByLabel('SHORT CODE STRATEGY').selectOption('service');
  assert.ok((await summary.innerText()).includes('2 connection issues'));
  await page.locator('.l1-save-note').filter({ hasText: 'saved on this device' }).waitFor();
  const baseline = await page.evaluate(() => localStorage.getItem('system-sandbox:first-level:v2'));
  await issues.getByRole('button', { name: /chose the ID service strategy/ }).click();
  const local = page.getByRole('region', { name: 'Connection issue here' });
  assert.ok((await local.innerText()).includes('or choose database sequence / random codes'));
  assert.ok(await page.getByRole('button', { name: 'Inspect API server', exact: true }).evaluate(el => el === document.activeElement));
  assert.equal(await page.evaluate(() => localStorage.getItem('system-sandbox:first-level:v2')), baseline);
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await summary.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel('SHORT CODE STRATEGY').selectOption('random');
  assert.ok((await summary.innerText()).includes('1 connection issue'));
  assert.ok(!(await local.innerText()).includes('chose the ID service strategy'));
  await page.getByRole('button', { name: 'Start call from API server', exact: true }).click();
  await page.getByRole('button', { name: 'Connect to Database', exact: true }).click();
  assert.equal(await summary.count(), 0);
  assert.equal(await local.count(), 0);
  assert.ok((await page.locator('.l1-system-state').innerText()).includes('Ready for visitors'));
  assert.deepEqual(errors, []);
  console.log('Structural review QA passed: keyboard issue list, exact component focus, all causes, no mutation, optional ID alternatives, immediate clearing and compact widths.');
} finally { await browser.close(); }
