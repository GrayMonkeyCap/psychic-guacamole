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
  await page.getByRole('button', { name: 'Show all tools' }).click();
  for (const name of ['API server', 'API server', 'Database', 'Load balancer']) await page.getByRole('button', { name: `Add ${name}`, exact: true }).click();
  const nav = page.getByRole('region', { name: 'Text system navigator' });
  const press = async locator => { await locator.focus(); await page.keyboard.press('Enter'); };
  const open = () => press(page.getByRole('button', { name: 'System list', exact: true }));
  async function connect(from, to) {
    await open();
    await press(nav.getByRole('button', { name: `Start call from ${from}`, exact: true }));
    await page.getByLabel('Target service').selectOption({ label: to });
    await press(page.getByRole('button', { name: 'Connect this call', exact: true }));
  }
  await connect('Visitors', 'Load balancer');
  await connect('Load balancer', 'API server 1');
  await connect('Load balancer', 'API server 2');
  await connect('API server 1', 'Database');
  await connect('API server 2', 'Database');
  assert.ok((await page.locator('.l1-system-state').innerText()).includes('Ready for visitors'));
  assert.equal(await page.locator('[data-node-id]').filter({ hasText: 'API 2' }).count(), 1);
  await open();
  assert.ok(await nav.getByRole('heading', { name: 'Your system, in words.' }).evaluate(el => el === document.activeElement));
  assert.equal(await nav.getByRole('list', { name: 'System service calls' }).getByRole('listitem').count(), 5);
  await press(nav.getByRole('button', { name: 'Inspect API server 2', exact: true }));
  const heading = page.getByRole('heading', { name: 'API server 2', exact: true });
  assert.ok(await heading.evaluate(el => el === document.activeElement));
  assert.ok(await page.getByRole('button', { name: 'Move without dragging' }).isVisible());
  await open();
  await press(nav.getByRole('button', { name: 'Inspect call from API server 2 to Database', exact: true }));
  assert.ok(await page.getByRole('heading', { name: 'One call. Two directions.' }).isVisible());
  await press(page.getByRole('button', { name: 'Disconnect call', exact: true }));
  await page.getByRole('button', { name: 'Undo last edit' }).click();
  await page.getByRole('button', { name: 'Send traffic', exact: true }).click();
  await open();
  await nav.getByText('Traffic is running.', { exact: false }).waitFor();
  assert.ok(await nav.getByRole('button', { name: 'Start call from API server 1', exact: true }).isDisabled());
  await page.getByRole('button', { name: 'Pause traffic', exact: true }).click();
  assert.ok((await nav.innerText()).includes('admitted/s'));
  await page.getByRole('button', { name: 'End run', exact: true }).click();
  await page.getByRole('button', { name: 'End run & edit', exact: true }).click();
  await nav.getByRole('button', { name: 'Close system list' }).click();
  assert.ok(await page.getByRole('button', { name: 'System list', exact: true }).evaluate(el => el === document.activeElement));
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 844 }); await open();
    await nav.getByRole('button', { name: 'Inspect API server 2', exact: true }).scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await nav.getByRole('button', { name: 'Close system list' }).click();
  }
  assert.deepEqual(errors, []);
  console.log('System navigator QA passed: keyboard-only replicated wiring, distinct labels, node/call inspection, disconnect/undo, paused counts, focus and compact layouts.');
} finally { await browser.close(); }
