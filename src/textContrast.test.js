import { describe, expect, it } from 'vitest';
import { contrast, rgb } from '../scripts/text-contrast.mjs';
describe('bounded text contrast audit', () => {
  it('uses sRGB relative luminance and preserves exact threshold comparisons', () => {
    expect(contrast('rgb(0, 0, 0)', 'rgb(255, 255, 255)')).toBe(21);
    expect(contrast('rgb(255, 255, 255)', 'rgb(0, 0, 0)')).toBe(21);
    expect(contrast('rgb(255, 255, 255)', 'rgb(255, 255, 255)')).toBe(1);
    expect(contrast('rgb(119, 119, 119)', 'rgb(255, 255, 255)')).toBeLessThan(4.5);
    expect(contrast('rgb(67, 92, 80)', 'rgb(255, 249, 233)')).toBeGreaterThan(6);
  });
  it('rejects transparency and unsupported syntax instead of reporting false conformance', () => {
    expect(rgb('rgba(0, 0, 0, 1)')).toEqual([0, 0, 0]);
    for (const color of ['transparent', 'rgba(0, 0, 0, 0.5)', '#fff', 'rgb(300, 0, 0)', 'oklab(1 0 0)']) expect(() => rgb(color)).toThrow();
  });
});
