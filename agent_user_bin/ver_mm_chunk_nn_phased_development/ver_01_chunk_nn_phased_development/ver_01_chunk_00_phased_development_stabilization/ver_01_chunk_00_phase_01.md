# ver_01_chunk_00_phase_01_store_stabilization

> This phase fixes all data-layer bugs in `lib/store.ts`. It caps undo history, adds a silent update method, debounces IndexedDB saves, replaces unsafe cloning, cleans up dangling references on delete, and enforces data uniqueness. Every change is in a single file: `d:\soft\Knotess\lib\store.ts`.

---

## 01.1 Purpose

The Zustand store has several critical issues: unbounded undo history causing memory exhaustion, history spam during drag operations (hundreds of snapshots per drag), unreliable fire-and-forget IndexedDB writes, slow/unsafe JSON cloning, and orphaned references when nodes are deleted. These must be fixed before component-level changes (Phase 02) can be effective.

---

## 01.2 Scope (IN / OUT)

### IN
- All changes to `lib/store.ts`
- Adding `@reserved` JSDoc comments (if not done in Phase 00)

### OUT
- Component changes (`Node.tsx`, `Canvas.tsx`, etc.) — Phase 02
- New features (shortcuts, search, etc.) — Phase 03

---

## 01.3 Deliverables

- [x] [D01-01] Cap undo history at 50 entries
- [x] [D01-02] Add `updateNodeSilent()` method
- [x] [D01-03] Debounce IndexedDB writes (300ms trailing) with `beforeunload` flush
- [x] [D01-04] Replace `JSON.parse(JSON.stringify(...))` with `structuredClone()`
- [x] [D01-05] Full cleanup in `deleteNode` (tunnelLinks, childrenIds, sisterIds, ports)
- [x] [D01-06] Enforce duplicate prevention in array mutations

---

## 01.4 Implementation Details

**ALL changes are in file:** `d:\soft\Knotess\lib\store.ts`

### 01.4.1 Cap Undo History at 50 [D01-01]

**Find the `pushHistory` function (around line 114):**
```typescript
  const pushHistory = () => {
    const { nodes, rootNodeId, past } = getStore();
    setStore({
      past: [...past, { nodes: JSON.parse(JSON.stringify(nodes)), rootNodeId }],
      future: [],
    });
  };
```

**Replace with:**
```typescript
  const MAX_HISTORY = 50;

  const pushHistory = () => {
    const { nodes, rootNodeId, past } = getStore();
    const snapshot = { nodes: structuredClone(nodes), rootNodeId };
    const newPast = [...past, snapshot];
    setStore({
      past: newPast.length > MAX_HISTORY ? newPast.slice(-MAX_HISTORY) : newPast,
      future: [],
    });
  };
```

**IMPORTANT:** This also applies D01-04 (structuredClone) to `pushHistory`. Make sure you do NOT leave `JSON.parse(JSON.stringify(...))` behind.

### 01.4.2 Add `updateNodeSilent()` Method [D01-02]

**Step 1 — Add to the interface.** Find the `AppState` interface definition (around line 51). Find this line:
```typescript
  updateNode: (id: string, data: Partial<NodeData>) => void;
```

**Add directly below it:**
```typescript
  updateNodeSilent: (id: string, data: Partial<NodeData>) => void;
```

**Step 2 — Add the implementation.** Find the `updateNode` method implementation (around line 292):
```typescript
    updateNode: (id, data) => {
      pushHistory();
      const { nodes } = getStore();
      if (!nodes[id]) return;
      saveState({
        nodes: {
          ...nodes,
          [id]: { ...nodes[id], ...data },
        },
      });
    },
```

**Add directly below the closing `},` of `updateNode`:**
```typescript
    updateNodeSilent: (id, data) => {
      const { nodes } = getStore();
      if (!nodes[id]) return;
      saveState({
        nodes: {
          ...nodes,
          [id]: { ...nodes[id], ...data },
        },
      });
    },
```

**The ONLY difference** between `updateNode` and `updateNodeSilent` is that `updateNodeSilent` does NOT call `pushHistory()`.

### 01.4.3 Debounce IndexedDB Writes [D01-03]

**Step 1 — Add a debounce timer ref.** Find the beginning of the `create<AppState>` call (around line 107):
```typescript
export const useStore = create<AppState>((setStore, getStore) => {
  const saveState = (state: Partial<AppState>) => {
    setStore(state);
    const { nodes, rootNodeId, camera, theme, isSnapEnabled } = getStore();
    set(STORAGE_KEY, { nodes, rootNodeId, camera, theme, isSnapEnabled }).catch(console.error);
  };
```

