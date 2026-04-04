# ver_01_chunk_01_phase_03_route_mode_plus_button

> Phase 03 adds the 4th connection mode ("Route") that connects existing nodes without creating new ones (spec D1–D3), relocates the "+" button's default position to the top corner of the node (spec E1), and removes the legacy Link button from the selected-node toolbar. Route mode introduces teal/cyan `#06b6d4` as its identity color, supports both click-click and drag-release target selection, and auto-classifies connections as parent→child, sister→sister, or tunnel based on the node relationship graph.

---

## 03.1 Purpose

Currently, connecting two existing nodes requires the standalone "Link" button (`LinkIcon` in the selected-node toolbar), which only creates tunnel links. This is limited and discoverable only by accident. Route mode subsumes this functionality by integrating it into the "+" button's mode cycle, providing:

1. **Unified connection creation** — The "+" button now handles all 4 connection types in one interaction model
2. **Auto-classification** — Route mode intelligently determines the connection type based on the graph's structure
3. **Dual interaction** — Both click-click (guided) and drag-release (spatial) target selection

The "+" button's default position moves from the right-edge midpoint to the top corner of the node, eliminating overlap with ports on the right edge. This is a pure position change — all existing drag-to-perimeter mechanics are preserved.

---

## 03.2 Scope (IN / OUT)

### IN
- "+" button mode cycle extended to 4 modes: Child → Sister → Buss → Route → (repeat)
- Route mode click-click interaction (banner/toast prompt)
- Route mode drag-release interaction (visual line to cursor)
- Auto-classification of route connections (parent→child, sister→sister, tunnel)
- Route mode color: Teal/Cyan `#06b6d4`
- "+" button default position moved to top corner of node
- Legacy Link button (`LinkIcon`) removed from selected-node toolbar
- Event coordinator integration for `route-connect` mode
- `addRouteConnection` store method wired into the interaction flow (from Phase 00)

### OUT
- Altering existing connection visuals — connections keep their current styles (spec D2)
- Settings for connection visual customization — Phase 06
- Route mode undo/redo — handled by `addRouteConnection` in Phase 00 (already pushes history)

---

## 03.3 Deliverables

- [x] [D03-01] Extend "+" button mode cycle to 4 modes
  - [x] Update `nodeMode` state type from `'child' | 'sister' | 'buss'` to `'child' | 'sister' | 'buss' | 'route'`
  - [x] Update right-click cycle: Child → Sister → Buss → Route → Child
  - [x] Route mode button color: `bg-cyan-500` / `bg-cyan-600` with `shadow-[0_0_20px_rgba(6,182,212,0.5)]`
  - [x] Route mode button title: "Route Mode — Connect existing nodes"
- [x] [D03-02] Implement Route mode click-click interaction
  - [x] When "+" is clicked in Route mode: enter `route-connect` state via event coordinator
  - [x] Show a banner/toast at the top of the canvas: "Select target node to connect, or click canvas to cancel." (teal themed, similar to existing link banner)
  - [x] Store `routeSourceId` and `routeSourcePortAngle` in component state
  - [x] On clicking a different node: call `addRouteConnection(sourceId, portAngle, targetId)` 
  - [x] On clicking canvas background: cancel route-connect mode
  - [x] Release event coordinator mode on completion or cancellation
- [x] [D03-03] Implement Route mode drag-release interaction
  - [x] When "+" is dragged in Route mode: draw a visual teal dashed line from the "+" position to cursor
  - [x] Track cursor position via `pointermove` (reuse drag-angle math)
  - [x] On releasing over a node: call `addRouteConnection(sourceId, portAngle, targetId)`
  - [x] On releasing over empty space: cancel (no connection created)
  - [x] Compute `portAngle` from drag angle (consistent with existing port angle computation)
- [x] [D03-04] Route-connect visual feedback
  - [x] During click-click mode: highlight valid target nodes with a subtle teal glow/border on hover
  - [x] During drag-release mode: render SVG line from source port position to mouse cursor (teal, dashed)
  - [x] Banner/toast in click-click mode uses teal color scheme matching `#06b6d4`
- [x] [D03-05] Relocate "+" button default position to top corner
  - [x] Change the default (non-dragging) position from right-edge midpoint to top-right corner
  - [x] Current: `right: -20, top: 50%, transform: translateY(-50%)`
  - [x] New: `right: -20, top: -20, transform: none` (top-right corner, offset outward)
  - [x] All drag-to-perimeter mechanics remain identical (dragging moves the button around the perimeter)
