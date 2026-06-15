// Record a HAR of network traffic for one page, to be replayed during VRT runs
// so screenshots always see identical data.
//
// Usage: APP_NAME=x APP_URL=https://app.com npm run vrt:record -- "<test title>" <route>
// Defaults match tests/example.spec.ts so `npm run vrt:record` works as-is.
// Plain JS so it runs under bare node — no TS build step needed. (ponytail)
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const APP_URL = process.env.APP_URL;
const APP_NAME = process.env.APP_NAME;
const API_GLOB = process.env.VRT_API_GLOB || '**/api/**';
if (!APP_URL || !APP_NAME) {
  console.error('APP_URL and APP_NAME are required.');
  process.exit(1);
}

const title = process.argv[2] || 'homepage visual snapshot';
const route = process.argv[3] || '/';
const safe = title.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase(); // must match harPathFor()
const harPath = path.join('hars', APP_NAME, `${safe}.har`);
fs.mkdirSync(path.dirname(harPath), { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    recordHar: { path: harPath, urlFilter: API_GLOB, mode: 'minimal' },
  });
  const page = await context.newPage();
  await page.goto(new URL(route, APP_URL).href, { waitUntil: 'networkidle' });
  await context.close(); // flushes the HAR to disk
  await browser.close();
  console.log(`Recorded ${harPath} (filter: ${API_GLOB})`);
})();