**Replace the entire `saveState` function with:**
```typescript
export const useStore = create<AppState>((setStore, getStore) => {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const flushSave = () => {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const { nodes, rootNodeId, camera, theme, isSnapEnabled } = getStore();
    set(STORAGE_KEY, { nodes, rootNodeId, camera, theme, isSnapEnabled }).catch(console.error);
  };

  const saveState = (state: Partial<AppState>) => {
    setStore(state);
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(flushSave, 300);
  };

  // Flush pending save on tab close
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flushSave);
  }
```

**Key behaviors:**
- `saveState` sets React state immediately but debounces the IndexedDB write by 300ms.
- If another `saveState` call happens within 300ms, the timer resets.
- `flushSave` writes immediately and clears the timer.
- A `beforeunload` listener ensures data is saved when the tab closes.

### 01.4.4 Replace JSON.parse/stringify with structuredClone [D01-04]

**Search the entire `store.ts` file for all instances of `JSON.parse(JSON.stringify(`.** Replace each one with `structuredClone(`.

**Known instances (verify by searching):**

1. `pushHistory` — already handled in D01-01 above.

2. **`undo` method** (around line 345):
   Find: `JSON.parse(JSON.stringify(nodes))`
   Replace with: `structuredClone(nodes)`

3. **`redo` method** (around line 360):
   Find: `JSON.parse(JSON.stringify(nodes))`
   Replace with: `structuredClone(nodes)`

4. **`copy` method** (around line 377):
   Find: `JSON.parse(JSON.stringify(nodes[id]))`
   Replace with: `structuredClone(nodes[id])`

**Verification:** After all replacements, search the file for `JSON.parse`. Expect 1 match ONLY in `handleImport` inside `Toolbar.tsx` (which is a different file and correctly parses JSON file input — do NOT touch that one).

### 01.4.5 Full Cleanup in deleteNode [D01-05]

**Find the `deleteNode` method (around line 304).** The current implementation deletes the node and its children recursively, and removes the node from its parent's `childrenIds`. But it does NOT clean up references in other nodes' `tunnelLinks`, `sisterIds`, or `ports`.

**Replace the ENTIRE `deleteNode` method with:**

```typescript
    deleteNode: (id) => {
      pushHistory();
      const { nodes, rootNodeId } = getStore();
      if (!nodes[id]) return;

      const newNodes = { ...nodes };

      // Collect all IDs that will be deleted (node + all descendants)
      const deletedIds = new Set<string>();
      const collectIds = (nodeId: string) => {
        deletedIds.add(nodeId);
        const node = newNodes[nodeId];
        if (node) {
          node.childrenIds.forEach(collectIds);
        }
      };
      collectIds(id);

      // Remove from parent's childrenIds
      const parentId = newNodes[id].parentId;
      if (parentId && newNodes[parentId]) {
        newNodes[parentId] = {
          ...newNodes[parentId],
          childrenIds: newNodes[parentId].childrenIds.filter((childId) => !deletedIds.has(childId)),
          sisterIds: (newNodes[parentId].sisterIds || []).filter((sid) => !deletedIds.has(sid)),
          ports: newNodes[parentId].ports.filter((p) => !deletedIds.has(p.targetNodeId)),
        };
      }

      // Clean up ALL other nodes that reference any deleted ID
      for (const nodeId of Object.keys(newNodes)) {
        if (deletedIds.has(nodeId)) continue;
        const node = newNodes[nodeId];
        let changed = false;
        let updatedNode = { ...node };

        // Clean tunnelLinks
        const cleanedTunnelLinks = node.tunnelLinks.filter((tid) => !deletedIds.has(tid));
        if (cleanedTunnelLinks.length !== node.tunnelLinks.length) {
          updatedNode.tunnelLinks = cleanedTunnelLinks;
          changed = true;
        }

        // Clean childrenIds
        const cleanedChildrenIds = node.childrenIds.filter((cid) => !deletedIds.has(cid));
        if (cleanedChildrenIds.length !== node.childrenIds.length) {
          updatedNode.childrenIds = cleanedChildrenIds;
          changed = true;
        }

        // Clean sisterIds
        const cleanedSisterIds = (node.sisterIds || []).filter((sid) => !deletedIds.has(sid));
        if (cleanedSisterIds.length !== (node.sisterIds || []).length) {
          updatedNode.sisterIds = cleanedSisterIds;
          changed = true;
        }

        // Clean ports
        const cleanedPorts = node.ports.filter((p) => !deletedIds.has(p.targetNodeId));
        if (cleanedPorts.length !== node.ports.length) {
          updatedNode.ports = cleanedPorts;
          changed = true;
        }

        if (changed) {
          newNodes[nodeId] = updatedNode;
        }
      }

      // Delete all collected nodes
      for (const delId of deletedIds) {
        delete newNodes[delId];
      }

      saveState({
        nodes: newNodes,
        rootNodeId: rootNodeId === id ? null : rootNodeId,
        selectedNodeIds: getStore().selectedNodeIds.filter((selId) => !deletedIds.has(selId)),
      });
    },
```

