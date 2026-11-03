# Hero alternating circles — verification

Base: `34be0cce0cce7839b442d50ff83245d6afb4baa9` (current `main`).

The previous CSS used a 9-second animation: circles 1/4/7 started immediately,
2/5 had a 3-second delay, and 3/6 had a 6-second delay. All seven selectors match;
there is no incorrect `nth-child` selector in this revision. The initial emphasis
on 1/4/7 comes from that three-group schedule, not a missing animation rule.

Explicit `orb-group-a` and `orb-group-b` classes now select the odd and even
bottom-row circles. Both animations share a 5-second duration and start time,
with no animation delays. A turns during 0–1.5s, B during 2.5–4s, with 1-second
face-on pauses between turns. This follows the explicit 5-second timeline in the
request (whose prose also referred to 4 seconds and 0.5-second pauses).

Identical turns peak at 0.75s and 3.25s. At the requested 3.15s checkpoint, B is
already approximately edge-on; smooth easing approaches the minimum without a
hold. The existing ResizeObserver angle calculation, 30px desktop / 24px mobile
minimum, gradients, transparency, size, positioning, overlap, and viewport
clipping are unchanged. The orange description circle is unaffected.

## Results

Tested the local site in Chromium 154.0.8037.57 using Playwright.

| Viewport | A at 0.75s | All at 2.00s | B at 3.15s (minimum at 3.25s) | All at 4.50s | Horizontal overflow |
| --- | --- | --- | --- | --- | --- |
| 390px | 24px | Face-on | 27.027px (24px) | Face-on | None |
| 768px | 24px | Face-on | 27.027px (24px) | Face-on | None |
| 1440px | 30px | Face-on | 33.975px (30px) | Face-on | None |
| 1920px | 30px | Face-on | 33.975px (30px) | Face-on | None |

- All checkpoints pass for three complete cycles at every width. Inactive groups
  remain face-on; opacity, visibility and gradients stay unchanged.
- 301 samples per viewport cover 0–15s in 50ms steps, checking width bounds,
  pauses, overflow and repetition. Samples around each apex confirm no hold.
- An additional 15-second run on the real document clock at 1440px observed all
  seven circles turn during each of three cycles, with no overflow.
- Full-page PNGs under reduced motion are byte-identical to the unchanged base
  at all four widths. Hero text, buttons, layout and all other sections match.
- Hero phase screenshots were captured at all four widths; mobile and desktop
  samples were visually reviewed. Existing decorative clipping is preserved.
- Reduced motion disables all seven rotations and restores face-on discs.
- Mouse movement does not change the circles; no parallax code was added.
- No broken images or browser errors. JavaScript syntax and `git diff --check`
  pass. No production JavaScript or dependency changes.

See [results.json](results.json) and the reproducible [browser check](verify.cjs).
This verifies the local source in Chromium; it is not a production deployment or
a Safari/Firefox test.

## Reproduce

Install Playwright in the test environment and provide a Chromium executable.
Serve the repository and an unchanged base checkout over HTTP, then run:

```sh
TEST_URL=http://127.0.0.1:8000/vivo-forum/ \
BASELINE_URL=http://127.0.0.1:8000/work/hero-baseline/ \
CHROMIUM_PATH=/usr/bin/chromium \
ARTIFACT_DIR=/workspace/work/hero-animation \
node docs/qa/hero-alternating-orbs/verify.cjs
```

`BASELINE_URL` is optional; without it, full-page comparison is skipped. The
artifact directory receives phase screenshots and machine-readable results.
