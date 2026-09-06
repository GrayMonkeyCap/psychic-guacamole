import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const require = createRequire(path.join(process.argv[2], 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/#system-lab');
  await page.getByRole('button', { name: 'Let’s build a link' }).click();
  await page.getByRole('button', { name: 'Show all tools' }).click();
  const contract = page.getByRole('region', { name: 'Component request and reply' });
  for (const name of ['API server', 'Database', 'Memory cache', 'Load balancer', 'ID service', 'Edge cache']) {
    await page.getByRole('button', { name: `Add ${name}`, exact: true }).click();
    assert.ok(await contract.getByText('Receives', { exact: true }).isVisible());
    assert.ok(await contract.getByText('Returns', { exact: true }).isVisible());
    const summary = contract.locator('summary');
    await summary.focus(); await page.keyboard.press('Enter');
    assert.ok(await contract.getByText('Remembers', { exact: true }).isVisible());
    assert.ok(await contract.getByText('Another way', { exact: true }).isVisible());
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.ok(await page.getByRole('button', { name: 'Inspect Visitors', exact: true }).isVisible());
  }
  await page.getByRole('button', { name: 'Inspect API server', exact: true }).click();
  await contract.locator('summary').click();
  await page.getByLabel('SHORT CODE STRATEGY').selectOption('random');
  assert.ok((await contract.innerText()).includes('Code allocation: Random code in API'));
  // Desktop and compact inspection keep the board and controls reachable.
  await contract.scrollIntoViewIfNeeded();
  const screenshot = path.join(os.tmpdir(), 'system-sandbox-component-contracts.png');
  await page.screenshot({ path: screenshot });
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await contract.locator('summary').scrollIntoViewIfNeeded();
    assert.ok(await contract.locator('summary').isVisible());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  }
  assert.deepEqual(errors, []);
  console.log(`Component contracts QA passed: all six components, keyboard disclosure, live strategy context, visible board and compact widths. Screenshot: ${screenshot}`);
} finally { await browser.close(); }