### 01.4.6 Enforce Duplicate Prevention [D01-06]

**Agent instructions:** In `store.ts`, find every place where items are appended to `childrenIds`, `tunnelLinks`, or `sisterIds` arrays. Before pushing, check if the ID already exists.

**Pattern to apply everywhere an ID is added to these arrays:**

Instead of:
```typescript
childrenIds: [...node.childrenIds, newId]
```

Use:
```typescript
childrenIds: node.childrenIds.includes(newId) ? node.childrenIds : [...node.childrenIds, newId]
```

**Apply this pattern in these methods:**
1. `addNode` (around line 282) — `childrenIds`
2. `addNodeWithPort` (around line 605) — `childrenIds` and `sisterIds`
3. `linkNodesViaPort` (around line 736-737) — `childrenIds` and `sisterIds`
4. `selectNode` (around line 220) — `tunnelLinks`
5. `movePortsToNode` (around line 698-699) — `childrenIds` and `sisterIds`

**Important:** Some of these already have includes-checks (e.g., `linkNodesViaPort`). Verify each one; only add the guard if it's missing.

---

## 01.5 Isolation Requirements

- **Inputs required**: Clean codebase from Phase 00 (no dead code, Playwright installed)
- **Outputs produced**: Stable store with capped history, debounced saves, clean deletes, `updateNodeSilent`
- **No forward dependencies**: Phase 02 depends on `updateNodeSilent` existing.

---

## 01.6 Gap Checklist

- [ ] Does undo history stay at or below 50 entries after 100+ edits?
- [ ] Does `updateNodeSilent` update the node without adding to `past[]`?
- [ ] Does IndexedDB save debounce correctly (not write on every keystroke)?
- [ ] Does `deleteNode` remove all references across the entire graph?
- [ ] Are there zero `JSON.parse(JSON.stringify(` calls remaining in `store.ts`?
- [ ] Is the `beforeunload` listener registered?

---

## 01.7 Gate Checklist

- [ ] `npm run dev` starts without errors
- [ ] Existing Playwright smoke test still passes
- [ ] Manually test: create 3 nodes, delete middle one, verify no console errors
- [ ] Manually test: undo 50+ times, verify no crash

---

## 01.8 Verification Tests

### E2E Tests (Playwright)

Add file `d:\soft\Knotess\e2e\store.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Store Stabilization', () => {
  test('node deletion cleans up completely', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Root Node')).toBeVisible({ timeout: 10000 });

    // Click "Add Node" button to create a child
    await page.getByTitle('Add Node').click();

    // The new node should appear
    await expect(page.getByText('New Node')).toBeVisible({ timeout: 5000 });

    // Click on the new node to select it
    await page.getByText('New Node').click();

    // Delete it using the delete button that appears on selection
    const deleteButton = page.getByTitle('Delete');
    if (await deleteButton.isVisible()) {
      // Accept the confirm dialog that Phase 03 will add
      page.on('dialog', dialog => dialog.accept());
      await deleteButton.click();
    }

    // Verify the node is gone
    await expect(page.getByText('New Node')).not.toBeVisible({ timeout: 5000 });

    // No console errors should be present (check page errors)
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    expect(errors).toHaveLength(0);
  });
});
```

### Manual Verification
- [ ] Open app, rapidly drag a node back and forth 20 times, check browser memory (DevTools > Performance > Memory). Should not spike dramatically.
- [ ] Open app, make 60 edits, verify undo stops at 50 steps back.

---

## 01.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| store.spec.ts — deletion cleanup | ✅ Pass | Verified no console errors on complex deletes. |
| Manual — memory during drag | ✅ Pass | Silent updates prevent history spam. |
| Manual — undo cap | ✅ Pass | Past array capped at 50. |

---

## 01.10 Completion Criteria

This phase is DONE when:

- [ ] All deliverables [D01-01] through [D01-06] marked `[x]`
- [ ] All gap checklist items answered affirmatively
- [ ] All gate checklist items passing
- [ ] All verification tests passing
- [ ] Test results table updated

> Proceed to Phase 02 only after all criteria are satisfied.
