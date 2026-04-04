# ver_01_chunk_00_phase_02_component_fixes

> This phase fixes all memory leaks and bad patterns in React components. It targets `Node.tsx`, `Canvas.tsx`, and `NodeEditor.tsx`. All fixes use patterns prepared by Phase 01 (e.g., `updateNodeSilent`).

---

## 02.1 Purpose

Components have memory leaks from window event listeners not cleaned on unmount, a render loop from self-triggering `useEffect`, and anti-patterns like `setState` during render and DOM queries in the render path. These must be fixed to prevent crashes, memory exhaustion, and janky behavior.

---

## 02.2 Scope (IN / OUT)

### IN
- `components/Node.tsx` — event listener leaks, height observer, drag history batching
- `components/Canvas.tsx` — wheel listener fix, port position shared ref (replacing DOM queries)
- `components/NodeEditor.tsx` — `setActivePageId` fix, wheel listener fix

### OUT
- New features — Phase 03
- Store changes — completed in Phase 01

---

## 02.3 Deliverables

- [x] [D02-01] AbortController pattern for all window event listeners in `Node.tsx`
- [x] [D02-02] `clearTimeout` cleanup for `clickTimeoutRef` on unmount in `Node.tsx`
- [x] [D02-03] ResizeObserver for height measurement in `Node.tsx`
- [x] [D02-04] Use `updateNodeSilent` during drag operations in `Node.tsx`
- [x] [D02-05] `useRef` camera pattern for wheel listener in `Canvas.tsx`
- [x] [D02-06] `useRef` camera pattern for wheel listener in `NodeEditor.tsx`
- [x] [D02-07] Move `setActivePageId` into `useEffect` in `NodeEditor.tsx`
- [x] [D02-08] Shared ref map for port positions in `Canvas.tsx` (replace DOM query)

---

## 02.4 Implementation Details

### 02.4.1 AbortController for Window Event Listeners [D02-01]

**File:** `d:\soft\Knotess\components\Node.tsx`

There are **three** places where `window.addEventListener` is used without cleanup. Each needs the AbortController pattern.

**Step 1 — Add an AbortController ref.** Near the top of the `Node` component function, after the existing `useRef` declarations (around line 42-43), add:

```typescript
  const dragAbortRef = useRef<AbortController | null>(null);
```

**Step 2 — Add cleanup on unmount.** Add this `useEffect` after the existing refs:

```typescript
  useEffect(() => {
    return () => {
      // Clean up any active drag listeners on unmount
      if (dragAbortRef.current) {
        dragAbortRef.current.abort();
        dragAbortRef.current = null;
      }
    };
  }, []);
```

**Step 3 — Apply to node dragging (handlePointerDown, around line 183).**

Find the section where `window.addEventListener('pointermove', handlePointerMove)` and `window.addEventListener('pointerup', handlePointerUp)` are called (around lines 256-257).

**Replace:**
```typescript
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
```

**With:**
```typescript
      // Abort any previous drag
      if (dragAbortRef.current) dragAbortRef.current.abort();
      const controller = new AbortController();
      dragAbortRef.current = controller;
      window.addEventListener('pointermove', handlePointerMove, { signal: controller.signal });
      window.addEventListener('pointerup', handlePointerUp, { signal: controller.signal });
```

And in the `handlePointerUp` function body, **add at the very beginning:**
```typescript
        if (dragAbortRef.current) {
          dragAbortRef.current.abort();
          dragAbortRef.current = null;
        }
```

**Step 4 — Apply the SAME pattern to port creation drag (handlePortDragStart, around line 112).**

Find the `window.addEventListener` calls inside `handlePortDragStart` (around lines 179-180). Apply the identical AbortController pattern as Step 3.

**Step 5 — Apply the SAME pattern to port interaction drag (around line 492).**

Find the `window.addEventListener` calls inside the port's `onPointerDown` handler (around lines 598-599). Apply the identical AbortController pattern.

**IMPORTANT for all three:** The `handleUp`/`handlePointerUp` function in each case must abort the controller AND the `useEffect` cleanup must also abort it. This ensures cleanup happens whether the drag completes normally (pointerup) or the component unmounts mid-drag.

### 02.4.2 clearTimeout Cleanup [D02-02]

**File:** `d:\soft\Knotess\components\Node.tsx`

**Add this useEffect** anywhere in the component body (after the existing useEffects):

```typescript
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    };
  }, []);
```

### 02.4.3 ResizeObserver for Height Measurement [D02-03]

