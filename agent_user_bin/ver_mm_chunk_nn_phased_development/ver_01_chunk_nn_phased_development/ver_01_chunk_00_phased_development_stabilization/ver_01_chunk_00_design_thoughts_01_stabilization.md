# ver_01_chunk_00 — Stabilization & Foundation Design Thoughts

## Title & Overview

**Chunk 00: Codebase Stabilization & Foundation**

This chunk addresses all critical, moderate, and minor issues identified in the deep audit of the Knotess codebase. The goal is to fix memory leaks, eliminate dead code, resolve bad implementations, add missing standard features, and establish a stable foundation for future feature development — without redesigning the existing architecture.

## Context

Knotess is an infinite nested node-graph editor and note-taking tool, originally prototyped in Google AI Studio's online IDE. It has been pulled to a local development environment and needs stabilization before new features can be safely added. The deep audit (`agent_notes_recomendations and observations report.md`) identified **5 memory leaks**, **10 bad implementations**, **8 dead code entries**, **12 missing standard features**, and **6 minor polish items**.

---

## Core Feature Specifications

### A. Memory Leak Fixes

**A1. Window Event Listener Leaks in Node.tsx**
- Three separate places add `pointermove` / `pointerup` listeners to `window` without cleanup on unmount: node dragging (L194), port creation drag (L117), and port interaction drag (L492).
- If the component unmounts mid-drag (node deleted, parent collapsed), these listeners permanently leak.
- **Fix approach**: Wrap each drag operation in a tracked pattern. On component unmount, forcibly remove any active window listeners. Consider using `AbortController` with `signal` for all window event registrations.

**A2. Uncleaned Timeout in Node.tsx**
- `clickTimeoutRef` at L44 is set via `setTimeout` at L560 but never cleared on unmount.
- **Fix approach**: Add a `useEffect` cleanup that clears `clickTimeoutRef.current` on unmount.

**A3. Unbounded Undo/Redo History**
- `past` and `future` arrays in the store grow without limit. Every `updateNode` call (including per-frame drag events) pushes a full deep clone.
- **Fix approach**: Cap `past` at a configurable max (e.g., 50 entries). Slice oldest entries when exceeded.

**A4. Wheel Event Listener Re-registration**
- In both `Canvas.tsx` (L20-45) and `NodeEditor.tsx` (L22-55), the wheel event listener is removed and re-added on every `camera` state change.
- **Fix approach**: Use a `useRef` for the camera state inside the wheel handler, so the `useEffect` dependency array can be empty (`[]`), registering the listener only once.

---

### B. Bad Implementation Fixes

**B1. Height-Measurement Render Loop in Node.tsx**
- `useEffect` at L46-65 reads `offsetHeight`, then calls `updateNode()` which triggers re-render, which re-runs the effect.
- **Fix approach**: Use a `ResizeObserver` to measure height changes. Only call `updateNode` when the measured height actually differs from the stored value. Avoid calling `updateNode` inside a `useEffect` that depends on `node`.

**B2. History Spam During Drag Operations**
- `updateNode` calls `pushHistory()` on every invocation, including during real-time drag (`pointermove`). This creates hundreds of history entries per drag.
- **Fix approach**: Introduce a `updateNodeSilent()` (or a flag) that skips history. Push history only on `pointerdown` (before drag starts) and/or on `pointerup` (when drag ends). Alternatively, debounce history pushes.

**B3. setState During Render in NodeEditor.tsx**
- `setActivePageId` is called directly in the render body at L18-20.
- **Fix approach**: Move into a `useEffect` with `[node, activePageId]` dependencies.

**B4. Deep Cloning via JSON.parse/stringify**
- Used for undo history and clipboard. Slow, breaks on `undefined`, can't handle circular refs.
- **Fix approach**: Replace with `structuredClone()` (available in all modern browsers). It's faster and handles more edge cases.

**B5. DOM Query in Render (Canvas.tsx)**
- `document.querySelector` at L214 queries port elements during render for the linking line SVG.
- **Fix approach**: Store port positions in state/refs rather than querying the DOM.

**B6. Deduplication Band-Aids**
- `Array.from(new Set(node.childrenIds))` and `Array.from(new Set(node.tunnelLinks))` at render time are fixing data integrity bugs at the wrong layer.
- **Fix approach**: Enforce uniqueness at the store level (in `addNodeWithPort`, `linkNodesViaPort`, etc.). Keep render-time dedup as a safety net but log warnings when duplicates are found.

