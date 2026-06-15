// Record HAR fixtures (frozen network data) for pages in the manifest, so VRT
// screenshots always see identical data.
//
// Usage:
//   APP_NAME=myapp npm run vrt:record            # record every page
//   APP_NAME=myapp npm run vrt:record -- pricing # record just one page by name
// APP_URL (optional) overrides the manifest's baseUrl.
// Plain JS so it runs under bare node — no TS build step needed. (ponytail)
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const APP_NAME = process.env.APP_NAME;
const API_GLOB = process.env.VRT_API_GLOB || '**/api/**';
if (!APP_NAME) {
  console.error('APP_NAME is required.');
  process.exit(1);
}

const manifestPath = path.join('targets', `${APP_NAME}.json`);
const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const baseUrl = process.env.APP_URL || m.baseUrl;

const only = process.argv[2];
const pages = only ? m.pages.filter((p) => p.name === only) : m.pages;
if (pages.length === 0) {
  console.error(only ? `No page named "${only}" in ${manifestPath}.` : 'No pages.');
  process.exit(1);
}

// Must match harPathFor() in core/fixtures.ts.
const harPath = (name) =>
  path.join('hars', APP_NAME, `${name.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase()}.har`);

(async () => {
  const browser = await chromium.launch();
  for (const page of pages) {
    const out = harPath(page.name);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const context = await browser.newContext({
      recordHar: { path: out, urlFilter: API_GLOB, mode: 'minimal' },
    });
    const tab = await context.newPage();
    await tab.goto(new URL(page.path, baseUrl).href, { waitUntil: 'networkidle' });
    await context.close(); // flushes the HAR
    console.log(`Recorded ${out} (filter: ${API_GLOB})`);
  }
  await browser.close();
})();
