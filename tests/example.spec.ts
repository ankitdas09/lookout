import { test } from '../core/fixtures';
import { freezeTime } from '../core/utils/stability';
import { fullPageSnapshot, elementSnapshot } from '../core/screenshot';

// Generic example: no app-specific logic or selectors. Navigates to the
// configured base URL and snapshots the page + a universal element (<body>).
// The snapshot helpers stabilize the page (network idle + animations off)
// before capturing.
test('homepage visual snapshot', async ({ page }) => {
  await freezeTime(page); // before navigation
  await page.goto('/');

  await fullPageSnapshot(page, 'homepage-full.png');
  await elementSnapshot(page, 'body', 'homepage-body.png');
});