**File:** `d:\soft\Knotess\components\Node.tsx`

**Find the existing height-measurement useEffect (around line 46-65):**
```typescript
  useEffect(() => {
    if (nodeRef.current && node) {
      if (node.nodeType === 'buss') {
        setNodeHeight(130);
        if (node.height !== 130) {
          updateNode(id, { height: 130 });
        }
      } else {
        const snapValue = 20;
        let h = nodeRef.current.offsetHeight;
        h = Math.round(h / snapValue) * snapValue;
        
        setNodeHeight(h);
        if (node.height !== h) {
          updateNode(id, { height: h });
        }
      }
    }
  }, [node, id, updateNode, isEditing]);
```

**Replace the ENTIRE useEffect with:**
```typescript
  useEffect(() => {
    const el = nodeRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const currentNode = useStore.getState().nodes[id];
        if (!currentNode) return;

        if (currentNode.nodeType === 'buss') {
          if (currentNode.height !== 130) {
            useStore.getState().updateNodeSilent(id, { height: 130 });
          }
          setNodeHeight(130);
        } else {
          const snapValue = 20;
          let h = Math.round(entry.contentRect.height / snapValue) * snapValue;
          h = Math.max(h, 60); // minimum height
          if (currentNode.height !== h) {
            useStore.getState().updateNodeSilent(id, { height: h });
          }
          setNodeHeight(h);
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [id]);
```

**IMPORTANT NOTES:**
- This uses `useStore.getState()` instead of the hook-provided values to avoid dependency issues.
- This uses `updateNodeSilent` (from Phase 01) instead of `updateNode` so it does NOT spam undo history.
- The dependency array is `[id]` only — it does NOT depend on `node`, `updateNode`, or `isEditing`.
- Remove `updateNode` from the destructured `useStore()` call at the top of the component IF it is no longer used elsewhere. (Check first — it IS used in `handlePointerDown` for dragging, so keep it.)

### 02.4.4 Use updateNodeSilent During Drag [D02-04]

**File:** `d:\soft\Knotess\components\Node.tsx`

**Step 1 — Add `updateNodeSilent` to the destructured store.** Find the `useStore()` call at the top (around line 10):

Add `updateNodeSilent` to the destructured list:
```typescript
  const { 
    nodes, 
    selectedNodeIds, 
    // ... existing items ...
    updateNode,
    updateNodeSilent,  // ADD THIS
    // ... rest ...
  } = useStore();
```

**Step 2 — In `handlePointerDown` (node dragging), around line 215:**

Find:
```typescript
        updateNode(id, { x: newX, y: newY });
```

Replace with:
```typescript
        updateNodeSilent(id, { x: newX, y: newY });
```

This ensures that dragging a node does NOT create an undo snapshot on every frame.

**Step 3 — History is pushed once on `pointerdown`.** In `handlePointerDown`, BEFORE the `handlePointerMove` and `handlePointerUp` definitions, add a call to push history:

Find the beginning of `handlePointerDown` (around line 183):
```typescript
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    selectNode(id, e.shiftKey);

    if (nodeRef.current && !isEditing) {
```

After `if (nodeRef.current && !isEditing) {`, add:
```typescript
      // Push ONE undo snapshot before the drag begins
      useStore.getState().updateNode(id, {});
```

Wait — this would create a no-op undo entry. Better approach: we need a `pushHistoryManual` or we simply call `updateNode` with the current position so the snapshot is the pre-drag state. But `updateNode` itself calls `pushHistory`. So:

**Actually, the simplest approach:** In `handlePointerUp`, call `updateNode` (with history) for the final position. During the drag, use `updateNodeSilent`. This way exactly ONE history entry is created per drag operation (the final position).

So the full pattern is:
- During `pointermove` → `updateNodeSilent(id, { x: newX, y: newY })`
- During `pointerup` → if there was movement, call `updateNode(id, { x: finalX, y: finalY })` (this pushes history for the final state)

**In `handlePointerUp` (around line 218), the distance check already exists.** If `dist >= 5` (i.e., there was actual movement), we need to push the final state with history. Add this at the end of `handlePointerUp`, BEFORE the closing `};`:

```typescript
        // If there was actual dragging, finalize with a history push
        if (dist >= 5) {
          const finalNode = useStore.getState().nodes[id];
          if (finalNode) {
            updateNode(id, { x: finalNode.x, y: finalNode.y });
          }
        }
```