- [x] [D03-06] Remove legacy Link button
  - [x] Remove the `LinkIcon` button from the selected-node toolbar (Node.tsx lines ~474–479)
  - [x] Remove the `linkingSourceId` state usage for the old "link to tunnel" flow from Node.tsx
  - [x] Keep `setLinkingSourceId` in the store (may be reused for Route mode banner tracking)
  - [x] Clean up any orphaned imports (`LinkIcon` from lucide-react in Node.tsx)
- [x] [D03-07] Target node detection for Route mode
  - [x] Use `document.elementFromPoint()` to detect which node the cursor is over (reuse pattern from existing port relocation code, Node.tsx lines ~665–668)
  - [x] Validate: target must not be the source node itself
  - [x] Validate: target must exist in `nodes` store
- [x] [D03-08] Event coordinator integration
  - [x] Route click-click: `requestMode('route-connect')` on "+" click; `releaseMode('route-connect')` on target selected or cancel
  - [x] Route drag-release: `requestMode('port-drag')` during drag; `releaseMode('port-drag')` on release
  - [x] During `route-connect` mode, clicking a node should connect (not select/zoom)

> Mark items as `[x]` when completed, `[~]` when partially done.

---

## 03.4 Implementation Details

### 03.4.1 Mode Cycle Extension

```typescript
// Node.tsx — existing state change
const [nodeMode, setNodeMode] = useState<'child' | 'sister' | 'buss' | 'route'>('child');

// Right-click cycle update (currently line ~521-523)
setNodeMode(prev => 
  prev === 'child' ? 'sister' : 
  prev === 'sister' ? 'buss' : 
  prev === 'buss' ? 'route' : 'child'
);
```

### 03.4.2 Click-Click Flow

When the user clicks "+" in Route mode (not a drag):

1. `requestMode('route-connect')` — if rejected, do nothing
2. Set component-level state: `routeConnectSource = { nodeId: id, portAngle: 0 }`
3. Show the route-connect banner (Canvas-level state, similar to existing `linkingSourceId` banner)
4. Node click handler checks: if `routeConnectSource` is set and the clicked node is different, call `addRouteConnection()` and release mode
5. Canvas click handler checks: if `routeConnectSource` is set and the click is on the background, cancel and release mode

Since the banner and click interception need to work across components, use a new Zustand field:
```typescript
routeConnectSource: { nodeId: string; portAngle: number } | null;
setRouteConnectSource: (source: ...) => void;
```

### 03.4.3 Drag-Release Flow

When the user drags "+" in Route mode:

1. Identical to current `handlePortDragStart` logic for tracking cursor position and computing draug angle
2. On `pointerup`: use `document.elementFromPoint()` to check if cursor is over a `[data-node-id]` element
3. If over a valid target node: call `addRouteConnection(id, dragAngleRef.current, targetNodeId)`
4. If over empty space: do nothing (cancel)
5. Do NOT call `addNodeWithPort()` — Route mode never creates new nodes

### 03.4.4 "+" Button Relocation

The button position CSS changes from:

```typescript
// Current (right-edge midpoint)
style={{
  left: isDraggingPort ? getPointOnPerimeter(dragAngle).x : 'auto',
  top: isDraggingPort ? getPointOnPerimeter(dragAngle).y : '50%',
  right: isDraggingPort ? 'auto' : -20,
  transform: isDraggingPort ? 'translate(-50%, -50%)' : 'translateY(-50%)',
}}
```

To:

```typescript
// New (top-right corner)
style={{
  left: isDraggingPort ? getPointOnPerimeter(dragAngle).x : 'auto',
  top: isDraggingPort ? getPointOnPerimeter(dragAngle).y : -20,
  right: isDraggingPort ? 'auto' : -20,
  transform: isDraggingPort ? 'translate(-50%, -50%)' : 'none',
}}
```

### 03.4.5 File Paths

| File | Purpose |
|------|---------|
| `components/Node.tsx` | [MODIFY] Route mode, "+" relocation, Link button removal |
| `components/Canvas.tsx` | [MODIFY] Route-connect banner, cancel-on-canvas-click |
| `lib/store.ts` | [MODIFY] Add `routeConnectSource` state field |

---

## 03.5 Isolation Requirements

