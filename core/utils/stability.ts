import { Page } from '@playwright/test';

// Stability utilities. These layer on top of Playwright's native
// `animations: 'disabled'` screenshot option to kill the usual sources of
// flaky visual diffs on real-world sites.

// A fixed wall-clock instant so any `new Date()` / timers in the page render
// deterministically. 2026-01-01T00:00:00Z.
const FIXED_TIME = new Date('2026-01-01T00:00:00Z');

// Must be called BEFORE navigation so the page reads the frozen clock from the
// start. ponytail: best-effort — pages that fetched time server-side won't be
// frozen; that's an app concern, not the engine's.
export async function freezeTime(page: Page): Promise<void> {
  await page.clock.install({ time: FIXED_TIME });
}

// Call AFTER navigation, right before snapshotting.
export async function stabilizePage(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Disable animations/transitions and hide the text caret for steady pixels.
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
      }
    `,
  });
}
