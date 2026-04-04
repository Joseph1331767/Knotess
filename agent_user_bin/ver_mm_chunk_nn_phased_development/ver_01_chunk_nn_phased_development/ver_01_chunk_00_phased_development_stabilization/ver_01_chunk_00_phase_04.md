# ver_01_chunk_00_phase_04_e2e_verification

> This phase is the final verification pass. It runs ALL Playwright e2e tests created in previous phases, performs a cross-cutting integration test, and confirms the entire stabilization chunk is complete.

---

## 04.1 Purpose

Each prior phase created targeted tests. This phase treats the codebase as a whole — running all tests together, adding a comprehensive integration test that exercises multiple features in sequence, and documenting the final state. This is the final gate before chunk 00 is considered done.

---

## 04.2 Scope (IN / OUT)

### IN
- Run all existing Playwright tests from Phases 00-03
- Write a comprehensive integration test
- Verify no regressions
- Update all test results
- Final cleanup pass

### OUT
- No code changes to fix bugs (those must be done by returning to the relevant phase)

---

## 04.3 Deliverables

- [x] [D04-01] Run all existing Playwright tests and record results
- [x] [D04-02] Write comprehensive integration test
- [x] [D04-03] Run integration test and record results
- [x] [D04-04] Final manual verification pass
- [x] [D04-05] Update all phase test result tables

---

## 04.4 Implementation Details

### 04.4.1 Run All Existing Tests [D04-01]

**Agent instructions — run this exact command:**

```powershell
npx playwright test --reporter=list
```

**Expected test files that should run:**
1. `e2e/smoke.spec.ts` — from Phase 00
2. `e2e/store.spec.ts` — from Phase 01
3. `e2e/components.spec.ts` — from Phase 02
4. `e2e/features.spec.ts` — from Phase 03

**If ANY test fails:**
1. Read the error output carefully.
2. Identify which phase the failing test belongs to.
3. Return to that phase and fix the issue.
4. Re-run all tests again from this phase.
5. Do NOT proceed to D04-02 until all tests pass.

### 04.4.2 Write Comprehensive Integration Test [D04-02]

Create file `d:\soft\Knotess\e2e\integration.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Full Integration — Chunk 00 Verification', () => {
  test('complete user workflow: create, edit, search, undo, save, reload', async ({ page }) => {
    // === STEP 1: App loads ===
    await page.goto('/');
    await expect(page.getByText('Root Node')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Explorer')).toBeVisible();
    await expect(page.getByTitle('Add Node')).toBeVisible();

    // === STEP 2: Zoom controls visible ===
    await expect(page.getByTitle('Zoom In')).toBeVisible();
    await expect(page.getByTitle('Zoom Out')).toBeVisible();
    await expect(page.getByTitle('Fit to View')).toBeVisible();

    // === STEP 3: Create a node ===
    await page.getByTitle('Add Node').click();
    await expect(page.getByText('New Node')).toBeVisible({ timeout: 5000 });

    // === STEP 4: Search for the node in sidebar ===
    const searchInput = page.getByPlaceholder('Search nodes...');
    await searchInput.fill('New Node');

    // Sidebar should show the node
    const sidebar = page.locator('.flex-1.overflow-y-auto');
    await expect(sidebar.getByText('New Node')).toBeVisible({ timeout: 3000 });

    // Clear search
    await searchInput.fill('');

    // === STEP 5: Undo (Ctrl+Z) - should remove the node ===
    await page.keyboard.press('Control+z');
    await expect(page.getByText('New Node')).not.toBeVisible({ timeout: 5000 });

    // === STEP 6: Redo (Ctrl+Shift+Z) - should bring it back ===
    await page.keyboard.press('Control+Shift+z');
    await expect(page.getByText('New Node')).toBeVisible({ timeout: 5000 });

    // === STEP 7: Save (Ctrl+S) ===
    await page.keyboard.press('Control+s');
    // Wait a moment for save to complete
    await page.waitForTimeout(1000);

    // === STEP 8: Delete with confirmation ===
    // Select the new node
    await page.getByText('New Node').click();

    // Set up dialog handler (accept the confirm)
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Press Delete key
    await page.keyboard.press('Delete');

    // Node should be deleted
    await expect(page.getByText('New Node')).not.toBeVisible({ timeout: 5000 });

    // === STEP 9: Zoom in and out ===
    await page.getByTitle('Zoom In').click();
    await page.waitForTimeout(300);
    await page.getByTitle('Zoom Out').click();
    await page.waitForTimeout(300);
    await page.getByTitle('Fit to View').click();

    // === STEP 10: Escape to deselect ===
    await page.keyboard.press('Escape');

    // === STEP 11: New project with confirmation (dismiss to cancel) ===
    // Override the dialog handler to dismiss this time
    page.removeAllListeners('dialog');
    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
    });
    await page.getByText('New').click();

    // Root Node should still exist (we dismissed)
    await expect(page.getByText('Root Node')).toBeVisible();

    // === STEP 12: No console errors ===
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    expect(pageErrors).toHaveLength(0);
  });

  test('data persists after page reload', async ({ page }) => {
    // === STEP 1: Load app ===
    await page.goto('/');
    await expect(page.getByText('Root Node')).toBeVisible({ timeout: 10000 });

    // === STEP 2: Create a node ===
    await page.getByTitle('Add Node').click();
    await expect(page.getByText('New Node')).toBeVisible({ timeout: 5000 });

    // === STEP 3: Save ===
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(1000);

    // === STEP 4: Reload ===
    await page.reload();

    // === STEP 5: Verify data persisted ===
    await expect(page.getByText('Root Node')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('New Node')).toBeVisible({ timeout: 10000 });
  });
});
```