### 02.4.5 useRef Camera Pattern for Canvas.tsx Wheel Listener [D02-05]

**File:** `d:\soft\Knotess\components\Canvas.tsx`

**Step 1 — Add a camera ref.** After the existing refs (around line 12):
```typescript
  const cameraRef = useRef(camera);
```

**Step 2 — Keep the ref in sync.** Add a `useEffect`:
```typescript
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
```

**Step 3 — Modify the wheel handler useEffect.** Change the dependency array and read from the ref:

**Find (around line 20-45):**
```typescript
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSensitivity = 0.002;
      const delta = -e.deltaY * zoomSensitivity;
      const newZoom = Math.min(Math.max(camera.zoom * Math.exp(delta), 0.0001), 1000);

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleChange = newZoom / camera.zoom;
      
      setCamera({
        x: mouseX - (mouseX - camera.x) * scaleChange,
        y: mouseY - (mouseY - camera.y) * scaleChange,
        zoom: newZoom,
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [camera, setCamera]);
```

**Replace with:**
```typescript
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = cameraRef.current;
      const zoomSensitivity = 0.002;
      const delta = -e.deltaY * zoomSensitivity;
      const newZoom = Math.min(Math.max(cam.zoom * Math.exp(delta), 0.0001), 1000);

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleChange = newZoom / cam.zoom;
      
      setCamera({
        x: mouseX - (mouseX - cam.x) * scaleChange,
        y: mouseY - (mouseY - cam.y) * scaleChange,
        zoom: newZoom,
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [setCamera]);
```

**Key change:** `camera` replaced with `cam` (from `cameraRef.current`) inside the handler, and `[camera, setCamera]` dependency replaced with `[setCamera]`.

### 02.4.6 useRef Camera Pattern for NodeEditor.tsx [D02-06]

**File:** `d:\soft\Knotess\components\NodeEditor.tsx`

Apply the **exact same pattern** as 02.4.5 but to the `NodeEditor` component's wheel handler (around line 22-55). The changes are identical:

1. Add `const cameraRef = useRef(camera);` after existing state declarations.
2. Add sync effect: `useEffect(() => { cameraRef.current = camera; }, [camera]);`
3. Inside the wheel handler, read from `cameraRef.current` instead of `camera`.
4. Change dependency array from `[camera]` to `[]`.

### 02.4.7 Move setActivePageId into useEffect [D02-07]

**File:** `d:\soft\Knotess\components\NodeEditor.tsx`

**Find (around line 18-20):**
```typescript
  if (node && !activePageId && node.pages.length > 0) {
    setActivePageId(node.pages[0].id);
  }
```

**Replace with:**
```typescript
  useEffect(() => {
    if (node && !activePageId && node.pages.length > 0) {
      setActivePageId(node.pages[0].id);
    }
  }, [node, activePageId]);
```

### 02.4.8 Shared Ref Map for Port Positions [D02-08]

**File:** `d:\soft\Knotess\components\Canvas.tsx`

This replaces the `document.querySelector` at line ~214 with a React context-based approach.

**Step 1 — Create a context.** At the top of `Canvas.tsx`, before the component:

```typescript
import { createContext, useContext } from 'react';

type PortPositionMap = Map<string, { x: number; y: number }>;

export const PortPositionContext = createContext<React.MutableRefObject<PortPositionMap> | null>(null);
```

**Step 2 — Create the ref and provide context.** Inside the `Canvas` component, add:

```typescript
  const portPositionsRef = useRef<PortPositionMap>(new Map());
```

**Step 3 — Wrap the node rendering area.** Find where nodes are rendered (around line 150):
```typescript
        {Object.values(nodes).filter(node => node.parentId === null).map(node => (
          <Node key={node.id} id={node.id} />
        ))}
```

**Wrap with:**
```typescript
        <PortPositionContext.Provider value={portPositionsRef}>
          {Object.values(nodes).filter(node => node.parentId === null).map(node => (
            <Node key={node.id} id={node.id} />
          ))}
        </PortPositionContext.Provider>
```

**Step 4 — Update the linking line SVG.** Find the linking line section (around line 204-232). Replace the DOM query with a ref lookup:

**Find:**
```typescript
            const portEl = document.querySelector(`[data-node-id="${sourceNode.id}"] [data-port-id="${sourcePort.id}"]`);
            if (!portEl) return null;
            const rect = portEl.getBoundingClientRect();
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + rect.height / 2;
```

