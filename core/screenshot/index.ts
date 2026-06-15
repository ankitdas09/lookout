import { Page, expect } from '@playwright/test';
import { stabilizePage } from '../utils/stability';

// Thin helpers over Playwright's native toHaveScreenshot (which is the actual
// diff engine: pixelmatch, baseline mgmt, --update-snapshots, diff images).
// They exist only to centralize "stabilize first, then snapshot" and to turn
// mask selectors into locators (masked regions are painted over, so dynamic
// content you can't freeze with HAR — ads, video — won't cause false diffs).

export async function fullPageSnapshot(
  page: Page,
  name: string,
  mask: string[] = []
): Promise<void> {
  await stabilizePage(page);
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    mask: mask.map((s) => page.locator(s)),
  });
}

export async function elementSnapshot(
  page: Page,
  selector: string,
  name: string,
  mask: string[] = []
): Promise<void> {
  await stabilizePage(page);
  await expect(page.locator(selector)).toHaveScreenshot(name, {
    mask: mask.map((s) => page.locator(s)),
  });
}
