import { test } from '../core/fixtures'; // HAR replay auto-wired by test title
import { manifest } from '../core/manifest';
import { freezeTime } from '../core/utils/stability';
import { fullPageSnapshot, elementSnapshot } from '../core/screenshot';

// One generic spec drives every page in targets/<APP_NAME>.json. Adding a page
// is a JSON edit, not code. Each viewport runs as a separate Playwright project.
for (const target of manifest.pages) {
  test(target.name, async ({ page }) => {
    await freezeTime(page); // before navigation
    await page.goto(target.path);

    if (target.selector) {
      await elementSnapshot(page, target.selector, `${target.name}.png`, target.mask);
    } else {
      await fullPageSnapshot(page, `${target.name}.png`, target.mask);
    }
  });
}
