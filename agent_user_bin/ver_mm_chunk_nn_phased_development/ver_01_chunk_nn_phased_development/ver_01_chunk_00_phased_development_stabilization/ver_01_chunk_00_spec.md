# ver_01_chunk_00 — Stabilization & Foundation Spec

> **Goal**: Fix all critical memory leaks, bad implementations, and dead code. Add minimum-viable standard features (keyboard shortcuts, confirmations, auto-save, search, error boundaries, zoom controls). Establish a clean, stable foundation for future chunks.

---

## Locked Design Decisions

### Section A: Memory Leak & Event Listener Strategy

**A1. How should window event listeners be managed in Node.tsx drag operations?** → **(a) AbortController pattern**
- Create an AbortController on `pointerdown`, pass `signal` to all `addEventListener` calls, abort on `pointerup` AND on component unmount via `useEffect` cleanup. Clean, modern, one-call cleanup.

**A2. Should the `clickTimeoutRef` cleanup be just a simple unmount guard or a full abort?** → **(a) Simple cleanup**
- `useEffect` return that calls `clearTimeout(clickTimeoutRef.current)`. Minimal change, 3 lines of code.

**A3. What should the undo history cap be?** → **(b) Cap at 50 entries**
- Good balance. ~50 deep clones of a moderate graph is manageable. Can be tuned later.

**A4. How should the wheel event listener re-registration be fixed?** → **(a) useRef for camera**
- Store camera in a ref, read from ref inside handler, empty dependency array `[]`. Eliminates re-registration entirely.

---

### Section B: Bad Implementation Fixes

**B1. How should the height-measurement loop in Node.tsx be resolved?** → **(a) ResizeObserver**
- Observe the node element, only update store when height actually changes. No dependency on `node` state. Clean, performant, modern API.

**B2. How should undo history be managed during drag operations?** → **(a) updateNodeSilent()**
- A new store method that skips `pushHistory()`. Push history once on `pointerdown`, commit on `pointerup`. Explicit, clear semantics.

**B3. How should `setActivePageId` in NodeEditor.tsx be fixed?** → **(a) Move to useEffect**
- Move into a `useEffect` with `[node?.pages, activePageId]` dependencies. Standard React pattern.

**B4. Should `JSON.parse(JSON.stringify(...))` be replaced?** → **(a) Replace with structuredClone()**
- Faster, handles more edge cases, modern standard. Drop-in replacement.

**B5. How should the DOM query for linking lines in Canvas.tsx be fixed?** → **(a) Shared ref map**
- Store port positions in a shared ref/context. Each Node writes its port screen positions to a shared map, Canvas reads from it. A simple `useRef<Map<string, {x,y}>>()` on the Canvas with a context provider.

**B6. Where should duplicate prevention be enforced?** → **(a) Store level + render safety net**
- Guard in every mutation that appends to `childrenIds`/`tunnelLinks`. Keep render-time dedup as safety net with `console.warn`.

**B7. How extensive should tunnel link cleanup in `deleteNode` be?** → **(a) Full cleanup**
- Iterate ALL nodes, remove deleted ID from `tunnelLinks`, `childrenIds`, `sisterIds`, and `ports[].targetNodeId`.

**B8. How should IndexedDB writes be debounced?** → **(a) Trailing debounce (300ms)**
- Save is scheduled 300ms after the last state change. Add a `beforeunload` listener to flush on tab close.

---

### Section C: Dead Code & Cleanup

**C1. Should unused files be deleted or kept?** → **(a) Delete entirely**
- Delete `hooks/use-mobile.ts` and `lib/utils.ts`. Clean tree. Git history preserves them.

**C2. Should `NodeData.color` and `AppState.theme` be removed?** → **(a) Keep with @reserved JSDoc**
- No data migration needed, signals future intent.

**C3. How thorough should console.log removal be?** → **(a) Remove ALL + ESLint rule**
- Remove all `console.log` statements. Add `no-console: warn` ESLint rule.

---

### Section D: Standard Features

**D1. How should keyboard shortcuts be implemented?** → **(b) Dedicated useKeyboardShortcuts hook**
- Handles focus context (don't trigger shortcuts when typing in inputs). Standard approach.

**D2. What confirmation strategy for destructive actions?** → **(a) Native window.confirm()**
- Zero UI work, functional, zero-risk. Custom modal can be added in a later chunk.

**D3. How should auto-save work?** → **(a) Debounced auto-save on state change**
- Integrates with B8 debounced IndexedDB writes. Just needs a visual indicator.

**D4. How should node search work?** → **(a) Filter-as-you-type in sidebar**
- Input at top of sidebar filters the tree to show only matching nodes and their parent chain. Standard pattern.

**D5. What should the error boundary fallback show?** → **(b) Detailed fallback with Export Data button**
- Error message, stack trace in dev, "Export Data" button so users can salvage their IndexedDB data before reloading.

**D6. Where should zoom controls be placed?** → **(a) Bottom-right floating pill**
- Zoom %, +, −, and fit-to-view buttons. Standard convention for canvas apps (Figma, Miro).

---

### Section E: Minor Polish

**E1. Which ESLint config to keep?** → **(a) Keep eslint.config.mjs (flat config)**
- Modern standard, ESLint 9 default. Remove `.eslintrc.json`.

**E2. Should `output: 'standalone'` be removed?** → **(a) Remove**
- Simpler, faster builds. One-line re-add if deployment is needed later.

**E3. Should canvas items get editable URL fields?** → **(b) Defer to later chunk**
- This chunk is about stability, not new canvas item features.

---

## New Types Summary

```typescript
// Addition to store.ts API
interface AppState {
  // Existing...
  
  // NEW: Silent update (no history push) for drag operations
  updateNodeSilent: (id: string, data: Partial<NodeData>) => void;
}
```

---

## Ready for `/create-phase-plan`

**22 of 22 decisions locked.** All decisions resolved. Proceeding to phase planning.
