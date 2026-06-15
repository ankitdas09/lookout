import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config';

// HAR replay. The backend can't be relied on to return the same data every run,
// so we serve recorded network responses from a HAR. The screenshot is taken
// *during* replay → the data is identical every time, so a diff can only mean a
// real UI change (layout/CSS/markup), never data or text churn.
//
// Replay is automatic whenever a HAR exists for the test. Record one with
// `npm run vrt:record`. Disable replay with VRT_HAR_MODE=off.

export function harPathFor(title: string): string {
  const safe = title.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
  return path.join('hars', config.appName, `${safe}.har`);
}

export const test = base.extend({
  // Override the built-in `page` fixture so routing is set up before any goto.
  // Overriding `page` (not `context`) keeps Playwright's trace/video/failure
  // screenshots intact.
  page: async ({ page }, use, testInfo) => {
    const harPath = harPathFor(testInfo.title);
    if (process.env.VRT_HAR_MODE !== 'off' && fs.existsSync(harPath)) {
      // notFound:'abort' → a matching request that ISN'T in the HAR fails loudly
      // instead of silently hitting live (non-deterministic) data.
      await page.routeFromHAR(harPath, {
        url: config.apiGlob,
        notFound: 'abort',
      });
    }
    await use(page);
  },
});

export { expect };
