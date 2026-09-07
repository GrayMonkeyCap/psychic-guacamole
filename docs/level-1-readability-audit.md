# Level 1 essential-text readability pass

7 September 2026 · L1-041 partial, L1-046 partial

## Scope and result

Increased the size and contrast of critical solid-surface text: footer measurements and state, component tier/load labels, workbench prices, forecast/rules, inspector headings and save status, service telemetry, illustrative trace labels, and pass/failure explanations. The clay palette, component geometry and HUD structure remain.

The isolated browser check samples build, illustrative trace, passed and failed states at desktop, then failed-state layouts at 768, 390 and 320 CSS px. The initial post-change run measured **371 text/style samples, minimum contrast 4.747:1, minimum font size 10 CSS px, no failures**. Samples repeat selectors across states; this is not a count of unique labels or full-page coverage. Most changed HUD/inspector text is 11–13 px; fixed-size component secondary labels use 10 px. The size floor is a product constraint, not a WCAG minimum font-size rule or a claim that these sizes suit every reader.

The prior CSS pairings illustrate why the pass was needed:

| Text | Prior foreground / solid background | Nominal prior contrast | Prior size |
| --- | --- | ---: | ---: |
| Footer measurement labels | `#8b9681` / `#f8efde` | 2.714:1 | 8 px |
| Component tier | `#7c8874` / `#fffae7` | 3.566:1 | 8 px |
| Failed footer measurement | `#b66e4d` / `#f8efde` | 3.453:1 | 20 px desktop |

These baseline ratios are computed from the pre-change CSS declarations, not reconstructed screenshots. Trace subtitles also had 0.7 opacity; they now use opaque, larger text so their solid-background contrast can be checked directly.

## Method and source

The check uses [W3C's Contrast (Minimum) guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum): normal-size text generally needs 4.5:1, with specified exceptions and a lower threshold for large text. This bounded check applies 4.5:1 to all sampled enabled text, including larger numbers. It uses the sRGB relative-luminance formula, compares unrounded ratios, and does not treat 4.49 as passing.

Run `node scripts/verify-readability.mjs /path/to/node_modules .test-artifacts/readability` against a running development preview, or use `npm run verify -- --runtime /path/to/node_modules` for a private production preview. The full and smoke suites include the check. `src/textContrast.test.js` checks black/white, equal colors, a near-threshold example, and rejection of unsupported/translucent color syntax.

For each selected text element, the browser reads computed foreground, font size and nearest nontransparent background. Unexpected ancestor opacity, blending/filter effects, background images before a solid surface or unsupported color syntax fail the check for manual review. Disabled controls are excluded, not declared conformant. The script also asserts compact-page overflow and reachable retry controls. Screenshots are for visual review, not proof of contrast or comprehension.

## Still open

- Full rendered-page/landing-screen coverage, actual canvas text/lines, gradients, icons, ports, focus indicators, disabled states and every hover/selected state.
- Real browser/text zoom, user font overrides, long translated strings and broad device qualification.
- Assistive-technology and novice readability/usability studies; the palette/text-size changes alone do not establish access or learning.

No WCAG conformance claim is made. This is a reproducible improvement to a defined set of important reading surfaces, with explicit remaining work.
