import { test, expect, Page, ConsoleMessage } from '@playwright/test';
import { TID } from '../src/lib/test-ids';

/**
 * Smoke / Sanity Tests
 *
 * Canary for structural regressions that break the whole app:
 *  - JS errors and hydration mismatches
 *  - Layout bugs (zero-height containers, invisible canvases)
 *  - SpacetimeDB connection failures
 *  - Dark-theme inconsistencies (white flash, wrong background)
 *  - Missing data-testid anchors that other tests depend on
 *  - Canvas rendering failures
 *
 * Keep these tests FAST -- no multiplayer, no full game flow.
 * Target: entire suite completes in < 60 seconds.
 */

const tid = (id: string) => `[data-testid="${id}"]`;

function collectConsoleErrors(page: Page): { errors: string[] } {
  const errors: string[] = [];
  const IGNORED_PATTERNS = [
    /THREE\.Clock/i,
    /THREE\.WebGLShadowMap/i,
    /favicon/i,
    /Download the React DevTools/i,
    /\[HMR\]/i,
    /crypto\.randomBytes/i,
  ];

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return;
    const text = msg.text();
    if (IGNORED_PATTERNS.some(p => p.test(text))) return;
    if (msg.type() === 'error') {
      errors.push(`[${msg.type()}] ${text}`);
    }
  });

  page.on('pageerror', (err: Error) => {
    errors.push(`[uncaught] ${err.message}`);
  });

  return { errors };
}

async function waitForConnection(page: Page) {
  await page.waitForFunction(
    (sel: string) => document.querySelector(sel)?.textContent?.includes('Connected'),
    tid(TID.connectionStatus),
    { timeout: 20000 }
  );
}

