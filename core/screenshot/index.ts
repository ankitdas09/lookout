import { Page, expect } from '@playwright/test';
import { stabilizePage } from '../utils/stability';

// Thin helpers over Playwright's native toHaveScreenshot (which is the actual
// diff engine: pixelmatch, baseline mgmt, --update-snapshots, diff images).
// They exist only to centralize "stabilize first, then snapshot".

export async function fullPageSnapshot(page: Page, name: string): Promise<void> {
  await stabilizePage(page);
  await expect(page).toHaveScreenshot(name, { fullPage: true });
}

export async function elementSnapshot(
  page: Page,
  selector: string,
  name: string
): Promise<void> {
  await stabilizePage(page);
  await expect(page.locator(selector)).toHaveScreenshot(name);
}