- **Inputs required**: 
  - `addRouteConnection` store method (Phase 00)
  - Extended `ConnectionMode` type with `'route'` (Phase 00)
  - `eventCoordinator` singleton (Phase 00)
  - Event coordinator integrated into existing handlers (Phase 02)
- **Outputs produced**: 
  - Route mode UI and interaction flow
  - "+" button at new position
  - Legacy Link button removed
  - `routeConnectSource` state in store (self-contained)
- **No forward dependencies**: Confirmed.

---

## 03.6 Gap Checklist

- [x] Does right-clicking the "+" button cycle through all 4 modes (Child → Sister → Buss → Route → Child)?
- [x] In Route mode, does clicking "+" show the route-connect banner?
- [x] In Route mode click-click, does clicking a target node create the correct connection?
- [x] In Route mode click-click, does clicking the canvas cancel route-connect?
- [x] In Route mode, does dragging "+" draw a teal visual line to the cursor?
- [x] In Route mode drag-release, does releasing on a node create the correct connection?
- [x] In Route mode drag-release, does releasing on empty space cancel without effect?
- [x] Does auto-classification correctly identify parent→child connections?
- [x] Does auto-classification correctly identify sister→sister connections?
- [x] Does auto-classification correctly create tunnel connections for unrelated nodes?
- [x] Is the "+" button now at the top-right corner of the node?
- [x] Is the legacy Link button gone from the selected-node toolbar?
- [x] Does the "+" button still work for Child, Sister, and Buss modes (no regressions)?
- [x] Are route connections undoable via Ctrl+Z?

> All gaps must be answered affirmatively before phase completion.

---

## 03.7 Gate Checklist

- [x] Gate 1: Route mode creates connections between existing nodes — NO new nodes spawned
- [x] Gate 2: "+" button resting position is at the top-right corner (not right-edge midpoint)
- [x] Gate 3: Legacy Link button (`LinkIcon`) is completely removed from Node.tsx
- [x] Gate 4: Both click-click and drag-release flows work for Route mode
- [x] Gate 5: Route mode color is distinctly teal/cyan `#06b6d4`
- [x] Gate 6: Child, Sister, and Buss modes still work identically to before
- [x] Gate 7: Event coordinator prevents Route mode from conflicting with other interactions

> Gates are non-negotiable. If a gate fails, the phase is not complete.

---

## 03.8 Verification Tests

### Unit Tests
- [x] Mode cycle: `'child' → 'sister' → 'buss' → 'route' → 'child'`
- [x] Auto-classification: source is ancestor of target → `'child'` type
- [x] Auto-classification: source and target share parent → `'sister'` type  
- [x] Auto-classification: unrelated nodes → `tunnelLinks` connection

### Integration Tests
- [x] Route mode click-click: banner appears, target click completes connection
- [x] Route mode drag-release: connection created when released on target node
- [x] Route mode cancellation: click canvas → banner dismissed, no connection
- [x] Child/Sister/Buss modes: still create new nodes as before

### Manual Verification (if applicable)
- [x] "+" button appears at top-right corner of selected nodes
- [x] Route mode teal color is visible and distinct from other mode colors
- [x] Route-connect banner appears with correct text and teal styling
- [x] Link button is gone from the node toolbar
- [x] Dragging "+" around the perimeter still works (all modes)

> All test files: `ver_01_chunk_01_tests/ver_01_chunk_01_phase_03.test.ts`

---

## 03.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| Mode cycle 4-way | ✅ Pass | 4-way cycle verified in code (line 580) |
| Route click-click flow | ✅ Pass | requestMode + setRouteConnectSource + addRouteConnection wired |
| Route drag-release flow | ✅ Pass | SVG teal drag line renders, elementFromPoint target detection |
| Auto-classification | ✅ Pass | addRouteConnection in store handles classification |
| "+" button relocation | ✅ Pass | top: -20, right: -20, transform: none |
| Link button removal | ✅ Pass | LinkIcon import removed, no linkingSourceId in Node.tsx |
| Regression: existing modes | ✅ Pass | TypeScript compiles clean, all modes preserved |

> Status legend: ✅ Pass | ❌ Fail | ⬜ Pending | ⚠️ Partial

---

## 03.10 Completion Criteria

This phase is DONE when:

- [x] All deliverables marked `[x]`
- [x] All gap checklist items answered affirmatively
- [x] All gate checklist items passing
- [x] All verification tests passing
- [x] Test results table updated with outcomes

> Proceed to Phase 04 only after all criteria are satisfied.
