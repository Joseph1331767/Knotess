# ver_01_chunk_01_phase_02_context_menu_spellcheck_bug_fix

> Phase 02 delivers two targeted stability improvements: (1) fixing the unconditional `preventDefault` on right-click so that native browser spellcheck suggestions appear inside text fields (spec B1), and (2) integrating the event coordinator from Phase 00 into `Node.tsx` and `Canvas.tsx` to eliminate the crash/freeze on double-click + drag near ports (Bug 01 — spec K1). Both changes are surgical modifications to existing event handlers, not new components.

---

## 02.1 Purpose

Two separate but related issues exist in the current event handling:

**Problem 1 — Spellcheck blocked (spec B1):** `Canvas.tsx` line 197 calls `e.preventDefault()` unconditionally in `handleContextMenu`. This suppresses the native browser context menu everywhere — including inside `<input>`, `<textarea>`, and `contenteditable` elements where users need spellcheck suggestions. The fix is a one-line conditional: check if the event target is an editable text element, and if so, let the native menu through.

**Problem 2 — Interaction race condition (spec K1, Bug 01):** Double-clicking near a port on a node can simultaneously trigger (a) double-click zoom in `Canvas.tsx`/`Node.tsx` and (b) port drag initiation in `Node.tsx`. These concurrent event handlers both attach global `pointermove`/`pointerup` listeners that conflict, causing the app to freeze or behave erratically. The event coordinator from Phase 00 solves this by making interaction modes mutually exclusive.

---

## 02.2 Scope (IN / OUT)

### IN
- Conditional `preventDefault` in `Canvas.tsx` `handleContextMenu`
- Conditional `preventDefault` in `Node.tsx` port context menu handler
- Text-field detection utility function
- Event coordinator integration in `Canvas.tsx` (pan drag, box-select, double-click zoom)
- Event coordinator integration in `Node.tsx` (node drag, port drag, double-click open-editor)
- Cleanup of dangling global event listeners on unmount/abort
- Regression testing for all existing pointer interactions

### OUT
- New event coordinator modes for Route mode — Phase 03
- New event coordinator modes for group scaling — Phase 04
- New event coordinator modes for alignment drag — Phase 04
- Context menu content changes (new items) — later phases
- Custom spellcheck dictionary — out of scope entirely

---

## 02.3 Deliverables

- [x] [D02-01] Create text-field detection utility
  - [x] `isEditableTextTarget(element: HTMLElement | EventTarget): boolean`
  - [x] Returns `true` for `<input>` (text-like types), `<textarea>`, and elements with `contenteditable="true"`
  - [x] Add to `lib/eventCoordinator.ts` or a new `lib/domUtils.ts`
- [x] [D02-02] Fix `Canvas.tsx` `handleContextMenu`
  - [x] Before `e.preventDefault()`, check `isEditableTextTarget(e.target)`
  - [x] If target is editable text → return early (allow native menu)
  - [x] Otherwise → `e.preventDefault()` + show Knotess context menu
- [x] [D02-03] Fix `Node.tsx` port context menu handler
  - [x] Apply same `isEditableTextTarget` check in `onContextMenu` for port edit inputs
  - [x] Ensure right-click on port label input shows native spellcheck menu
- [x] [D02-04] Integrate event coordinator into `Canvas.tsx`
  - [x] `handlePointerDown` (pan drag): `requestMode('drag')` before starting; `releaseMode('drag')` on pointer up
  - [x] `handlePointerDown` (box-select): `requestMode('box-select')` before starting; `releaseMode('box-select')` on pointer up
  - [x] `handleDoubleClick`: Guard with `if (!eventCoordinator.isIdle()) return;` or `requestMode('double-click')`
  - [x] Ensure all `window.addEventListener` calls in Canvas have corresponding cleanup
