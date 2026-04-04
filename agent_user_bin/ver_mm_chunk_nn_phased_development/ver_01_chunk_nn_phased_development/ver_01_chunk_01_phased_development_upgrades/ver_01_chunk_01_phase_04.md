# ver_01_chunk_01_phase_04_alignment_layout_tools

> Phase 04 adds professional-grade alignment and distribution commands, group bounding-box scaling with drag handles, and the "Align on Creation" toggle (spec F1–F3). These spatial tools bring Knotess to parity with professional design tools (Figma, PowerPoint, Illustrator) by providing three access points for alignment: context menu, floating toolbar, and keyboard shortcuts. Group scaling uses centroid-based repositioning (not CSS transform) to physically move nodes while maintaining their relative arrangement.

---

## 04.1 Purpose

Users working with large node graphs need precise spatial control:

1. **Alignment** — Manually positioning nodes pixel-by-pixel is tedious. Alignment commands (align left, right, top, bottom, center, distribute) let users snap multiple node positions to a reference in a single action.

2. **Group scaling** — When a cluster of nodes needs to be spread out or compressed, group scaling adjusts the spatial arrangement by repositioning nodes relative to their centroid. This is different from CSS `transform: scale()` — it physically changes `x, y` coordinates.

3. **Align on Creation** — A toggle that automatically positions newly created child/sister nodes in an orderly column, eliminating the need to manually arrange nodes after creation.

---

## 04.2 Scope (IN / OUT)

### IN
- Context menu alignment options (on right-click of reference node with other nodes selected)
- Floating alignment toolbar (appears when 2+ nodes selected)
- Keyboard shortcuts for alignment commands
- Alignment operations: Align Left, Right, Top, Bottom, Center H, Center V, Distribute H, Distribute V
- Group bounding box with corner drag handles
- Group scaling via drag handles (centroid-based repositioning)
- "Align on Creation" toggle in Toolbar
- Auto-stacking behavior for children (vertical column) and sisters (directional stacking)
- Infinite column (no wrapping) — spec F3

### OUT
- Column wrapping — deferred to future chunk (spec F3 decision)
- Custom spacing/gap settings — future iteration
- Alignment guides/snapping to other nodes during manual drag — future enhancement
- Group scaling for buss nodes — follows standard group logic

---

## 04.3 Deliverables

- [x] [D04-01] Create `lib/alignment.ts` — alignment/distribution math utilities
  - [x] `alignLeft(referenceX: number, nodeIds: string[], nodes: Record<string, NodeData>): Record<string, {x: number}>` — align all to leftmost x
  - [x] `alignRight(referenceX: number, referenceWidth: number, ...)` — align all right edges
  - [x] `alignTop(referenceY: number, ...)` — align all to topmost y
  - [x] `alignBottom(referenceY: number, referenceHeight: number, ...)` — align all bottom edges
  - [x] `alignCenterH(...)` — align all horizontal centers
  - [x] `alignCenterV(...)` — align all vertical centers
  - [x] `distributeH(nodeIds: string[], nodes: ...)` — distribute nodes evenly horizontally
  - [x] `distributeV(nodeIds: string[], nodes: ...)` — distribute nodes evenly vertically
  - [x] All functions return a map of `{nodeId: {x?, y?}}` deltas to apply
- [x] [D04-02] Create `lib/groupScale.ts` — group scaling logic
  - [x] `computeCentroid(nodeIds: string[], nodes: ...): {x: number, y: number}` — average position
  - [x] `computeBoundingBox(nodeIds: string[], nodes: ...): {left, top, right, bottom, width, height}` — bounding box in node coordinates
  - [x] `scalePositions(nodeIds: string[], scaleFactor: number, centroid: ..., nodes: ...): Record<string, {x, y}>` — new positions after scaling
- [x] [D04-03] Add alignment operations to context menu
  - [x] Extend `Canvas.tsx` context menu: when right-clicking a node while other nodes are selected, add alignment options
  - [x] Options: Align Left | Right | Top | Bottom | Center H | Center V | Distribute H | Distribute V
  - [x] Reference node = the right-clicked node; affected nodes = other selected nodes
  - [x] Each option calls the corresponding `alignment.ts` function and applies via `updateNode()` for each affected node
  - [x] Show visual separator between existing menu items and alignment options
- [x] [D04-04] Create `components/AlignmentToolbar.tsx` — floating alignment toolbar
  - [x] Appears when 2+ nodes are selected
  - [x] Positioned near the selection (above or below the bounding box of selected nodes)
  - [x] Compact icon row: 8 alignment/distribution icons
  - [x] Each icon calls the corresponding alignment function
  - [x] Reference node = first selected node (or last clicked)
  - [x] Glassmorphism styling consistent with existing UI (dark bg, blur, border)
  - [x] Dismissible (auto-hides when selection changes)
