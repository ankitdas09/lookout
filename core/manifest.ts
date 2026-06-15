import fs from 'node:fs';
import path from 'node:path';
import { config } from './config';

// Manifest-driven authoring. Instead of a .spec.ts per page, each app ships a
// targets/<APP_NAME>.json listing its pages. One generic spec loops over it, so
// adding a page is a one-line JSON edit — no code. A new app is a new file.

export interface PageTarget {
  name: string; // unique id → snapshot name, test title, HAR key
  path: string; // route appended to baseUrl, e.g. "/pricing"
  selector?: string; // if set, snapshot this element instead of the full page
  mask?: string[]; // selectors to black out (dynamic regions you don't diff)
}

export interface Manifest {
  baseUrl: string;
  viewports: { width: number; height: number }[];
  pages: PageTarget[];
}

export function loadManifest(appName: string): Manifest {
  const file = path.join('targets', `${appName}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Manifest not found: ${file}. Create it with { "baseUrl", "pages": [...] }.`
    );
  }
  const m = JSON.parse(fs.readFileSync(file, 'utf8'));
  // APP_URL env overrides the manifest's baseUrl (test the same pages against
  // staging vs prod without editing the file).
  const baseUrl = process.env.APP_URL ?? m.baseUrl;
  if (!baseUrl) {
    throw new Error(`baseUrl missing: set it in ${file} or pass APP_URL.`);
  }
  if (!Array.isArray(m.pages) || m.pages.length === 0) {
    throw new Error(`${file} must list at least one page in "pages".`);
  }
  return {
    baseUrl,
    viewports: m.viewports?.length ? m.viewports : [{ width: 1280, height: 720 }],
    pages: m.pages,
  };
}

export const manifest = loadManifest(config.appName);
