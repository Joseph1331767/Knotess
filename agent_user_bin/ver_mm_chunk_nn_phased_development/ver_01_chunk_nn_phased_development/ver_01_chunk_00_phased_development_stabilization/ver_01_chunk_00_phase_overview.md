# Knotess Stabilization — Development Phase Checklist (Abstracts + Purposes)

> ver_01_chunk_00 — Stabilization & Foundation  
> High-level phase map. Each phase has its own detailed `.md` file.

---

## Phase Status

| Phase | Title | Status |
|-------|-------|--------|
| 00 | Foundation & Cleanup | ✅ Complete |
| 01 | Store Stabilization | ✅ Complete |
| 02 | Component Fixes | ✅ Complete |
| 03 | Standard Features | ✅ Complete |
| 04 | E2E Testing & Final Verification | ✅ Complete |

---

## Phase 00 — Foundation & Cleanup
**Purpose:** Remove dead code, unused dependencies, debug artifacts, and set up the Playwright testing infrastructure.
- Delete unused files (`use-mobile.ts`, `utils.ts`)
- Remove unused npm dependencies (`@google/genai`, `@hookform/resolvers`, `firebase-tools`, `autoprefixer`)
- Remove debug banner, all `console.log` statements
- Delete legacy `.eslintrc.json`, add `no-console` ESLint rule
- Remove `output: 'standalone'` from `next.config.ts`
- Rename package to `knotess`
- Install and configure Playwright for e2e testing

**Key outputs:**
- Clean codebase with zero dead code
- Working Playwright infrastructure with a basic smoke test

---

## Phase 01 — Store Stabilization
**Purpose:** Fix all data-layer bugs in `lib/store.ts` — history management, save reliability, data integrity, and cloning.
- Cap undo history at 50 entries
- Add `updateNodeSilent()` method (no history push)
- Debounce IndexedDB writes (300ms trailing) with `beforeunload` flush
- Replace `JSON.parse/stringify` with `structuredClone()`
- Full cleanup in `deleteNode` (tunnelLinks, childrenIds, sisterIds, ports)
- Enforce duplicate prevention at store level
- Add `@reserved` JSDoc to `NodeData.color` and `AppState.theme`

**Key outputs:**
- Store that never leaks memory via undo history
- Store that never leaves dangling references on delete
- Reliable save with debounce + tab-close flush

---

## Phase 02 — Component Fixes
**Purpose:** Fix all memory leaks and bad patterns in React components.
- AbortController pattern for window event listeners in `Node.tsx`
- `clearTimeout` cleanup for `clickTimeoutRef` on unmount
- ResizeObserver for height measurement (replacing render-loop `useEffect`)
- `useRef` camera pattern for wheel listeners in `Canvas.tsx` + `NodeEditor.tsx`
- Move `setActivePageId` into `useEffect` in `NodeEditor.tsx`
- Shared ref map for port positions (replacing DOM queries in `Canvas.tsx`)

**Key outputs:**
- Zero memory leaks on component unmount
- No render loops
- Clean React data flow (no DOM queries in render)

---

## Phase 03 — Standard Features
**Purpose:** Add the minimum standard features expected of a productivity/node-graph editor.
- `useKeyboardShortcuts` hook (Ctrl+Z, Ctrl+S, Delete, Escape, etc.)
- `window.confirm()` for destructive actions (delete node, delete page, clear, reset)
- Auto-save indicator in toolbar (integrates with Phase 01 debounced save)
- Filter-as-you-type node search in sidebar
- React error boundary with "Export Data" fallback
- Bottom-right zoom controls pill (zoom %, +, −, fit-to-view)

**Key outputs:**
- Keyboard-driven workflow
- Safe destructive actions
- Navigable large graphs
- Crash-resilient app with data recovery

---

## Phase 04 — E2E Testing & Final Verification
**Purpose:** Write comprehensive Playwright e2e tests covering all phases, then perform a final verification pass.
- Smoke test: app loads, root node renders
- Node CRUD: create, edit, delete with confirmation
- Keyboard shortcuts: undo, redo, save, delete, escape
- Canvas interactions: pan, zoom, zoom controls pill
- Sidebar: search filtering
- Error boundary: forced error recovery
- Data persistence: save, reload, verify data intact

**Key outputs:**
- Full Playwright test suite covering all stabilization work
- All tests passing
- Verified stable foundation

---

---

## Chunk 00 Completion Status
**CHUNK 00 IS COMPLETE.**
All stabilization phases (00-04) have been executed, verified with a comprehensive E2E test suite (13 total tests passing), and manually checked for performance and stability.

> **Next Step:**
> Proceed to **Chunk 01 — Advanced Node Features** for the next set of architectural and feature enhancements.
