import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { FULL_CHECKS, SMOKE_CHECKS, parseOptions, runProcess } from '../scripts/verify.mjs';

describe('verification orchestration', () => {
  it('defaults to the full suite and accepts explicit runtime, suite and port', () => {
    expect(parseOptions([], {}).suite).toBe('full');
    expect(parseOptions(['--suite', 'smoke', '--port', '5182'], {}).port).toBe(5182);
    expect(parseOptions([], { PLAYWRIGHT_NODE_MODULES: '/runtime/node_modules' }).runtime.replaceAll('\\', '/')).toContain('/runtime/node_modules');
    expect(parseOptions(['--help'], {})).toEqual({ help: true });
  });
  it('rejects incomplete, unknown or invalid options before starting processes', () => {
    for (const args of [['--runtime'], ['--suite', 'skip'], ['--port', '0'], ['--port', '65536'], ['--port', '5181.5'], ['--port', '5e3'], ['--what'], ['--runtime', '--suite']]) expect(() => parseOptions(args, {})).toThrow();
  });
  it('lists existing unique browser scripts, with smoke explicitly a subset', () => {
    expect(new Set(FULL_CHECKS).size).toBe(FULL_CHECKS.length);
    expect(SMOKE_CHECKS.every(check => FULL_CHECKS.includes(check))).toBe(true);
    expect(FULL_CHECKS.every(check => existsSync(`scripts/verify-${check}.mjs`))).toBe(true);
  });
  it('propagates subprocess failure instead of printing a successful suite', async () => {
    await expect(runProcess('fixture', ['-e', 'process.exit(0)'], { stdio: 'ignore' })).resolves.toBeUndefined();
    await expect(runProcess('fixture', ['-e', 'process.exit(7)'], { stdio: 'ignore' })).rejects.toThrow('exited with 7');
    await expect(runProcess('fixture', ['-e', 'setInterval(() => {}, 1000)'], { timeoutMs: 150, stdio: 'ignore' })).rejects.toThrow('timed out');
    const controller = new AbortController(); controller.abort();
    await expect(runProcess('fixture', ['-e', 'process.exit(0)'], { signal: controller.signal, stdio: 'ignore' })).rejects.toThrow('interrupted');
  });
});
