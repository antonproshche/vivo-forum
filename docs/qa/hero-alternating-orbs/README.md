# Hero circle flip — browser verification

Verified against branch base `f7fa596ed4a77709197a1a0bca10f93290d9b441`.

## Diagnosis and repair

The HTML's A/B assignments and keyframe timing were correct. No conflicting
Group B transform declaration was found. In local Chromium, the old branch
animated **both** groups when its script initialized, so the reported B-only
failure was not reproduced under that condition. Blocking `script.js` left
`--orb-flip-angle: 0deg` and identity transforms on all seven painted surfaces,
even though their animation names remained assigned.

The repair removes that zero-angle/ResizeObserver initialization dependency.
CSS now derives the angle from the same diameter that controls layout:

- Desktop: `acos(30 / 406)` = **85.7624595864°**, giving a 30px projected width.
- Mobile (up to 800px): `acos(24 / 310)` = **85.5597545341°**, preserving 24px.

The custom property is inherited by each painted `::before` surface, with no
inline JavaScript override. Symmetric `ease-in-out` replaces the asymmetric
`cubic-bezier(.4,0,0,1)`. The unchanged 5-second infinite keyframes peak only at
15% and 65%, with immediate return and no edge-on plateau. Group assignments,
colors, transparency, positions, overlap and reduced-motion rules are unchanged.
Only Hero animation CSS and the now-unnecessary Hero observer change in production.

## Results

Playwright + Chromium **154.0.8037.57**, local rendered site, 390, 768, 800, 801,
1440, 1920 and 2400px viewports. The 2400px view shows all seven circles, including
those intentionally cropped at narrower widths by the existing artwork layout.

| Time within each 5s cycle | A: circles 1, 3, 5, 7 | B: circles 2, 4, 6 |
| --- | --- | --- |
| 0.75s | 30px desktop / 24px mobile | Face-on |
| 2.00s | Face-on | Face-on |
| 3.25s | Face-on | 30px desktop / 24px mobile |
| 4.50s | Face-on | Face-on |

- All four checkpoints pass for **three consecutive cycles** at every width.
  Computed animation names, duration, easing, transforms, custom property values
  and inline overrides for **every circle** are saved in [results.json](results.json).
- Independent screenshot pixel measurements at 2400px confirm actual painted
  widths of **30px / 406px** for all seven circles at all 12 checkpoints. This
  measures each circle's contribution to the screenshot, not just its CSS matrix.
- A separate, unpaused **15-second live run** observed all seven circles rotate
  in each of three consecutive cycles.
- 301 samples per viewport cover 0–15s, width limits, face-on pauses and repetition.
  Samples on either side of both peaks confirm symmetric motion and no hold.
- The rotation works with `script.js` blocked. Resizing the same document across
  390, 801, 800 and 1920px updates the angles and widths correctly.
- Reduced motion removes all seven animations. Full-page reduced-motion PNGs
  are byte-identical to the branch base at all seven viewport widths.
- No horizontal overflow, broken images, page/console errors or mouse parallax.
- JavaScript syntax and `git diff --check` pass.

[Three-cycle screenshot contact sheet](three-cycles.png) (cropped to the circle
band; original positions retained). Full Hero screenshots for the required phases:
[0.75s](screenshots/hero-2400-750.png), [2.00s](screenshots/hero-2400-2000.png),
[3.25s](screenshots/hero-2400-3250.png), [4.50s](screenshots/hero-2400-4500.png).
Desktop, mobile and three-cycle screenshots were visually inspected.

This verifies Chromium locally; it does not claim production deployment or
Safari/Firefox testing. CSS inverse trigonometric functions require a modern browser.

## Reproduce

Install Playwright and `pngjs` in the test environment, and provide Chromium.
Serve the repository and an unchanged branch-base checkout over HTTP, then run:

```sh
TEST_URL=http://127.0.0.1:8000/hero-test/ \
BASELINE_URL=http://127.0.0.1:8000/hero-before/ \
CHROMIUM_PATH=/usr/bin/chromium \
ARTIFACT_DIR=/workspace/work/hero-verification \
node docs/qa/hero-alternating-orbs/verify.cjs
```

`BASELINE_URL` is optional; without it, full-page comparison is skipped. The
artifact directory receives checkpoint screenshots and machine-readable results.
No production dependencies are added.