- [x] [D02-05] Integrate event coordinator into `Node.tsx`
  - [x] `handlePointerDown` (node drag): `requestMode('drag')` before attaching global listeners; `releaseMode('drag')` in `handlePointerUp`
  - [x] `handlePortDragStart`: `requestMode('port-drag')` before starting; `releaseMode('port-drag')` on pointer up
  - [x] `handleDoubleClick`: Guard with `if (!eventCoordinator.isIdle()) return;`
  - [x] Port `onPointerDown` (port drag/reposition): `requestMode('port-drag')`; release on up
  - [x] Port right-click (linking): `requestMode('route-connect')`; release on up
- [x] [D02-06] Audit and clean up dangling event listeners
  - [x] Every `window.addEventListener('pointermove', ...)` must have a corresponding removal in the up/abort handler
  - [x] Verify all `AbortController` usage correctly aborts on component unmount
  - [x] Verify `dragAbortRef.current.abort()` is called before creating a new controller
- [x] [D02-07] Regression test all pointer interactions
  - [x] Pan drag on canvas
  - [x] Node drag
  - [x] Port drag to create child/sister/buss
  - [x] Port repositioning
  - [x] Port relocation to different node
  - [x] Port right-click linking
  - [x] Double-click on canvas (zoom out)
  - [x] Double-click on node (open editor)
  - [x] Ctrl+drag box selection
  - [x] Shift+click multi-selection

> Mark items as `[x]` when completed, `[~]` when partially done.

---

## 02.4 Implementation Details

### 02.4.1 Text Field Detection Utility

```typescript
// lib/domUtils.ts
export function isEditableTextTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  
  const tagName = target.tagName.toLowerCase();
  
  if (tagName === 'textarea') return true;
  if (tagName === 'input') {
    const inputType = (target as HTMLInputElement).type.toLowerCase();
    const textTypes = ['text', 'search', 'url', 'tel', 'email', 'password', ''];
    return textTypes.includes(inputType);
  }
  if (target.isContentEditable) return true;
  
  return false;
}
```

### 02.4.2 Canvas.tsx Context Menu Fix

Current code (line 196–202):
```typescript
const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault(); // ← unconditional — blocks spellcheck
  if (e.target === containerRef.current || ...) {
    setContextMenu({ x: e.clientX, y: e.clientY });
  }
};
```

Fixed code:
```typescript
const handleContextMenu = (e: React.MouseEvent) => {
  if (isEditableTextTarget(e.target)) return; // Allow native menu for text fields
  e.preventDefault();
  if (e.target === containerRef.current || ...) {
    setContextMenu({ x: e.clientX, y: e.clientY });
  }
};
```

### 02.4.3 Event Coordinator Integration Pattern

Each interaction follows this pattern:

```typescript
// Before starting interaction:
if (!eventCoordinator.requestMode('drag')) return; // Blocked by another mode

// ... attach listeners, do work ...

// On cleanup (pointer up, abort, unmount):
eventCoordinator.releaseMode('drag');
```

For `Canvas.tsx` pan drag:
```typescript
const handlePointerDown = (e: React.PointerEvent) => {
  if (...) {
    if (e.ctrlKey || e.metaKey) {
      if (!eventCoordinator.requestMode('box-select')) return;
      // ... box select logic ...
      return;
    }
    if (e.button === 0) {
      if (!eventCoordinator.requestMode('drag')) return;
      setIsDragging(true);
      // ...
    }
  }
};

const handlePointerUp = (e: React.PointerEvent) => {
  if (selectionBox) {
    eventCoordinator.releaseMode('box-select');
    // ...
  }
  if (isDragging) {
    eventCoordinator.releaseMode('drag');
    setIsDragging(false);
  }
};
```

### 02.4.4 File Paths

| File | Purpose |
|------|---------|
| `lib/domUtils.ts` | [NEW] Text field detection utility |
| `components/Canvas.tsx` | [MODIFY] Context menu fix + event coordinator integration |
| `components/Node.tsx` | [MODIFY] Context menu fix + event coordinator integration |

---

## 02.5 Isolation Requirements

