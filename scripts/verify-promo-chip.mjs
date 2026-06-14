import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173';

async function countChip(page) {
  return page.locator('[aria-label^="View offer"]').count();
}

async function runScenario(name, setup, url = `${BASE}/`) {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  if (setup) await setup(context, page);

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  const chip = await countChip(page);
  const promoError = await page.locator('text=Promo load error').count();
  const pathname = new URL(page.url()).pathname;

  await browser.close();
  return { name, chip, promoError, pathname, errors };
}

const scenarios = [
  {
    name: 'anonymous home',
    url: `${BASE}/`,
  },
  {
    name: 'about route',
    url: `${BASE}/about`,
  },
  {
    name: 'lookbook route',
    url: `${BASE}/lookbook`,
  },
  {
    name: 'staff logged in on home',
    url: `${BASE}/`,
    setup: async (context) => {
      await context.addInitScript(() => {
        localStorage.setItem('salon_user_data', JSON.stringify({
          id: 'test-staff',
          phone: '+15550001111',
          role: 'super_admin',
          is_staff: true,
          name: 'Test Admin',
        }));
      });
    },
  },
  {
    name: 'dismissed promo in localStorage',
    url: `${BASE}/`,
    setup: async (context) => {
      await context.addInitScript(() => {
        localStorage.setItem('nc_promo_state', JSON.stringify({
          dismissed: { 'fake-id': new Date().toISOString() },
          copied: {},
        }));
      });
    },
  },
];

const results = [];
for (const s of scenarios) {
  results.push(await runScenario(s.name, s.setup, s.url));
}

console.log(JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.chip === 0 && r.promoError === 0);
if (failed.length) {
  console.error('FAIL: no chip in scenarios:', failed.map((r) => r.name).join(', '));
  process.exit(1);
}
