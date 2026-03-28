# ver_01_chunk_00_phase_00_foundation_cleanup

> This phase removes all dead code, unused dependencies, debug artifacts, and sets up the Playwright testing infrastructure. It is the first phase because all other phases depend on a clean codebase. No application logic changes occur in this phase — only removal and tooling setup.

---

## 00.1 Purpose

The codebase contains unused files, unused npm dependencies, leftover debug artifacts from the AI Studio prototype, and duplicate config files. These must be cleaned before stabilization work begins so that subsequent phases operate on a clean baseline. Playwright is also set up here so that every future phase can be tested immediately.

---

## 00.2 Scope (IN / OUT)

### IN
- Delete unused source files
- Remove unused npm dependencies
- Remove debug banner and console.log statements
- Remove duplicate ESLint config
- Remove `output: 'standalone'` from next.config.ts
- Rename package in package.json
- Install and configure Playwright
- Write a basic smoke test

### OUT
- Any logic changes to store or components — those are Phase 01 and 02
- Any new features — those are Phase 03
- Any existing feature modifications

---

## 00.3 Deliverables

- [ ] [D00-01] Delete `hooks/use-mobile.ts`
- [ ] [D00-02] Delete `lib/utils.ts`
- [ ] [D00-03] Remove unused dependencies from `package.json`
- [ ] [D00-04] Remove debug banner from `app/page.tsx`
- [ ] [D00-05] Remove all `console.log` statements from source files
- [ ] [D00-06] Delete `.eslintrc.json`
- [ ] [D00-07] Add `no-console` rule to `eslint.config.mjs`
- [ ] [D00-08] Remove `output: 'standalone'` from `next.config.ts`
- [ ] [D00-09] Rename package to `knotess` in `package.json`
- [ ] [D00-10] Add `@reserved` JSDoc to `NodeData.color` and `AppState.theme` in `lib/store.ts`
- [ ] [D00-11] Install and configure Playwright
- [ ] [D00-12] Write Playwright smoke test

---

## 00.4 Implementation Details

### 00.4.1 Delete Unused Files [D00-01, D00-02]

**Agent instructions — do exactly this:**

1. Delete the file `d:\soft\Knotess\hooks\use-mobile.ts`.
2. If the `hooks/` directory is now empty, delete the `hooks/` directory.
3. Delete the file `d:\soft\Knotess\lib\utils.ts`.
4. Do NOT delete `lib/store.ts` — only `lib/utils.ts`.
5. Verify: run `Get-ChildItem -Recurse -Filter "use-mobile*"` from project root. Expect 0 results.
6. Verify: run `Get-ChildItem -Recurse -Filter "utils.ts"` from project root. Expect 0 results in `lib/`.

### 00.4.2 Remove Unused Dependencies [D00-03]

**Agent instructions — run this exact command:**

```powershell
npm uninstall @google/genai @hookform/resolvers firebase-tools autoprefixer
```

After running, open `package.json` and verify these four packages no longer appear in either `dependencies` or `devDependencies`.

### 00.4.3 Remove Debug Banner [D00-04]

**File:** `d:\soft\Knotess\app\page.tsx`

**Find this exact block (lines 9-11) and DELETE it:**
```tsx
      <div className="bg-red-600 text-white text-center py-1 text-xs font-bold uppercase tracking-widest z-50">
        Debug Mode: Changes Reflected
      </div>
```

**After deletion, the return statement should look like:**
```tsx
    <main className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans flex-col">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
```

### 00.4.4 Remove All console.log Statements [D00-05]

**Agent instructions — find and remove these EXACT lines from these EXACT files:**

| File | Line(s) to DELETE |
|------|-------------------|
| `components/Node.tsx` | Line 9: `console.log('Node rendered', id);` |
| `components/Sidebar.tsx` | Line 7: `console.log('Sidebar rendered');` |
| `components/NodeEditor.tsx` | Line 10: `console.log('NodeEditor activeNodeId:', activeNodeId);` |
| `components/Toolbar.tsx` | Line 10: `console.log('New Project button clicked');` |
| `components/Toolbar.tsx` | Line 13: `console.log('Project cleared successfully');` |
| `components/Toolbar.tsx` | Line 20: `console.log('Reset App button clicked');` |
| `app/layout.tsx` | Line 13: `console.log('RootLayout Rendered');` |
| `lib/store.ts` | Line 177: `console.log('Clearing project state...');` |

**After removing, verify:** Run this PowerShell command from project root:
```powershell
Get-ChildItem -Recurse -Include "*.ts","*.tsx" -Exclude "node_modules" | ForEach-Object { Select-String -Pattern "console\.log" -Path $_.FullName }
```
**Expected result:** 0 matches.

### 00.4.5 Delete Legacy ESLint Config [D00-06]

**Agent instructions:**
1. Delete the file `d:\soft\Knotess\.eslintrc.json`.
2. Verify: `Get-ChildItem .eslintrc*` returns 0 results.

### 00.4.6 Add no-console ESLint Rule [D00-07]

**File:** `d:\soft\Knotess\eslint.config.mjs`

Open this file and find the rules configuration. Add the following rule:
```javascript
"no-console": "warn"
```