**B7. Orphaned Tunnel Links on Delete**
- `deleteNode` does not clean up `tunnelLinks` in other nodes that reference the deleted node.
- **Fix approach**: In `deleteNode`, iterate all nodes and remove the deleted ID from their `tunnelLinks` arrays.

**B8. Fire-and-Forget IndexedDB Writes**
- `saveState` doesn't await the IndexedDB write. Rapid changes can cause write contention.
- **Fix approach**: Debounce saves (e.g., 500ms trailing) so rapid changes batch into a single write.

---

### C. Dead Code Removal

**C1. Unused Files**
- `hooks/use-mobile.ts` — never imported.
- `lib/utils.ts` — `cn()` never called.
- **Action**: Delete both files.

**C2. Unused Dependencies**
- `@google/genai`, `@hookform/resolvers`, `firebase-tools`, `autoprefixer` — none are imported.
- **Action**: Remove from `package.json`.

**C3. Unused State Fields**
- `NodeData.color` — declared but never used in UI.
- `AppState.theme` — persisted but never consumed.
- **Action**: Keep these fields (they are useful for future features) but document them as "reserved for future use" in a code comment.

**C4. Debug Artifacts**
- "Debug Mode: Changes Reflected" banner in `page.tsx`.
- `console.log` statements scattered across 6 files.
- Package name `ai-studio-applet` in `package.json`.
- **Action**: Remove banner, remove all `console.log`s, rename package to `knotess`.

---

### D. Missing Standard Features

**D1. Keyboard Shortcuts**
- No keyboard shortcut system exists.
- **Minimum set**: `Ctrl+Z` undo, `Ctrl+Shift+Z` / `Ctrl+Y` redo, `Ctrl+S` save, `Ctrl+C/V/X` copy/paste/cut, `Delete` delete selected, `Escape` deselect/cancel.
- **Implementation**: A single `useEffect` on the `Canvas` component with a `keydown` listener.

**D2. Confirmation Dialogs**
- Destructive actions (delete node, delete page, clear project, reset app) lack confirmation.
- **Implementation**: A lightweight modal/dialog component. Could use native `window.confirm()` for simplicity or a styled React modal.

**D3. Auto-Save**
- Currently manual-only.
- **Implementation**: Debounced auto-save on state change (already partially implemented in `saveState`, just needs a debounce wrapper). Visual indicator for save status.

**D4. Search / Filter Nodes**
- No way to find nodes in large graphs.
- **Implementation**: A search input in the sidebar that filters the tree by title match.

**D5. Error Boundaries**
- No error boundaries. A crash in any component white-screens the app.
- **Implementation**: Wrap the main layout in a React error boundary with a fallback UI.

**D6. Zoom Controls UI**
- Zoom is scroll-wheel only. No visual indicator.
- **Implementation**: Zoom percentage display + zoom-in/zoom-out/fit-to-view buttons in the toolbar or canvas corner.

---

### E. Minor Polish

**E1. Dual ESLint Configs**
- Both `.eslintrc.json` and `eslint.config.mjs` exist.
- **Action**: Remove `.eslintrc.json` (the flat config `eslint.config.mjs` is the modern standard).

**E2. Standalone Output Mode**
- `next.config.ts` has `output: 'standalone'` which is for Docker deployments.
- **Action**: Remove for local development (or make it conditional).

**E3. Canvas Item URL Editing**
- Items created with hardcoded placeholder URLs have no URL edit UI.
- **Action**: Add an editable URL field to each canvas item's header or a settings popover.

---

## Architecture / Technical Summary

All fixes in this chunk are **surgical** — they modify existing files in place without changing the component hierarchy or data model. No new data migrations are needed. The store interface remains backward-compatible with existing IndexedDB data.

```
Components affected:
├── lib/store.ts          — undo history cap, save debounce, tunnel cleanup, structuredClone
├── components/Node.tsx   — event listener cleanup, height observer, history batching
├── components/Canvas.tsx — wheel listener fix, keyboard shortcuts, DOM query removal
├── components/NodeEditor.tsx — setState fix, wheel listener fix
├── components/Sidebar.tsx    — search input
├── components/Toolbar.tsx    — zoom controls
├── app/page.tsx          — debug banner removal, error boundary
├── app/layout.tsx        — console.log removal
├── package.json          — dependency cleanup, rename
├── hooks/use-mobile.ts   — DELETE
├── lib/utils.ts          — DELETE
├── .eslintrc.json        — DELETE
```
