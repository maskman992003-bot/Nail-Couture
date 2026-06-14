import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:5175/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const pageErrors = [];
const consoleErrors = [];

page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);

const chip = page.getByRole('button', { name: /View offer/i });
const count = await chip.count();
const visible = count > 0 ? await chip.first().isVisible() : false;
const text = count > 0 ? await chip.first().innerText() : null;

console.log(JSON.stringify({
  url,
  pageErrors,
  consoleErrors,
  chipCount: count,
  visible,
  text,
}, null, 2));

await browser.close();
process.exit(count > 0 && visible ? 0 : 1);