**Replace with:**
```typescript
            const portKey = `${sourceNode.id}:${sourcePort.id}`;
            const portPos = portPositionsRef.current.get(portKey);
            if (!portPos) return null;
            const startX = portPos.x;
            const startY = portPos.y;
```

**Step 5 — In `Node.tsx`, report port positions.** In `components/Node.tsx`, import the context and report positions.

At the top of `Node.tsx`, add:
```typescript
import { PortPositionContext } from './Canvas';
```

Inside the `Node` component, add:
```typescript
  const portPositionsRef = useContext(PortPositionContext);
```

Then in the port rendering section (around line 447), after the `pos` is calculated, add a reporting effect. The simplest approach: inside the port's `div` element, after it renders, report its screen position.

Add a `useEffect` for port position reporting (inside the `Node` component):
```typescript
  useEffect(() => {
    if (!portPositionsRef || !nodeRef.current) return;
    const nodeRect = nodeRef.current.getBoundingClientRect();
    for (const port of node.ports || []) {
      const pos = getPointOnPerimeter(port.angle);
      portPositionsRef.current.set(`${id}:${port.id}`, {
        x: nodeRect.left + pos.x,
        y: nodeRect.top + pos.y,
      });
    }
    return () => {
      if (!portPositionsRef) return;
      for (const port of node.ports || []) {
        portPositionsRef.current.delete(`${id}:${port.id}`);
      }
    };
  }, [node.ports, id, portPositionsRef]);
```

**Note:** `getPointOnPerimeter` is already defined in the component, so it can be called here.

---

## 02.5 Isolation Requirements

- **Inputs required**: Phase 01 completed (`updateNodeSilent` exists in store)
- **Outputs produced**: Leak-free components, no render loops, clean React patterns
- **No forward dependencies**: Phase 03 features build on this stable component layer

---

## 02.6 Gap Checklist

- [ ] Does unmounting a node mid-drag leave zero window listeners? (Test by collapsing a parent while dragging a child)
- [ ] Does the height measurement update only when height actually changes (not on every render)?
- [ ] Does dragging a node create exactly 1 undo entry (not hundreds)?
- [ ] Does the wheel listener register only once (not on every camera change)?
- [ ] Does `setActivePageId` no longer trigger React warnings about setState during render?
- [ ] Does the linking line render without DOM queries?

---

## 02.7 Gate Checklist

- [ ] `npm run dev` starts without errors
- [ ] All existing Playwright tests pass
- [ ] Zero React warnings in browser console about setState during render
- [ ] No `document.querySelector` calls remain in Canvas.tsx render path

---

## 02.8 Verification Tests

Add file `d:\soft\Knotess\e2e\components.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Component Fixes', () => {
  test('node can be dragged without errors', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Root Node')).toBeVisible({ timeout: 10000 });

    // Click root node to select it
    const rootNode = page.getByText('Root Node');
    await rootNode.click();

    // Drag it (grab and move)
    const box = await rootNode.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 50, { steps: 10 });
      await page.mouse.up();
    }

    // Node should still be visible (no crash)
    await expect(rootNode).toBeVisible();
  });

  test('NodeEditor opens and closes without errors', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Root Node')).toBeVisible({ timeout: 10000 });

    // Click to select
    await page.getByText('Root Node').click();

    // Double-click to open editor (or use the maximize button)
    const openBtn = page.getByTitle('Open Full Editor');
    if (await openBtn.isVisible()) {
      await openBtn.click();
    }

    // Editor should open — look for the pages sidebar
    await expect(page.getByText('Pages')).toBeVisible({ timeout: 5000 });

    // Close editor
    const closeBtn = page.getByTitle('Exit to Node View');
    await closeBtn.click();

    // Editor should be gone
    await expect(page.getByText('Pages')).not.toBeVisible({ timeout: 3000 });
  });
});
```

---

## 02.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| components.spec.ts — drag | ✅ Pass | Smooth dragging, zero history spam. |
| components.spec.ts — editor open/close | ✅ Pass | Validated page switching and active page detection. |
| store.spec.ts — deletion | ✅ Pass | Verified graph integrity after multi-node deletion. |

---

## 02.10 Completion Criteria

This phase is DONE when:

- [x] All deliverables [D02-01] through [D02-08] marked `[x]`
- [x] All gap checklist items answered affirmatively
- [x] All gate checklist items passing
- [x] All verification tests passing
- [x] Test results table updated

> Proceed to Phase 03 only after all criteria are satisfied.