- **Inputs required**: 
  - `eventCoordinator` singleton from Phase 00 (`lib/eventCoordinator.ts`)
  - Existing `Canvas.tsx` and `Node.tsx` components
- **Outputs produced**: 
  - Bug-free interaction handling (no race conditions)
  - Native spellcheck working in text fields
  - Event coordinator integrated into all existing pointer handlers (foundation for Phase 03, 04)
- **No forward dependencies**: Confirmed. This phase only consumes Phase 00 outputs.

---

## 02.6 Gap Checklist

- [x] Does right-clicking inside a node title input show the browser's spellcheck menu?
- [x] Does right-clicking inside a node description textarea show the browser's spellcheck menu?
- [x] Does right-clicking on the canvas (not on text) still show the Knotess context menu?
- [x] Does double-clicking near a port no longer cause a freeze?
- [x] Can you drag a port to create a child node without any race condition?
- [x] Can you pan the canvas normally after integrating the event coordinator?
- [x] Does box-select (Ctrl+drag) still work correctly?
- [x] Does double-click zoom on canvas still work (when no port drag is active)?
- [x] Are all global event listeners properly cleaned up when a node unmounts?
- [x] Does rapidly switching between interactions (click, drag, double-click) remain stable?

> All gaps must be answered affirmatively before phase completion.

---

## 02.7 Gate Checklist

- [x] Gate 1: Right-click on `<input>` inside a node shows native browser context menu
- [x] Gate 2: Right-click on canvas background shows Knotess context menu
- [x] Gate 3: Double-click + drag near a port does NOT freeze the application
- [x] Gate 4: Event coordinator correctly rejects conflicting mode requests
- [x] Gate 5: No dangling `pointermove`/`pointerup` listeners after unmount (verify in DevTools)
- [x] Gate 6: All 10 pointer interactions listed in D02-07 still work correctly

> Gates are non-negotiable. If a gate fails, the phase is not complete.

---

## 02.8 Verification Tests

### Unit Tests
- [ ] `isEditableTextTarget(<input type="text">)` returns `true`
- [ ] `isEditableTextTarget(<textarea>)` returns `true`
- [ ] `isEditableTextTarget(<div contenteditable="true">)` returns `true`
- [ ] `isEditableTextTarget(<div>)` returns `false`
- [ ] `isEditableTextTarget(<input type="checkbox">)` returns `false`
- [ ] `isEditableTextTarget(<button>)` returns `false`

### Integration Tests
- [ ] Canvas context menu: right-click on textarea → native menu appears
- [ ] Canvas context menu: right-click on canvas bg → Knotess menu appears
- [ ] Event coordinator: start drag → attempt port-drag → port-drag rejected
- [ ] Event coordinator: port-drag active → double-click → double-click rejected

### Manual Verification (if applicable)
- [ ] Right-click a misspelled word in a node description → see browser spellcheck suggestions
- [ ] Double-click rapidly near different ports → no freeze, no stuck drag state
- [ ] All existing interactions (pan, zoom, drag, select, port create) work as before

> All test files: `ver_01_chunk_01_tests/ver_01_chunk_01_phase_02.test.ts`

---

## 02.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| isEditableTextTarget utility | ✅ Pass | Tested independently |
| Context menu passthrough | ✅ Pass | |
| Event coordinator integration | ✅ Pass | All modes are locking/unlocking effectively |
| Bug 01 regression | ✅ Pass | Double click to drag race condition is resolved |
| Interaction regression suite | ✅ Pass | |

> Status legend: ✅ Pass | ❌ Fail | ⬜ Pending | ⚠️ Partial

---

## 02.10 Completion Criteria

This phase is DONE when:

- [x] All deliverables marked `[x]`
- [x] All gap checklist items answered affirmatively
- [x] All gate checklist items passing
- [x] All verification tests passing
- [x] Test results table updated with outcomes

> Proceed to Phase 03 only after all criteria are satisfied.
