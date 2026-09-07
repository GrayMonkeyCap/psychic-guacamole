// sRGB contrast for opaque text over a known solid background, per WCAG 2.x.
// Deliberately reject unsupported colors rather than pretending to audit gradients/blends.
export function rgb(color) {
  const match = color.match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
  if (!match || match[4] !== undefined && Number(match[4]) !== 1) throw new Error(`Expected an opaque RGB color: ${color}`);
  const channels = match.slice(1, 4).map(Number);
  if (channels.some(value => value < 0 || value > 255)) throw new Error(`RGB channel out of range: ${color}`);
  return channels;
}
export function contrast(foreground, background) {
  const luminance = color => rgb(color).map(channel => {
    const normalized = channel / 255;
    return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
  }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