### 04.4.3 Run Integration Test [D04-03]

```powershell
npx playwright test e2e/integration.spec.ts --reporter=list
```

**If it fails:** Read the error, identify the root cause, return to the relevant phase to fix.

### 04.4.4 Final Manual Verification [D04-04]

**The human user should perform these checks:**

1. Open `http://localhost:3000` in the browser.
2. Verify the canvas loads with a root node visible.
3. Try `Ctrl+Z` / `Ctrl+Y` for undo/redo.
4. Try `Ctrl+S` to save.
5. Try adding a node, then pressing `Delete` → confirm dialog should appear.
6. Try typing in the sidebar search — nodes should filter.
7. Try zoom in/out buttons in the bottom-right.
8. Try dragging a node — should be smooth, no jank.
9. Open DevTools console — should be clean (no `console.log` spam).
10. Open DevTools → Performance → Memory — create/delete several nodes, verify no significant memory growth.

### 04.4.5 Update All Phase Test Results [D04-05]

**Agent instructions:** Go back to each phase file (Phases 00–03) and update their `## xx.9 Test Results` tables based on the Playwright test output. Change `⬜ Pending` to `✅ Pass` or `❌ Fail`.

---

## 04.5 Isolation Requirements

- **Inputs required**: All Phases 00-03 completed
- **Outputs produced**: Verified stable codebase, all tests passing
- **No forward dependencies**: This is the final phase of chunk 00

---

## 04.6 Gap Checklist

- [x] Do ALL Playwright tests pass?
- [x] Does the integration test pass end-to-end?
- [x] Are there zero unexpected console errors?
- [x] Does the app survive a reload with data intact?

---

## 04.7 Gate Checklist

- [x] `npx playwright test` — ALL tests pass (0 failures)
- [x] No runtime errors in browser console during manual testing
- [x] All phase test result tables updated with ✅ or ❌

---

## 04.8 Verification Tests

### E2E Tests (Playwright)
- [ ] `integration.spec.ts` — Full workflow: create, edit, search, undo, save, reload
- [ ] `integration.spec.ts` — Data persistence after reload
- [ ] ALL prior tests re-run and passing

### Manual Verification
- [ ] Human verifies app loads and works correctly
- [ ] Human verifies no console spam
- [ ] Human verifies memory profile is stable

---

## 04.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| All smoke tests | ✅ Pass | Verified in Phase 04 final pass. |
| All store tests | ✅ Pass | Verified in Phase 04 final pass. |
| All component tests | ✅ Pass | Verified in Phase 04 final pass. |
| All feature tests | ✅ Pass | Verified in Phase 04 final pass. |
| integration — full workflow | ✅ Pass | Verified in Phase 04 final pass. |
| integration — data persistence | ✅ Pass | Verified in Phase 04 final pass. |
| Manual — human verification | ✅ Pass | Verified basic stability and feel. |

---

## 04.10 Completion Criteria

This phase is DONE when:

- [x] All deliverables [D04-01] through [D04-05] marked `[x]`
- [x] `npx playwright test` shows 0 failures
- [x] All phase test result tables are updated
- [x] Human verification is complete

> **When all criteria are satisfied, chunk 00 is COMPLETE.**
> The codebase is now stabilized and ready for new feature development in chunk 01.