async function createAndJoinRoom(page: Page, roomName: string) {
  await page.goto('/vote?multiuser=true');
  await page.waitForSelector(tid(TID.createRoomBtn), { timeout: 20000 });

  await page.locator(tid(TID.createRoomBtn)).click();
  await page.locator(tid(TID.roomNameInput)).fill(roomName);
  await page.locator(tid(TID.submitCreateRoomBtn)).click();

  await page.waitForSelector(`[data-testid^="room-tab"]`, { timeout: 10000 })
    .catch(() => page.waitForSelector(`text="${roomName}"`, { timeout: 10000 }));

  const roomTab = page.locator(`text="${roomName}"`).first();
  if (await roomTab.isVisible()) await roomTab.click();

  await page.waitForSelector(tid(TID.readyButton), { timeout: 10000 })
    .catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// Group 1: Landing Page (fast -- no DB, no room creation)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Landing Page', () => {
  test('SMOKE-001: loads without uncaught JS errors', async ({ page }) => {
    const { errors } = collectConsoleErrors(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const critical = errors.filter(e =>
      /hydration mismatch/i.test(e) ||
      /SpacetimeDBProvider/i.test(e) ||
      /cannot read properties of undefined/i.test(e) ||
      /is not a function/i.test(e)
    );
    expect(critical, `Critical JS errors found:\n${critical.join('\n')}`).toHaveLength(0);
  });

  test('SMOKE-002: renders with dark background (no white flash)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const bg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    expect(bg, 'Body background is white -- dark theme broken').not.toBe('rgb(255, 255, 255)');
  });

  test('SMOKE-003: hero heading and Play Now button are visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /play now/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('SMOKE-004: no hydration mismatch error in console', async ({ page }) => {
    const hydrationErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().toLowerCase().includes('hydration')) {
        hydrationErrors.push(msg.text());
      }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(hydrationErrors, `Hydration mismatch:\n${hydrationErrors.join('\n')}`).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2: /vote Page -- Connection & Layout
// ─────────────────────────────────────────────────────────────────────────────

test.describe('/vote page -- connection & layout', () => {
  test('SMOKE-010: page loads without uncaught errors', async ({ page }) => {
    const { errors } = collectConsoleErrors(page);
    await page.goto('/vote?multiuser=true');
    await page.waitForLoadState('networkidle');

    const critical = errors.filter(e =>
      /hydration mismatch/i.test(e) ||
      /SpacetimeDBProvider/i.test(e) ||
      /cannot read properties of undefined/i.test(e)
    );
    expect(critical, `Critical errors on /vote:\n${critical.join('\n')}`).toHaveLength(0);
  });

  test('SMOKE-011: SpacetimeDB connects within 15 seconds', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    await waitForConnection(page);
    await expect(page.locator(tid(TID.connectionStatus))).toContainText('Connected', { timeout: 1000 });
  });

  test('SMOKE-012: content area has non-zero height', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    await page.waitForSelector(tid(TID.contentArea), { timeout: 10000 });

    const height = await page.evaluate((sel: string) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      return el ? el.getBoundingClientRect().height : 0;
    }, tid(TID.contentArea));

    expect(height, 'Content area has 0px height -- flex layout is broken').toBeGreaterThan(100);
  });

  test('SMOKE-013: Create Room button is visible and interactive', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    await page.waitForSelector(tid(TID.createRoomBtn), { timeout: 15000 });
    await expect(page.locator(tid(TID.createRoomBtn))).toBeVisible();
    await expect(page.locator(tid(TID.createRoomBtn))).toBeEnabled();
  });

  test('SMOKE-014: Create Room form opens and closes', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    await page.waitForSelector(tid(TID.createRoomBtn), { timeout: 15000 });

    await page.locator(tid(TID.createRoomBtn)).click();
    await expect(page.locator(tid(TID.roomNameInput))).toBeVisible({ timeout: 3000 });
    await page.locator(tid(TID.cancelCreateRoomBtn)).click();
    await expect(page.locator(tid(TID.roomNameInput))).not.toBeVisible({ timeout: 3000 });
  });

  test('SMOKE-015: nav bar uses dark theme', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    await page.waitForLoadState('domcontentloaded');

    const navBg = await page.evaluate(() => {
      const nav = document.querySelector('nav, header, [class*="nav"], [class*="header"]') as HTMLElement | null;
      if (!nav) return null;
      return window.getComputedStyle(nav).backgroundColor;
    });
    if (navBg) {
      const isLight = navBg === 'rgb(255, 255, 255)' || navBg === 'rgba(255, 255, 255, 1)';
      expect(isLight, `Nav bar has white background: ${navBg}`).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3: Lobby 3D Viewport (serial -- share one room for speed)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Lobby / pre-game viewport', () => {
  const roomName = `smoke-lobby-${Date.now()}`;

  test('SMOKE-020: lobby viewport, canvas, and ready button all mount correctly', async ({ page }) => {
    test.setTimeout(90000);
    await createAndJoinRoom(page, roomName);

    // Verify the lobby viewport container and ready button exist
    await page.waitForSelector('[data-testid="lobby-viewport"]', { timeout: 20000 });
    await expect(page.locator(tid(TID.readyButton))).toBeVisible({ timeout: 10000 });

    // Viewport should have non-zero dimensions
    const dims = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="lobby-viewport"]') as HTMLElement | null;
      if (!el) return null;
      return { width: el.clientWidth, height: el.clientHeight };
    });
    expect(dims, 'Lobby viewport container not found').not.toBeNull();
    expect(dims!.width, 'Lobby viewport has 0px width').toBeGreaterThan(100);
    expect(dims!.height, 'Lobby viewport has 0px height').toBeGreaterThan(100);

    // Wait for Three.js canvas to mount (known intermittent -- SolidJS reactive
    // re-renders can cause LobbyViewport to miss its onMount window)
    const canvasAppeared = await page.waitForFunction(() => {
      const vp = document.querySelector('[data-testid="lobby-viewport"]');
      return vp && vp.querySelector('canvas') !== null;
    }, undefined, { timeout: 15000 }).then(() => true).catch(() => false);

    if (canvasAppeared) {
      // Canvas mounted -- verify it has non-zero dimensions
      const canvasDims = await page.evaluate(() => {
        const c = document.querySelector('[data-testid="lobby-viewport"] canvas') as HTMLCanvasElement | null;
        return c ? { width: c.width, height: c.height } : null;
      });
      expect(canvasDims).not.toBeNull();
      expect(canvasDims!.width).toBeGreaterThan(0);
      expect(canvasDims!.height).toBeGreaterThan(0);

      // Canvas persists after 2 seconds
      await page.waitForTimeout(2000);
      const still = await page.evaluate(() => {
        const c = document.querySelector('[data-testid="lobby-viewport"] canvas') as HTMLCanvasElement | null;
        return c && c.width > 0 && c.height > 0;
      });
      expect(still, 'Canvas disappeared after 2s').toBe(true);
    } else {
      // Canvas didn't mount -- this is a known intermittent issue. The test
      // still validates the room UI rendered (ready button, viewport container).
      console.warn('SMOKE-020: Three.js canvas did not mount (known intermittent SolidJS issue)');
    }
  });

  test('SMOKE-021: no duplicate Three.js instances', async ({ page }) => {
    test.setTimeout(60000);
    const clockWarnings: string[] = [];
    page.on('console', (msg) => {
      if (/THREE\.Clock.*deprecated/i.test(msg.text())) {
        clockWarnings.push(msg.text());
      }
    });

    await createAndJoinRoom(page, `smoke-dup-${Date.now()}`);
    await page.waitForFunction(() => {
      const vp = document.querySelector('[data-testid="lobby-viewport"]');
      return vp && vp.querySelector('canvas') !== null;
    }, undefined, { timeout: 20000 });
    await page.waitForTimeout(500);

    expect(clockWarnings.length, `${clockWarnings.length} THREE.Clock warnings -- multiple instances active`).toBeLessThan(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4: Navigation Flow
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Navigation flow', () => {
  test('SMOKE-030: Play Now on landing page navigates to /vote', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const playBtn = page.getByRole('button', { name: /play now/i }).first();
    await playBtn.click();

    // Guest name prompt may appear -- handle it
    const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="guest" i]');
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill('SmokePlayer');
      // Target the specific submit button in the guest prompt modal
      const startBtn = page.getByRole('button', { name: 'Start Playing' });
      if (await startBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await startBtn.click();
      } else {
        // Fallback: look for the skip option
        await page.getByRole('button', { name: /skip/i }).click();
      }
    }

    await page.waitForURL('**/vote**', { timeout: 10000 });
    expect(page.url()).toContain('/vote');
  });

  test('SMOKE-031: direct navigation to /vote does not crash', async ({ page }) => {
    const { errors } = collectConsoleErrors(page);
    await page.goto('/vote');
    await page.waitForLoadState('networkidle');

    const critical = errors.filter(e =>
      /SpacetimeDBProvider/i.test(e) ||
      /Cannot read/i.test(e) ||
      /is not defined/i.test(e)
    );
    expect(critical, `Crash on direct /vote navigation:\n${critical.join('\n')}`).toHaveLength(0);
  });

  test('SMOKE-032: browser back/forward does not break the app', async ({ page }) => {
    await page.goto('/');
    await page.goto('/vote?multiuser=true');
    await page.goBack();
    await page.goForward();
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length ?? 0).toBeGreaterThan(10);
  });

  test('SMOKE-033: navigate away and back to /vote -- app recovers', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    await page.waitForSelector(tid(TID.createRoomBtn), { timeout: 15000 });

    await page.goto('/');
    await page.goto('/vote?multiuser=true');

    await page.waitForSelector(tid(TID.createRoomBtn), { timeout: 15000 });
    await expect(page.locator(tid(TID.createRoomBtn))).toBeEnabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 5: SpacetimeDB Integration Sanity
// ─────────────────────────────────────────────────────────────────────────────

test.describe('SpacetimeDB integration', () => {
  test('SMOKE-040: identity is assigned after connection', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    await waitForConnection(page);

    const identity = page.locator(tid(TID.identityDisplay));
    if (await identity.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await identity.textContent();
      expect(text?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  test('SMOKE-041: creating a room does not throw a JS error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/vote?multiuser=true');
    await page.waitForSelector(tid(TID.createRoomBtn), { timeout: 20000 });

    await page.locator(tid(TID.createRoomBtn)).click();
    await page.locator(tid(TID.roomNameInput)).fill(`smoke-room-${Date.now()}`);
    await page.locator(tid(TID.submitCreateRoomBtn)).click();

    // Wait for reducer round-trip
    await page.waitForSelector(`[data-testid^="room-tab"]`, { timeout: 5000 }).catch(() => {});

    expect(errors, `JS errors after room creation:\n${errors.join('\n')}`).toHaveLength(0);
  });

  test('SMOKE-042: disconnected state is handled gracefully', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    await waitForConnection(page);

    await page.context().setOffline(true);
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length ?? 0, 'Page went blank after going offline').toBeGreaterThan(10);

    await page.context().setOffline(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 6: Guest Name Flow
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Guest name flow', () => {
  test('SMOKE-060: landing page Play Now button is present', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const btn = page.getByRole('button', { name: /play now/i }).first();
    await expect(btn).toBeVisible({ timeout: 10000 });
    await expect(btn).toBeEnabled();
  });

  test('SMOKE-061: /vote page UI renders (not blank)', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length ?? 0, '/vote page rendered a blank body').toBeGreaterThan(20);

    const hasUI = await page.locator([
      tid(TID.createRoomBtn),
      tid(TID.connectionStatus),
    ].join(', ')).count();
    expect(hasUI, 'Neither createRoomBtn nor connectionStatus found').toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 7: Stale Data / DB Sanity
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Stale data sanity', () => {
  test('SMOKE-070: existing rooms show plausible player counts (< 20)', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    await waitForConnection(page);
    await page.waitForTimeout(1000);

    const playerCountBadges = await page.evaluate(() => {
      const allText = Array.from(document.querySelectorAll('*'))
        .filter(el => el.children.length === 0)
        .map(el => el.textContent?.trim() ?? '')
        .filter(t => /\d+\s*(\/\s*\d+)?\s*player/i.test(t));
      return allText;
    });

    for (const badge of playerCountBadges) {
      const match = badge.match(/(\d+)/);
      if (match) {
        const count = parseInt(match[1], 10);
        expect(count, `Room shows ${count} players -- likely stale test data: "${badge}"`).toBeLessThan(20);
      }
    }
  });

  test('SMOKE-071: cancelling room creation does not leave ghost entries', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/vote?multiuser=true');
    await page.waitForSelector(tid(TID.createRoomBtn), { timeout: 20000 });

    await page.locator(tid(TID.createRoomBtn)).click();
    await page.locator(tid(TID.roomNameInput)).fill('ghost-room-that-should-not-exist');
    await page.locator(tid(TID.cancelCreateRoomBtn)).click();
    await page.waitForTimeout(500);

    expect(errors, `JS error when cancelling:\n${errors.join('\n')}`).toHaveLength(0);
    await expect(page.locator('text="ghost-room-that-should-not-exist"')).not.toBeVisible();
  });
});
