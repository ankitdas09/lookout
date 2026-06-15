# VRT — Generic Visual Regression Testing Engine

A standalone, app-agnostic visual regression platform built on
[Playwright Test](https://playwright.dev). Point it at **any** deployed web app
via a base URL — no assumptions about the frontend repo, framework, or routes.

It deliberately leans on Playwright's native `toHaveScreenshot()`, which already
*is* a production-grade VRT engine: pixelmatch diffing, baseline management,
`--update-snapshots`, expected/actual/diff images, an HTML diff-slider report,
and a CI-friendly exit code. This repo adds the thin reusable layer on top —
env-driven config, stability helpers, and an auth placeholder.

## Setup

```bash
npm install
npx playwright install chromium
```

## Run

```bash
APP_NAME=example APP_URL=https://example.com npm run vrt
```

`APP_NAME` labels the baseline set. It is **required** — each app/environment
gets its own baselines under `snapshots/<APP_NAME>/`, so two different targets
can never be compared against each other. Use the same `APP_NAME` over time to
track one app; use different names for different apps/envs:

```bash
APP_NAME=local APP_URL=http://0.0.0.0:5500/index.html npm run vrt   # its own baseline
APP_NAME=prod  APP_URL=https://example.com            npm run vrt   # separate baseline
```

- **First run** for an `APP_NAME` creates its baseline images.
- **Later runs** compare against that baseline; a mismatch fails (non-zero exit).

> Tip: to compare a local build against prod, give them the **same** `APP_NAME`
> on purpose — then localhost is diffed against the prod baseline.

### Update baselines

```bash
APP_NAME=example APP_URL=https://example.com npm run vrt:update
```

### View the diff report

```bash
npm run report
```

(`report` needs no env vars.)

The HTML report shows an expected / actual / diff slider for every mismatch.

## Configuration (all via env)

| Var                  | Default | Purpose                                  |
| -------------------- | ------- | ---------------------------------------- |
| `APP_URL`            | —       | **Required.** Base URL under test.       |
| `APP_NAME`           | —       | **Required.** Baseline set name (folder).|
| `VRT_WIDTH`          | `1280`  | Viewport width.                          |
| `VRT_HEIGHT`         | `720`   | Viewport height.                         |
| `VRT_MAX_DIFF_RATIO` | `0.01`  | Allowed diff pixel ratio (noise budget). |
| `VRT_API_GLOB`       | `**/api/**` | Requests frozen via HAR replay (see below). |
| `VRT_HAR_MODE`       | (on)    | Set to `off` to disable HAR replay.      |

## HAR replay — freeze the data, diff only the UI

The backend can't be relied on to return the same data every run, which would
make screenshots flake on data/text changes you don't care about. So we record
network responses once into a **HAR** and replay them: the screenshot is taken
*during* replay, so the data is identical every time — a diff can only mean a
real **UI** change (layout/CSS/markup), never data churn.

Only requests matching `VRT_API_GLOB` are frozen (default `**/api/**`), so the
app shell loads live while the **data** is pinned. Set `VRT_API_GLOB='**'` to
freeze everything (including the document).

**Record** (do this once, when the data looks right). HAR name = test title:

```bash
APP_NAME=myapp APP_URL=https://myapp.com npm run vrt:record -- "homepage visual snapshot" /
```

This writes `hars/<APP_NAME>/<test-title>.har` (commit it, like a baseline).

**Replay** is automatic — every `npm run vrt` uses the HAR if one exists for the
test. A request matching the glob that isn't in the HAR **aborts** (fails loudly)
rather than silently hitting live data. Re-record to refresh the frozen data.

## Where images live

- **Baselines:** `snapshots/<APP_NAME>/<spec>/...` (commit these).
- **HAR fixtures:** `hars/<APP_NAME>/<test-title>.har` (commit these).
- **Actual + diff (on failure):** `test-results/` (gitignored).
- **Report:** `playwright-report/` (gitignored).

## Adding a test

Create a spec in `tests/`. Use the helpers — they stabilize the page (network
idle + animations off) before capturing:

```ts
import { test } from '../core/fixtures'; // HAR replay auto-wired by test title
import { freezeTime } from '../core/utils/stability';
import { fullPageSnapshot, elementSnapshot } from '../core/screenshot';

test('pricing page', async ({ page }) => {
  await freezeTime(page);          // before navigation
  await page.goto('/pricing');
  await fullPageSnapshot(page, 'pricing-full.png');
  await elementSnapshot(page, 'header', 'pricing-header.png');
});
```

Keep specs app-agnostic where the engine is shared; put app-specific selectors
in that app's own specs.

## Layout

```
core/
  config/      env-driven config (APP_URL, viewport, diff tolerance, api glob)
  fixtures.ts  HAR-replay test fixture (auto-replays data per test)
  screenshot/  fullPageSnapshot / elementSnapshot helpers
  utils/       stability: freezeTime + stabilizePage
  auth/        no-op placeholder (fill in for private apps)
runners/
  record-har.js  records a HAR fixture for one page
tests/         your visual specs
playwright.config.ts   wires config into the Playwright engine
```

## Not in Phase 1

- **Auth** — `core/auth/index.ts` is a no-op; we test public sites first. Fill it
  in (storageState load or form login from env creds) for authenticated apps.
- **Multiple apps** — add Playwright `projects` or per-app config when needed.
- **Custom `snapshots/baseline|actual|diff` tree** — a one-line
  `snapshotPathTemplate` in `playwright.config.ts` if you need that exact layout.