If the file uses the flat config format with an array of config objects, add a new object or extend an existing one:
```javascript
{
  rules: {
    "no-console": "warn",
  },
}
```

**Note:** Read the file first to understand its current structure before modifying.

### 00.4.7 Remove Standalone Output [D00-08]

**File:** `d:\soft\Knotess\next.config.ts`

**Find and DELETE this exact line:**
```typescript
  output: 'standalone',
```

Leave all other config options in place. The file should still have `reactStrictMode`, `eslint`, `typescript`, `images`, `transpilePackages`, and `webpack` sections.

### 00.4.8 Rename Package [D00-09]

**File:** `d:\soft\Knotess\package.json`

**Find:**
```json
  "name": "ai-studio-applet",
```

**Replace with:**
```json
  "name": "knotess",
```

### 00.4.9 Add @reserved JSDoc Comments [D00-10]

**File:** `d:\soft\Knotess\lib\store.ts`

**Find the `color` field in `NodeData` interface (around line 45):**
```typescript
  color?: string;
```

**Replace with:**
```typescript
  /** @reserved — Will be used for node color customization in a future chunk. */
  color?: string;
```

**Find the `theme` field in `AppState` interface (around line 59):**
```typescript
  theme: string;
```

**Replace with:**
```typescript
  /** @reserved — Will be used for light/dark theme toggling in a future chunk. */
  theme: string;
```

### 00.4.10 Install and Configure Playwright [D00-11]

**Agent instructions — run these EXACT commands in order:**

```powershell
# Step 1: Install Playwright as a dev dependency
npm install -D @playwright/test

# Step 2: Install browser binaries (Chromium only for speed)
npx playwright install chromium
```

**Then create the Playwright config file:**

Create file `d:\soft\Knotess\playwright.config.ts` with this EXACT content:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
```

**Then add test script to package.json:**

In `package.json`, inside the `"scripts"` object, add:
```json
    "test:e2e": "npx playwright test",
    "test:e2e:ui": "npx playwright test --ui"
```

**Then create the e2e test directory:**
```powershell
New-Item -ItemType Directory -Path "d:\soft\Knotess\e2e" -Force
```

**Then add e2e and playwright to .gitignore:**

Append these lines to `d:\soft\Knotess\.gitignore`:
```
# Playwright
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
```

### 00.4.11 Write Playwright Smoke Test [D00-12]

Create file `d:\soft\Knotess\e2e\smoke.spec.ts` with this EXACT content:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Knotess Smoke Tests', () => {
  test('app loads and shows the main layout', async ({ page }) => {
    await page.goto('/');

    // The main element should be visible
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // The sidebar should render with "Explorer" header
    await expect(page.getByText('Explorer')).toBeVisible();

    // The toolbar should render with "Add Node" button
    await expect(page.getByTitle('Add Node')).toBeVisible();

    // A root node should exist on the canvas
    // The default root node has title "Root Node"
    await expect(page.getByText('Root Node')).toBeVisible({ timeout: 10000 });
  });

  test('canvas is interactive (no crash on load)', async ({ page }) => {
    await page.goto('/');

    // Wait for root node to appear
    await expect(page.getByText('Root Node')).toBeVisible({ timeout: 10000 });

    // Verify the canvas background element exists
    const canvasBg = page.locator('#canvas-bg');
    await expect(canvasBg).toBeVisible();
  });
});
```

---

## 00.5 Isolation Requirements

- **Inputs required**: Raw codebase as pulled from git.
- **Outputs produced**: Clean codebase + working Playwright infrastructure.
- **No forward dependencies**: This phase depends on nothing else.

---

## 00.6 Gap Checklist

- [ ] Are all unused files deleted?
- [ ] Are all unused npm dependencies removed?
- [ ] Is the debug banner removed?
- [ ] Are all console.log statements removed?
- [ ] Is the ESLint config clean (single file)?
- [ ] Is Playwright installed and configured?
- [ ] Does `npm run dev` still start without errors?
- [ ] Does the app load in the browser after changes?

---

## 00.7 Gate Checklist

- [ ] `npm run dev` starts without errors
- [ ] `npx playwright test` runs the smoke test and it passes
- [ ] No `console.log` matches found in source code
- [ ] `package.json` has name `knotess` and no unused dependencies

---

## 00.8 Verification Tests

### E2E Tests (Playwright)
- [ ] `smoke.spec.ts` — App loads, sidebar visible, toolbar visible, root node visible

### Manual Verification
- [ ] Run `npm run dev`, open `http://localhost:3000`, confirm app loads without errors
- [ ] Open browser DevTools console, confirm no `console.log` output (only framework logs)

> Test file location: `d:\soft\Knotess\e2e\smoke.spec.ts`

---

## 00.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| smoke.spec.ts — app loads | ⬜ Pending | |
| smoke.spec.ts — canvas interactive | ⬜ Pending | |

---

## 00.10 Completion Criteria

This phase is DONE when:

- [ ] All deliverables [D00-01] through [D00-12] marked `[x]`
- [ ] All gap checklist items answered affirmatively
- [ ] All gate checklist items passing
- [ ] Smoke test passing in Playwright
- [ ] Test results table updated with outcomes

> Proceed to Phase 01 only after all criteria are satisfied.
