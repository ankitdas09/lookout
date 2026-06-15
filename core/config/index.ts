// Config-driven execution. Everything app-agnostic comes from env so the same
// engine can point at any deployed web app without code changes.

function required(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new Error(
      `${key} is required, e.g. APP_URL=https://example.com npm run vrt`
    );
  }
  return v;
}

export const config = {
  // Names the baseline set AND selects the manifest (targets/<appName>.json).
  // Required so two different targets can never be compared against each other —
  // each app/env gets its own snapshots/<name>/.
  appName: required('APP_NAME'),
  // Tolerance for noisy pages (anti-aliasing, sub-pixel text). Tune per app.
  maxDiffPixelRatio: Number(process.env.VRT_MAX_DIFF_RATIO ?? 0.01),
  // Which requests to freeze via HAR replay. Default targets API/data calls so
  // the app shell loads live but the *data* is frozen → diffs show real UI
  // changes, not data/text churn. Set to '**' to freeze everything.
  apiGlob: process.env.VRT_API_GLOB ?? '**/api/**',
};
