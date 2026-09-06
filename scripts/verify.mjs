import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const FULL_CHECKS = ['campaign', 'editor', 'level', 'outcomes', 'link-experiment', 'edit-history', 'connections', 'help', 'backups', 'save-conflicts', 'component-contracts', 'completion-recap', 'capacity-preview', 'structure-review', 'system-navigator', 'traffic-motion', 'playback', 'run-modes'];
export const SMOKE_CHECKS = ['campaign', 'connections', 'backups', 'save-conflicts', 'system-navigator', 'playback', 'run-modes'];

export function parseOptions(args, env = process.env) {
  const options = { runtime: env.PLAYWRIGHT_NODE_MODULES || path.join(root, 'node_modules'), suite: 'full', port: 5181 };
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--help') return { help: true };
    if (!['--runtime', '--suite', '--port'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Unknown or incomplete option: ${key}`);
    const value = args[++i];
    if (key === '--runtime') options.runtime = path.resolve(value);
    if (key === '--suite') options.suite = value;
    if (key === '--port') {
      if (!/^\d+$/.test(value)) throw new Error('Port must be an integer between 1024 and 65535.');
      options.port = Number(value);
    }
  }
  if (!['full', 'smoke'].includes(options.suite)) throw new Error('Suite must be full or smoke.');
  if (!Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) throw new Error('Port must be an integer between 1024 and 65535.');
  options.runtime = path.resolve(options.runtime);
  return options;
}

export function runProcess(label, args, { cwd = root, env = process.env, timeoutMs = 180000, signal, stdio = 'inherit' } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error(`${label}: interrupted`)); return; }
    const child = spawn(process.execPath, args, { cwd, env, stdio, windowsHide: true });
    let failure;
    const abort = () => { failure = new Error(`${label}: interrupted`); child.kill(); };
    signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(() => { failure = new Error(`${label}: timed out after ${timeoutMs / 1000}s`); child.kill(); }, timeoutMs);
    const cleanup = () => { clearTimeout(timeout); signal?.removeEventListener('abort', abort); };
    child.once('error', error => { cleanup(); reject(error); });
    child.once('exit', (code, exitSignal) => {
      cleanup();
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error(`${label}: exited with ${code ?? exitSignal}`));
      else resolve();
    });
  });
}

async function assertPortFree(port) {
  const probe = createServer();
  try {
    await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(port, '127.0.0.1', resolve); });
  } catch { throw new Error(`Verification port ${port} is occupied or unavailable. Choose --port; no existing server was stopped.`); }
  finally { if (probe.listening) await new Promise(resolve => probe.close(resolve)); }
}

async function waitForPreview(child, url, signal, launchError) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (signal.aborted) throw new Error('Verification interrupted.');
    if (launchError()) throw launchError();
    if (child.exitCode !== null || child.signalCode !== null) throw new Error('Verification preview exited before it was ready.');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(700) });
      const html = await response.text();
      if (response.ok && html.includes('<title>System Sandbox') && html.includes('/assets/')) return;
    } catch { /* wait for this build's preview */ }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('Verification preview was not ready within 15 seconds.');
}

export async function verify(options) {
  const runtimeRequire = createRequire(path.join(options.runtime, 'package.json'));
  try { runtimeRequire.resolve('playwright'); } catch { throw new Error('Playwright is unavailable. Supply --runtime /path/to/node_modules or PLAYWRIGHT_NODE_MODULES. Microsoft Edge must also be installed. No dependencies are downloaded automatically.'); }
  await assertPortFree(options.port);
  const controller = new AbortController(), interrupt = () => controller.abort();
  process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
  const rows = [], started = Date.now();
  let preview;
  const check = async (name, args, env) => {
    console.log(`\n[verify] ${name}`);
    const start = Date.now();
    await runProcess(name, args, { env, signal: controller.signal });
    rows.push(`${name}: PASS (${((Date.now() - start) / 1000).toFixed(1)}s)`);
  };
  try {
    await check('Model and component tests', ['node_modules/vitest/vitest.mjs', 'run']);
    await check('Production build', ['node_modules/vite/bin/vite.js', 'build']);
    await assertPortFree(options.port);
    const url = `http://127.0.0.1:${options.port}`;
    let previewError;
    preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(options.port), '--strictPort'], { cwd: root, stdio: 'ignore', windowsHide: true });
    preview.once('error', error => { previewError = error; });
    await waitForPreview(preview, url, controller.signal, () => previewError);
    const artifacts = path.join(root, '.test-artifacts', `verify-${Date.now()}-${process.pid}`);
    await mkdir(artifacts, { recursive: true });
    const env = { ...process.env, SYSTEM_SANDBOX_TEST_URL: url };
    const checks = options.suite === 'full' ? FULL_CHECKS : SMOKE_CHECKS;
    for (const name of checks) {
      if (preview.exitCode !== null || preview.signalCode !== null) throw new Error('Verification preview stopped during the run.');
      await check(`Browser: ${name}`, [`scripts/verify-${name}.mjs`, options.runtime, artifacts], env);
    }
    console.log(`\n${options.suite.toUpperCase()} verification passed. ${checks.length} browser scripts; ${((Date.now() - started) / 1000).toFixed(1)}s total.\n${rows.join('\n')}\nScreenshots: ${artifacts}\nNo player profile or running developer preview was used.`);
  } finally {
    if (preview && preview.pid && preview.exitCode === null && preview.signalCode === null) {
      const stopped = once(preview, 'exit');
      preview.kill();
      await stopped;
    }
    process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = parseOptions(process.argv.slice(2));
    if (options.help) console.log('npm run verify -- [--runtime /path/to/node_modules] [--suite full|smoke] [--port 5181]\nDefaults to the full suite against a private production preview. Requires installed Playwright and Microsoft Edge.');
    else await verify(options);
  } catch (error) { console.error(`\n[verify] FAILED: ${error.message}`); process.exitCode = 1; }
}
