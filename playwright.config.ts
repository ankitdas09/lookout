import { defineConfig, devices } from '@playwright/test';
import { config } from './core/config';
import { manifest } from './core/manifest';

// The VRT engine. Playwright's runner + toHaveScreenshot provide the diffing,
// baseline management, --update-snapshots, expected/actual/diff images, the
// HTML diff-slider report, and the CI exit code. This file wires our env-driven
// config into it.
export default defineConfig({
  testDir: './tests',
  // Baselines are namespaced per app/env: snapshots/<APP_NAME>/... so different
  // targets never compare against each other. actual/diff land in
  // test-results/ automatically. See README.
  snapshotPathTemplate: `snapshots/${config.appName}/{testFileName}/{arg}{-projectName}{-snapshotSuffix}{ext}`,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: manifest.baseUrl,
    // OS-independent rendering so baselines are portable across machines/CI.
    deviceScaleFactor: 1,
  },

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: config.maxDiffPixelRatio,
      animations: 'disabled',
    },
  },

  // One project per viewport from the manifest. Playwright runs every page at
  // every viewport and suffixes baselines with the project name automatically.
  projects: manifest.viewports.map((v) => ({
    name: `${v.width}x${v.height}`,
    use: { ...devices['Desktop Chrome'], viewport: v },
  })),
});