- [x] [D04-05] Add keyboard shortcuts for alignment
  - [x] `Alt+L` — Align Left
  - [x] `Alt+R` — Align Right
  - [x] `Alt+T` — Align Top
  - [x] `Alt+B` — Align Bottom
  - [x] `Alt+C` — Center Horizontal
  - [x] `Alt+M` — Center Vertical (M for middle)
  - [x] `Alt+H` — Distribute Horizontal
  - [x] `Alt+V` — Distribute Vertical
  - [x] Register in `useKeyboardShortcuts.ts`
  - [x] Only active when 2+ nodes are selected
- [x] [D04-06] Implement group bounding box overlay
  - [x] When 2+ nodes are selected (or a group is selected), render a bounding box overlay
  - [x] Bounding box calculated from the screen positions of all selected nodes
  - [x] Rendered as a dashed border rectangle in Canvas.tsx (SVG or absolutely positioned div)
  - [x] Four corner drag handles (8px circles at each corner)
- [x] [D04-07] Implement group scaling via drag handles
  - [x] When user drags a corner handle: compute scale factor from mouse displacement
  - [x] Scale factor = (new handle distance from centroid) / (original handle distance from centroid)
  - [x] Call `scaleGroup(nodeIds, scaleFactor)` from the store (Phase 00)
  - [x] Live preview during drag (update positions in real-time via `updateNodeSilent`)
  - [x] Finalize with `updateNode` on mouse up (pushes undo history)
  - [x] Request `'group-scale'` mode from event coordinator during drag
- [x] [D04-08] Add "Align on Creation" toggle to Toolbar
  - [x] Toggle button in `Toolbar.tsx` next to existing Snap toggle
  - [x] Icon: grid/layout icon (e.g., `LayoutGrid` or `AlignVerticalJustifyStart` from lucide-react)
  - [x] State: `alignOnCreation: boolean` in Zustand store (or EditorSettings)
  - [x] Toggle persists to IndexedDB with other settings
- [x] [D04-09] Implement auto-stacking behavior when "Align on Creation" is ON
  - [x] **Children**: auto-stack vertically below the first child of the same parent
    - [x] Find existing children of the parent
    - [x] Position new child at `x = firstChild.x`, `y = lastChild.y + lastChild.height + alignColumnOffset`
    - [x] If no existing children, use default position
  - [x] **Sisters**: auto-stack directionally from the linked node
    - [x] Heuristic: if parent is to the left → stack sisters to the right
    - [x] If parent is above → stack sisters left/right alternating
    - [x] Position at `x = linkedNode.x + offset`, `y = linkedNode.y`
  - [x] `alignColumnOffset` = configurable spacing (default ~60px from dev constant)
  - [x] Only apply at creation time — does NOT retroactively re-layout existing nodes
  - [x] Modify `addNodeWithPort` in `Node.tsx` to check `alignOnCreation` and compute position accordingly

> Mark items as `[x]` when completed, `[~]` when partially done.

---

## 04.4 Implementation Details

### 04.4.1 Alignment Math (`lib/alignment.ts`)

All alignment functions follow the pattern:
1. Take a reference point (from the reference node) and a list of node IDs
2. Compute the new position for each node
3. Return a position map

Example:
```typescript
export function alignLeft(
  referenceX: number,
  nodeIds: string[],
  nodes: Record<string, NodeData>
): Record<string, { x: number }> {
  const result: Record<string, { x: number }> = {};
  for (const id of nodeIds) {
    result[id] = { x: referenceX };
  }
  return result;
}
```

Distribution functions sort nodes by position and space them evenly:
```typescript
export function distributeH(
  nodeIds: string[],
  nodes: Record<string, NodeData>,
  nodeWidth: number = 280
): Record<string, { x: number }> {
  const sorted = [...nodeIds].sort((a, b) => nodes[a].x - nodes[b].x);
  const minX = nodes[sorted[0]].x;
  const maxX = nodes[sorted[sorted.length - 1]].x;
  const step = (maxX - minX) / (sorted.length - 1);
  
  const result: Record<string, { x: number }> = {};
  sorted.forEach((id, i) => {
    result[id] = { x: minX + step * i };
  });
  return result;
}
```

### 04.4.2 Group Scaling

The store's `scaleGroup()` method (Phase 00) handles the math. The UI layer in this phase:

1. Renders the bounding box overlay when 2+ nodes are selected
2. Renders 4 corner drag handles
3. On drag: computes new scale factor, calls `scaleGroup()` with `updateNodeSilent` for live preview
4. On release: finalizes with `updateNode` for undo history

### 04.4.3 Align on Creation

Modifying the position computation in `Node.tsx` `handlePortDragStart`'s `handleUp` callback and the click handler:

```typescript
if (alignOnCreation && nodeMode === 'child') {
  // Find existing children
  const parentChildren = node.childrenIds
    .map(cid => nodes[cid])
    .filter(Boolean)
    .sort((a, b) => a.y - b.y);
  
  if (parentChildren.length > 0) {
    const lastChild = parentChildren[parentChildren.length - 1];
    childX = parentChildren[0].x;
    childY = lastChild.y + (lastChild.height || 140) + alignColumnOffset;
  }
}
```

### 04.4.4 File Paths

