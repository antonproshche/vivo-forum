// Requires Playwright, pngjs and Chromium; no production dependencies.
// Serve the site over HTTP. BASELINE_URL is an unchanged branch-base checkout.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { PNG } = require('pngjs');

const url = process.env.TEST_URL || 'http://127.0.0.1:8000/vivo-forum/';
const baseline = process.env.BASELINE_URL;
const artifacts = process.env.ARTIFACT_DIR || '/workspace/work/hero-animation';
const widths = [390, 768, 800, 801, 1440, 1920, 2400];

async function ready(page, address) {
  await page.goto(address);
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach(image => { image.loading = 'eager'; });
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function sample(page, time) {
  return page.evaluate(time => {
    document.getAnimations().forEach(animation => {
      animation.pause();
      animation.currentTime = time;
    });
    return [...document.querySelectorAll('.orb-band')].map(circle => {
      const style = getComputedStyle(circle, '::before');
      const matrix = new DOMMatrixReadOnly(style.transform);
      return {
        width: Math.abs(matrix.m11) * circle.getBoundingClientRect().width,
        diameter: circle.getBoundingClientRect().width,
        opacity: style.opacity,
        visibility: style.visibility,
        background: style.backgroundImage,
      };
    });
  }, time);
}

async function computed(page) {
  return page.locator('.orb-band').evaluateAll(circles => circles.map((circle, i) => {
    const style = getComputedStyle(circle, '::before');
    return { circle: i + 1, animationName: style.animationName,
      duration: style.animationDuration, iterations: style.animationIterationCount,
      easing: style.animationTimingFunction, transform: style.transform,
      angle: style.getPropertyValue('--orb-flip-angle'),
      diameter: style.getPropertyValue('--orb-diameter'),
      edgeWidth: style.getPropertyValue('--orb-edge-width'),
      inlineAngle: circle.style.getPropertyValue('--orb-flip-angle') };
  }));
}

// Measure actual painted pixels, independently of computed matrices. At 2400px
// every circle is on screen; the central scanline is clear of text and clipping.
async function paintedWidths(page) {
  const clip = { x: 0, y: 744, width: 2400, height: 1 };
  const visible = PNG.sync.read(await page.screenshot({ clip }));
  const widths = [];
  for (let i = 1; i <= 7; i++) {
    const hide = await page.addStyleTag({ content: `.orb-band-${i}::before { visibility:hidden }` });
    const hidden = PNG.sync.read(await page.screenshot({ clip }));
    await hide.evaluate(node => node.remove());
    const changed = [];
    for (let x = 0; x < 2400; x++) {
      if ([0, 1, 2].some(c => Math.abs(visible.data[x * 4 + c] - hidden.data[x * 4 + c]) > 1)) changed.push(x);
    }
    assert.ok(changed.length, `circle ${i} must paint visible pixels`);
    widths.push(changed.at(-1) - changed[0] + 1);
  }
  return widths;
}

(async () => {
  await fs.mkdir(artifacts, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });
  const results = [];
  try {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 1100 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await ready(page, url);
      const animations = await page.evaluate(() => document.getAnimations().map(a => ({
        name: a.animationName, start: a.startTime, duration: a.effect.getTiming().duration,
        delay: a.effect.getTiming().delay, iterations: a.effect.getTiming().iterations,
      })));
      assert.equal(animations.length, 7);
      assert.equal(new Set(animations.map(a => a.start)).size, 1, 'shared start time');
      animations.forEach((a, i) => {
        assert.equal(a.name, i % 2 === 0 ? 'orb-flip-a' : 'orb-flip-b');
        assert.equal(a.duration, 5000);
        assert.equal(a.delay, 0);
        assert.equal(a.iterations, Infinity);
      });
      const original = await sample(page, 0);
      const edge = width <= 800 ? 24 : 30;
      const checkpoints = {};
      const computedStyles = {};
      const rasterWidths = {};
      for (let cycle = 0; cycle < 3; cycle++) {
        for (const [time, group] of [[750, 0], [2000, -1], [3250, 1], [4500, -1]]) {
          const circles = await sample(page, cycle * 5000 + time);
          circles.forEach((circle, i) => {
            const active = i % 2 === group;
            assert.ok(Math.abs(circle.width - (active ? edge : circle.diameter)) < 0.01,
              `${width}px, cycle ${cycle + 1}, ${time}ms, circle ${i + 1}: ${circle.width}`);
            assert.equal(circle.opacity, '1');
            assert.equal(circle.visibility, 'visible');
            assert.equal(circle.background, original[i].background);
          });
          checkpoints[`${cycle * 5000 + time}ms`] = circles.map(c => +c.width.toFixed(3));
          computedStyles[`${cycle * 5000 + time}ms`] = await computed(page);
          if (!cycle || width === 2400) {
            await page.locator('.hero').screenshot({ path: path.join(artifacts, `hero-${width}-${cycle * 5000 + time}.png`) });
          }
          if (width === 2400) {
            const painted = await paintedWidths(page);
            painted.forEach((w, i) => assert.ok(Math.abs(w - circles[i].width) <= 2,
              `actual pixels: cycle ${cycle + 1}, ${time}ms, circle ${i + 1}: ${w}`));
            rasterWidths[`${cycle * 5000 + time}ms`] = painted;
          }
        }
      }
      // Sample every 50ms across three complete cycles, including cycle boundaries.
      const sweep = await page.evaluate(() => {
        const circles = [...document.querySelectorAll('.orb-band')];
        const animations = document.getAnimations();
        return Array.from({ length: 301 }, (_, step) => {
          const time = step * 50;
          animations.forEach(a => { a.currentTime = time; });
          return {
            time,
            overflow: document.documentElement.scrollWidth > innerWidth,
            widths: circles.map(c => Math.abs(new DOMMatrixReadOnly(getComputedStyle(c, '::before').transform).m11) * c.offsetWidth),
          };
        });
      });
      sweep.forEach(({ time, overflow, widths: projected }) => {
        assert.equal(overflow, false, `overflow at ${time}ms`);
        const phase = time % 5000;
        projected.forEach((w, i) => {
          assert.ok(w >= edge - 0.01 && w <= original[i].diameter + 0.01);
          const idle = i % 2 === 0 ? phase >= 1500 : phase <= 2500 || phase >= 4000;
          if (idle) assert.ok(Math.abs(w - original[i].diameter) < 0.01);
          if (time >= 5000) assert.ok(Math.abs(w - sweep[(time % 5000) / 50].widths[i]) < 0.01);
        });
      });
      for (const peak of [750, 3250]) {
        const before = await sample(page, peak - 25);
        const at = await sample(page, peak);
        const after = await sample(page, peak + 25);
        const i = peak === 750 ? 0 : 1;
        assert.ok(before[i].width > at[i].width && after[i].width > at[i].width, 'no edge-on hold');
        for (const offset of [25, 150, 375, 600]) {
          const left = await sample(page, peak - offset);
          const right = await sample(page, peak + offset);
          left.forEach((circle, j) => assert.ok(Math.abs(circle.width - right[j].width) < 0.01,
            `symmetric flip: ${peak}ms +/- ${offset}ms, circle ${j + 1}`));
        }
      }
      await sample(page, 2000);
      const intro = await page.locator('.orb-intro').evaluate(c => ({ rect: c.getBoundingClientRect().toJSON(), transform: getComputedStyle(c).transform }));
      await page.mouse.move(0, 0);
      await page.mouse.move(width - 1, 900);
      assert.deepEqual(await sample(page, 2000), original, 'no mouse parallax');
      assert.deepEqual(await page.locator('.orb-intro').evaluate(c => ({ rect: c.getBoundingClientRect().toJSON(), transform: getComputedStyle(c).transform })), intro);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
      assert.deepEqual(await sample(page, 0), original);
      let identicalBaseline = null;
      if (baseline) {
        const before = await browser.newPage({ viewport: { width, height: 1100 }, reducedMotion: 'reduce' });
        await ready(before, baseline);
        const beforeImage = await before.screenshot({ fullPage: true });
        const afterImage = await page.screenshot({ fullPage: true });
        identicalBaseline = beforeImage.equals(afterImage);
        assert.ok(identicalBaseline, `full-page visual regression at ${width}px`);
        await before.close();
      }
      assert.equal(await page.evaluate(() => [...document.images].filter(i => !i.complete || !i.naturalWidth).length), 0);
      assert.deepEqual(errors, []);
      results.push({ width, checkpoints, computedStyles, rasterWidths, fullPageIdenticalToBaseline: identicalBaseline,
        sharedStartTime: true, cycles: 3, sweepSamples: sweep.length, horizontalOverflow: false,
        reducedMotion: 'pass', noParallax: 'pass', browserErrors: errors });
      await page.close();
    }
    // The rotation must also work before/without the navigation script.
    const withoutJS = [];
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1100 } });
      await page.route('**/script.js', route => route.abort());
      await ready(page, url);
      const edge = width === 390 ? 24 : 30;
      for (const [time, group] of [[750, 0], [3250, 1]]) {
        const circles = await sample(page, time);
        circles.forEach((circle, i) => assert.ok(Math.abs(circle.width - (i % 2 === group ? edge : circle.diameter)) < 0.01));
      }
      withoutJS.push({ width, computedStyles: await computed(page), passed: true });
      await page.close();
    }
    // Resize the same document across the breakpoint, without a JS observer.
    const resizing = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await ready(resizing, url);
    for (const width of [390, 801, 800, 1920]) {
      await resizing.setViewportSize({ width, height: 1100 });
      for (const [time, group] of [[750, 0], [3250, 1]]) {
        const circles = await sample(resizing, time);
        circles.forEach((circle, i) => assert.ok(Math.abs(circle.width - (i % 2 === group ? (width <= 800 ? 24 : 30) : circle.diameter)) < 0.01));
      }
    }
    await resizing.close();
    // Also let the real document clock run through three cycles without seeking.
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await ready(page, url);
    const live = await page.evaluate(() => new Promise(resolve => {
      const animations = document.getAnimations();
      const first = animations[0].currentTime;
      const seen = [new Set(), new Set(), new Set()];
      let overflow = false;
      function frame() {
        const elapsed = animations[0].currentTime - first;
        const cycle = Math.floor(elapsed / 5000);
        if (cycle >= 3) return resolve({ groups: seen.map(s => [...s].sort()), overflow, elapsed });
        overflow ||= document.documentElement.scrollWidth > innerWidth;
        [...document.querySelectorAll('.orb-band')].forEach((c, i) => {
          const scale = Math.abs(new DOMMatrixReadOnly(getComputedStyle(c, '::before').transform).m11);
          if (scale < 0.1) seen[cycle].add(i + 1);
        });
        requestAnimationFrame(frame);
      }
      frame();
    }));
    assert.deepEqual(live.groups, Array.from({ length: 3 }, () => [1, 2, 3, 4, 5, 6, 7]));
    assert.equal(live.overflow, false);
    const report = { browser: await browser.version(), viewports: results, withoutJS, resize: 'pass', live };
    await fs.writeFile(path.join(artifacts, 'results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ browser: report.browser, widths, cycles: 3, live, withoutJS: 'pass', resize: 'pass' }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
