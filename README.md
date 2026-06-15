# VRT — Generic Visual Regression Testing Engine

A standalone, app-agnostic visual regression platform built on
[Playwright Test](https://playwright.dev). Point it at **any** deployed web app
via a base URL — no assumptions about the frontend repo, framework, or routes.

It deliberately leans on Playwright's native `toHaveScreenshot()`, which already
*is* a production-grade VRT engine: pixelmatch diffing, baseline management,
`--update-snapshots`, expected/actual/diff images, an HTML diff-slider report,
and a CI-friendly exit code. This repo adds the thin reusable layer on top —
a per-app **manifest** of pages, stability helpers, HAR replay, and an auth
placeholder.

## Setup

```bash
npm install
npx playwright install chromium
```

## Define what to test — the manifest

You don't write a test per page. Each app gets a `targets/<APP_NAME>.json` that
lists its pages; one generic spec loops over it. Adding a page = a JSON line.

```jsonc
// targets/example.json
{
  "baseUrl": "https://example.com",
  "viewports": [ { "width": 1280, "height": 720 }, { "width": 375, "height": 667 } ],
  "pages": [
    { "name": "home",    "path": "/" },
    { "name": "pricing", "path": "/pricing", "mask": [".live-counter"] },
    { "name": "nav",     "path": "/", "selector": "header" }
  ]
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `baseUrl` | yes (or `APP_URL`) | Root URL. `APP_URL` env overrides it (prod vs staging). |
| `viewports` | no | Sizes to test each page at. Default `1280x720`. Each runs as a project. |
| `pages[].name` | yes | Unique id → snapshot name, HAR key. |
| `pages[].path` | yes | Route appended to `baseUrl`. |
| `pages[].selector` | no | Snapshot just this element instead of the full page. |
| `pages[].mask` | no | Selectors painted over (dynamic regions you don't want to diff). |

A new app to test = a new `targets/<name>.json`. No code.

## Run

```bash
APP_NAME=example npm run vrt
```

`APP_NAME` selects the manifest **and** labels the baseline set — it is
**required**. Each app/env gets its own baselines under `snapshots/<APP_NAME>/`,
so two different targets can never be compared against each other. `APP_URL`
optionally overrides the manifest's `baseUrl`:

```bash
APP_NAME=example                          npm run vrt   # uses manifest baseUrl
APP_NAME=example APP_URL=http://0.0.0.0:5500 npm run vrt # same pages, local build
```

- **First run** for an `APP_NAME` creates its baseline images.
- **Later runs** compare against that baseline; a mismatch fails (non-zero exit).

> Tip: to compare a local build against prod, give them the **same** `APP_NAME`
> on purpose — then localhost is diffed against the prod baseline.

### Update baselines

```bash
APP_NAME=example npm run vrt:update
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
| `APP_NAME`           | —       | **Required.** Selects `targets/<APP_NAME>.json` + names the baseline set. |
| `APP_URL`            | manifest `baseUrl` | Overrides the manifest's base URL. |
| `VRT_MAX_DIFF_RATIO` | `0.01`  | Allowed diff pixel ratio (noise budget). |
| `VRT_API_GLOB`       | `**/api/**` | Requests frozen via HAR replay (see below). |
| `VRT_HAR_MODE`       | (on)    | Set to `off` to disable HAR replay.      |

(Viewports are set in the manifest, not via env.)

## HAR replay — freeze the data, diff only the UI

The backend can't be relied on to return the same data every run, which would
make screenshots flake on data/text changes you don't care about. So we record
network responses once into a **HAR** and replay them: the screenshot is taken
*during* replay, so the data is identical every time — a diff can only mean a
real **UI** change (layout/CSS/markup), never data churn.

Only requests matching `VRT_API_GLOB` are frozen (default `**/api/**`), so the
app shell loads live while the **data** is pinned. Set `VRT_API_GLOB='**'` to
freeze everything (including the document).

**Record** (do this once, when the data looks right). Reads the manifest and
records each page, keyed by page `name`:

```bash
APP_NAME=myapp npm run vrt:record            # record every page in the manifest
APP_NAME=myapp npm run vrt:record -- pricing # just the "pricing" page
```

This writes `hars/<APP_NAME>/<page-name>.har` (commit it, like a baseline). The
HAR is shared across viewports (same data regardless of size).

**Replay** is automatic — every `npm run vrt` uses the HAR if one exists for the
page. A request matching the glob that isn't in the HAR **aborts** (fails loudly)
rather than silently hitting live data. Re-record to refresh the frozen data.

## Where files live

- **Manifests:** `targets/<APP_NAME>.json` (commit; the list of pages).
- **Baselines:** `snapshots/<APP_NAME>/...` (commit these).
- **HAR fixtures:** `hars/<APP_NAME>/<page-name>.har` (commit these).
- **Actual + diff (on failure):** `test-results/` (gitignored).
- **Report:** `playwright-report/` (gitignored).

## Adding a page

Add one line to `targets/<APP_NAME>.json` — no code:

```jsonc
{ "name": "settings", "path": "/settings", "mask": [".user-avatar"] }
```

Run `npm run vrt` (first run creates its baseline). To capture its frozen data,
`npm run vrt:record -- settings`.

## Layout

```
targets/
  <APP_NAME>.json  the pages to test for each app (you author these)
core/
  config/      env-driven config (appName, diff tolerance, api glob)
  manifest.ts  loads + validates targets/<APP_NAME>.json
  fixtures.ts  HAR-replay test fixture (auto-replays data per page)
  screenshot/  fullPageSnapshot / elementSnapshot helpers
  utils/       stability: freezeTime + stabilizePage
  auth/        no-op placeholder (fill in for private apps)
runners/
  record-har.js  records HAR fixtures from the manifest
tests/
  snapshots.spec.ts  generic spec that loops the manifest (rarely edited)
playwright.config.ts   wires manifest + config into the Playwright engine
```

## Multiple apps

Each app is just another `targets/<name>.json`; switch with `APP_NAME`. Nothing
else changes — same engine, separate baselines/HARs.

## Not in Phase 1

- **Auth** — `core/auth/index.ts` is a no-op; we test public sites first. Fill it
  in (storageState load or form login from env creds) for authenticated apps.
- **Auto-discovery** — a script to seed the manifest from `sitemap.xml`, instead
  of listing pages by hand.