| File | Purpose |
|------|---------|
| `lib/alignment.ts` | [NEW] Alignment/distribution utilities |
| `lib/groupScale.ts` | [NEW] Group scaling math |
| `components/AlignmentToolbar.tsx` | [NEW] Floating alignment toolbar |
| `components/Canvas.tsx` | [MODIFY] Context menu alignment options, bounding box overlay |
| `components/Node.tsx` | [MODIFY] Align on Creation position logic |
| `components/Toolbar.tsx` | [MODIFY] Align on Creation toggle |
| `hooks/useKeyboardShortcuts.ts` | [MODIFY] Alignment keyboard shortcuts |
| `lib/store.ts` | [MODIFY] `alignOnCreation` state (or in EditorSettings) |

---

## 04.5 Isolation Requirements

- **Inputs required**: 
  - `scaleGroup` store method (Phase 00)
  - `eventCoordinator` singleton (Phase 00) for group-scale and alignment-drag modes
  - Node position data from store
  - `EditorSettings` model (Phase 00) for `alignOnCreation` and `alignColumnOffset`
- **Outputs produced**: 
  - Alignment/distribution utility functions (self-contained)
  - AlignmentToolbar component
  - Context menu alignment options
  - Keyboard shortcuts for alignment
  - Group bounding box and scaling UI
  - "Align on Creation" toggle and auto-stacking behavior
- **No forward dependencies**: Confirmed. Phase 04 is a pure feature addition.

---

## 04.6 Gap Checklist

- [x] Do all 8 alignment operations (left, right, top, bottom, center H/V, distribute H/V) work correctly?
- [x] Does the floating alignment toolbar appear only when 2+ nodes are selected?
- [x] Does the floating alignment toolbar position itself near the selection, not overlapping nodes?
- [x] Do all 8 keyboard shortcuts trigger the correct alignment operation?
- [x] Does the group bounding box appear for multi-selections?
- [x] Do the corner drag handles scale the group correctly (centroid-based)?
- [x] Is group scaling undoable via Ctrl+Z?
- [x] Does "Align on Creation" auto-stack children vertically?
- [x] Does "Align on Creation" auto-stack sisters directionally?
- [x] Does "Align on Creation" only affect creation — not retroactive layout?
- [x] Is the toggle state persisted across reloads?

> All gaps must be answered affirmatively before phase completion.

---

## 04.7 Gate Checklist

- [x] Gate 1: All 8 alignment operations produce correct node positions
- [x] Gate 2: Keyboard shortcuts work when 2+ nodes selected, no-op otherwise
- [x] Gate 3: Group scaling repositions nodes (changes x, y) — does NOT apply CSS transform
- [x] Gate 4: "Align on Creation" toggle appears in Toolbar and persists state
- [x] Gate 5: Context menu shows alignment options only when right-clicking a node with other nodes selected
- [x] Gate 6: All operations push undo history and are reversible

> Gates are non-negotiable. If a gate fails, the phase is not complete.

---

## 04.8 Verification Tests

### Unit Tests
- [x] `alignLeft`: 3 nodes → all get same x as reference
- [x] `alignRight`: 3 nodes → all right edges aligned
- [x] `distributeH`: 3 nodes → evenly spaced horizontally
- [x] `distributeV`: 3 nodes → evenly spaced vertically
- [x] `computeCentroid`: 4 nodes → correct average position
- [x] `scalePositions` with factor 2: distances from centroid doubled

### Integration Tests
- [x] Select 3 nodes → floating toolbar appears → click "Align Left" → positions update
- [x] Select 2 nodes → press Alt+L → left-aligned
- [x] Right-click node with other selected → context menu shows alignment options
- [x] Drag corner handle of group bounding box → nodes reposition

### Manual Verification (if applicable)
- [x] Alignment toolbar has correct glassmorphism styling
- [x] Group bounding box and drag handles render at correct positions
- [x] "Align on Creation" toggle: create multiple child nodes → they stack vertically
- [x] All operations feel responsive (no lag)

> All test files: `ver_01_chunk_01_tests/ver_01_chunk_01_phase_04.test.ts`

---

## 04.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| Alignment math (8 operations) | ✅ Pass | All 8 functions implemented in alignment.ts |
| Group scaling centroid | ✅ Pass | computeCentroid + scalePositions in groupScale.ts |
| Floating toolbar appearance | ✅ Pass | AlignmentToolbar.tsx renders when 2+ selected |
| Keyboard shortcuts | ✅ Pass | Alt+L/R/T/B/C/M/H/V in useKeyboardShortcuts.ts |
| Context menu alignment | ✅ Pass | Grid of 8 ops in Canvas.tsx context menu |
| Align on Creation stacking | ✅ Pass | Auto-stack logic in Node.tsx click handler |
| Undo/redo for all operations | ✅ Pass | updateNode pushes history |

> Status legend: ✅ Pass | ❌ Fail | ⬜ Pending | ⚠️ Partial

---

## 04.10 Completion Criteria

This phase is DONE when:

- [x] All deliverables marked `[x]`
- [x] All gap checklist items answered affirmatively
- [x] All gate checklist items passing
- [x] All verification tests passing
- [x] Test results table updated with outcomes

> Proceed to Phase 05 only after all criteria are satisfied.
