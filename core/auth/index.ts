import { BrowserContext } from '@playwright/test';

// ponytail: no-op until we test private apps. Phase 1 targets public sites.
// Wired into the engine now so adding real auth later (storageState load or a
// form-login flow reading creds from env) needs no restructuring — just fill
// this in. Upgrade path: return context.storageState() / perform login here.
export async function applyAuth(
  context: BrowserContext
): Promise<BrowserContext> {
  return context;
}
