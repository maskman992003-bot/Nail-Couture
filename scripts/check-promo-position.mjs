import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const info = await page.evaluate(() => {
  const el = document.querySelector('[aria-label^="View offer"]')?.closest('.fixed') ?? document.querySelector('.fixed.bottom-6');
  if (!el) return { found: false };
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const chain = [];
  let n = el.parentElement;
  while (n && chain.length < 12) {
    const s = getComputedStyle(n);
    if (s.transform !== 'none' || s.filter !== 'none' || s.perspective !== 'none') {
      chain.push({
        tag: n.tagName,
        className: n.className?.slice?.(0, 80) ?? '',
        transform: s.transform,
      });
    }
    n = n.parentElement;
  }
  return {
    found: true,
    shellPosition: style.position,
    buttonPosition: el.querySelector('button') ? getComputedStyle(el.querySelector('button')).position : null,
    zIndex: style.zIndex,
    clientRect: {
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right,
    },
    viewport: { w: innerWidth, h: innerHeight },
    scrollY: scrollY,
    transformAncestors: chain,
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();

if (!info.found || info.shellPosition !== 'fixed' || info.clientRect.top > info.viewport.h - 20) {
  process.exit(1);
}
