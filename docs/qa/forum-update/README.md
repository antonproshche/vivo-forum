# Forum update — QA

Base: latest `main`, `d7531e8dd17dca3a98dc503ae5fdf43066592424` (verified through GitHub before implementation and delivery).

## Confirmed speaker content

The requested final count was clarified as **five speakers**: the four existing cards plus Надежда Лихошерст. The base page contains Диана Минец, Виктория Шухат, Арсалан Амин, Евгения Шамис. Their four photo sources, WebP sources and descriptions are unchanged. Ася Чангиан, Александра Абрамова and Татьяна Норина appear as contacts, not speakers. No contact has been promoted to speaker.

Надежда Лихошерст is the fifth confirmed speaker, with an empty circular frame and her name only. The Hero count is updated to five. The four-column desktop grid has two existing speakers at upper right and three cards below; the lower-right position remains open as part of the staggered composition.

## Browser verification

Automated using installed Playwright and Chromium; no runtime dependencies added. See [machine-readable results](results.json).

| Viewport (CSS px) | Horizontal overflow | Broken images / console errors | Minimum disc width |
| --- | --- | --- | --- |
| 375 | none | none | 24px |
| 390 | none | none | 24px |
| 430 | none | none | 24px |
| 768 | none | none | 24px |
| 1024 | none | none | 30px |
| 1440 | none | none | 30px |
| 1920 | none | none | 30px |

- CSS animation timeline sampled through two cycles: groups 1/4/7, 2/5, 3/6 start at 0/3/6 seconds. Each reaches its narrowest point at +0.6s and returns at +1.2s; all sampled idle intervals are face-on. No edge-on hold, translation, or cycle jump.
- Computed projection measured from each pseudo-element's transform matrix and rendered diameter. JavaScript uses `acos(edgeWidth / diameter)` via ResizeObserver; there are no mouse/parallax listeners or animation-frame loops. At 406px, the maximum angle is approximately 85.76 degrees.
- Mouse moved across the Hero with CSS animation paused: geometry and transforms of all eight decorative circles stayed unchanged.
- Reduced motion disables flips and restores face-on discs. No-JavaScript navigation and program remain usable.
- All organizer/partner anchors removed. Image order: PSPiON, Vivo, Sberbank, Committee. Images retain `object-fit: contain`; Sber's 16000×9000 source is downsampled to 800×450 without cropping. The original remains untouched.
- Existing speaker names, descriptions, PNG references and WebP references compared with the base page. Надежда has no image, invented description or initials.
- Exactly nine program entries compared verbatim with the requested times, names, punctuation and descriptions, including the 12:45–13:00 gap.
- Speaker cards, introduction, program columns and organizer groups checked for overlapping bounding boxes. Screenshots reviewed for text wrapping and portrait layout.
- Every link outside Organizers has the same text and destination as before. All internal anchor targets exist; `#program` navigation and focus work. Mobile menu, Escape focus restoration and native FAQ toggles pass.
- `node --check script.js` and `git diff --check` pass. `CNAME` and GitHub Pages configuration are unchanged.

Browser scope: Chromium. External destinations were preserved and inspected, not submitted or tested for remote availability. This is a targeted accessibility regression check (semantics, alt text, keyboard/focus and reduced motion), not a full accessibility conformance audit.

## Before / after screenshots

Captured from the base and updated code with reduced motion, at the same viewport sizes. Each image shows before on the left and after on the right. All seven widths were tested; these desktop and mobile comparisons document all four changed sections.

| Section | Desktop (1440px) | Mobile (390px) |
| --- | --- | --- |
| Hero | [Comparison](home-1440.webp) | [Comparison](home-390.webp) |
| Speakers | [Comparison](speakers-1440.webp) | [Comparison](speakers-390.webp) |
| Organizers | [Comparison](organizers-1440.webp) | [Comparison](organizers-390.webp) |
| Program | [Comparison](program-1440.webp) | [Comparison](program-390.webp) |
