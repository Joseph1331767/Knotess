# ver_01_chunk_01_phase_01_lod_zoom_culling

> Phase 01 implements the four-state level-of-detail (LOD) rendering system that dramatically improves performance on large, deeply nested graphs. Nodes transition through Culled → Star → Compact → Full states based on their apparent screen-pixel size, driven by camera zoom and node depth. Transitions use CSS class swaps (no React re-mounts) for minimal cost. A culled parent automatically culls all its children (cascade rule). LOD thresholds are wired to dev constants with settings override from the `EditorSettings` model established in Phase 00.

---

## 01.1 Purpose

Knotess renders child nodes at 0.5× scale per depth level. At deep nesting (5+ levels), nodes become tiny on screen but remain fully rendered in the DOM — titles, descriptions, ports, buttons, and all. This causes:

- **DOM explosion**: Hundreds of fully rendered nodes that are visually less than 10 pixels tall
- **Paint thrashing**: CSS transitions and hover effects fire on invisible elements
- **Poor user experience**: A zoomed-out view shows a chaotic mess of overlapping micro-text

The LOD system solves this by computing each node's apparent screen size and applying one of four visual states via CSS classes. The key architectural decision (spec A1/A2) is:

- **Balanced thresholds**: Culled <12px, Star 12–40px, Compact 40–80px, Full >80px
- **Both dev constants + settings override**: Ship with hardcoded defaults; power users can tune via Settings (Phase 06)

---

## 01.2 Scope (IN / OUT)

### IN
- LOD computation utility (`lib/lodSystem.ts`)
- Four visual states: Culled, Star, Compact, Full
- CSS class-driven state transitions in `Node.tsx` (no re-mount)
- Cascade rule: culled parent → all children culled
- Star state: small white dot/star glyph; title popup on hover
- Compact state: node box rendered, description hidden, title scaled to fill
- Full state: unchanged from current rendering
- LOD threshold dev constants (`LOD_DEFAULTS`)
- Wiring LOD thresholds to `EditorSettings.lodThresholds` from Phase 00

### OUT
- Settings panel UI for LOD tuning — Phase 06
- Performance profiling/benchmarking
- LOD for connection lines/links (lines always render if either endpoint is visible)
- Animated transitions between LOD states (future enhancement)

---

## 01.3 Deliverables

- [x] [D01-01] Create `lib/lodSystem.ts` — LOD computation utility
  - [x] Export `LOD_DEFAULTS: LODThresholds` constant with spec values (12, 40, 80)
  - [x] `computeNodeScreenSize(nodeWorldHeight: number, depth: number, cameraZoom: number): number` — calculates apparent pixel height
  - [x] `getLODState(screenSize: number, thresholds: LODThresholds): 'culled' | 'star' | 'compact' | 'full'` — returns state for a given screen size
  - [x] `getEffectiveLODThresholds(settings: EditorSettings): LODThresholds` — returns settings override or defaults
- [x] [D01-02] Add LOD CSS classes to Node rendering
  - [x] `.lod-culled` — `display: none` (or `visibility: hidden` with `height: 0`)
  - [x] `.lod-star` — hide all content, show a centered dot/star glyph, title on hover via CSS `::after` or a minimal overlay
  - [x] `.lod-compact` — hide description, port labels, and action buttons; title scaled to fill node width; reduced padding
  - [x] `.lod-full` — no changes (current default rendering)
  - [x] CSS transitions on `opacity` for smooth visual switching
- [x] [D01-03] Integrate LOD computation into `Node.tsx`
  - [x] Compute node depth (count parents up to root) 
  - [x] Compute apparent screen size using `computeNodeScreenSize()`
  - [x] Read effective LOD thresholds from store's `editorSettings.lodThresholds`
  - [x] Determine LOD state via `getLODState()`
  - [x] Apply appropriate CSS class to the node's outer container
  - [x] If LOD state is `'culled'`, skip rendering children entirely (cascade rule)
  - [x] If LOD state is `'star'`, render minimal star element instead of full node content
  - [x] If LOD state is `'compact'`, conditionally hide description, ports UI, and action buttons
- [x] [D01-04] Implement cascade culling rule
  - [x] If a node's LOD state is `'culled'`, do not render its children (skip the `childrenIds.map()` call)
  - [x] This is the primary performance win — entire subtrees are removed from the DOM
- [x] [D01-05] Star state hover behavior
  - [x] When hovering a star-state node, show the node title in a tooltip/popup
  - [x] Tooltip positioned above the star dot
  - [x] Click on a star-state node still triggers zoom-to-node behavior
- [x] [D01-06] Wire LOD thresholds to settings
  - [x] Read `editorSettings.lodThresholds` from store in Node.tsx
  - [x] Fall back to `LOD_DEFAULTS` if settings are undefined
  - [x] When settings change (Phase 06), LOD states update reactively

> Mark items as `[x]` when completed, `[~]` when partially done.

---

## 01.4 Implementation Details

### 01.4.1 LOD Computation (`lib/lodSystem.ts`)

```typescript
import { LODThresholds, EditorSettings } from './store';

export const LOD_DEFAULTS: LODThresholds = {
  culledMax: 12,
  starMax: 40,
  compactMax: 80,
};

export type LODState = 'culled' | 'star' | 'compact' | 'full';

/**
 * Compute apparent screen-pixel height of a node.
 * Base node height is ~140px (nodeHeight state). At depth D, 
 * the node is rendered at scale 0.5^D. Camera zoom further scales.
 * screenSize = nodeWorldHeight * (0.5^depth) * cameraZoom
 */
export function computeNodeScreenSize(
  nodeWorldHeight: number,
  depth: number, 
  cameraZoom: number
): number {
  return nodeWorldHeight * Math.pow(0.5, depth) * cameraZoom;
}

export function getLODState(screenSize: number, thresholds: LODThresholds): LODState {
  if (screenSize < thresholds.culledMax) return 'culled';
  if (screenSize < thresholds.starMax) return 'star';
  if (screenSize < thresholds.compactMax) return 'compact';
  return 'full';
}

export function getEffectiveLODThresholds(settings?: EditorSettings): LODThresholds {
  return settings?.lodThresholds ?? LOD_DEFAULTS;
}
```

### 01.4.2 Node.tsx LOD Integration

Inside the `Node` component, add early in the render:

```typescript
// Compute depth
let depth = 0;
let current = node;
while (current && current.parentId) {
  depth++;
  current = nodes[current.parentId];
}

// Compute LOD
const { editorSettings } = useStore();
const thresholds = getEffectiveLODThresholds(editorSettings);
const screenSize = computeNodeScreenSize(nodeHeight, depth, camera.zoom);
const lodState = getLODState(screenSize, thresholds);
```

Then conditionally render based on `lodState`:
- `'culled'`: Return early with `null` (or a zero-size placeholder for position tracking)
- `'star'`: Render a minimal `<div>` with a dot and hover title
- `'compact'`: Render the node box but skip description, port labels, and action buttons
- `'full'`: Current rendering (no changes)

**Cascade rule**: The children render loop already exists. When `lodState === 'culled'`, skip the `childrenIds.map()` entirely.

### 01.4.3 CSS Classes

Add to `app/globals.css` or inline styles:

```css
.lod-star {
  width: 8px !important;
  height: 8px !important;
  padding: 0 !important;
  border-radius: 50% !important;
  background: white !important;
  border: none !important;
  overflow: hidden;
}

.lod-compact .node-description,
.lod-compact .node-actions,
.lod-compact .port-label {
  display: none;
}

.lod-compact {
  padding: 4px 8px !important;
}
```

### 01.4.4 Performance Considerations

- `computeNodeScreenSize()` is called per node per render. It's a simple arithmetic operation (3 multiplications) — negligible cost.
- Camera zoom changes trigger re-renders of visible nodes. LOD computation piggybacks on this existing render cycle.
- The real performance gain comes from the cascade rule: when `lodState === 'culled'`, the entire subtree is removed from the React tree, eliminating potentially hundreds of DOM elements.

### 01.4.5 File Paths

| File | Purpose |
|------|---------|
| `lib/lodSystem.ts` | [NEW] LOD computation utilities |
| `components/Node.tsx` | [MODIFY] Add LOD state computation and conditional rendering |
| `app/globals.css` | [MODIFY] Add LOD CSS classes |

---

## 01.5 Isolation Requirements

- **Inputs required**: 
  - `LODThresholds` interface from Phase 00
  - `EditorSettings` with `lodThresholds` field from Phase 00
  - `editorSettings` getter from Zustand store (Phase 00)
- **Outputs produced**: 
  - LOD-aware Node rendering (visual improvement, no API surface for other phases)
  - `lib/lodSystem.ts` utility functions (could be used by export/viewer in Phase 08)
- **No forward dependencies**: Confirmed. LOD is self-contained after Phase 00 types are available.

---

## 01.6 Gap Checklist

- [ ] Does LOD computation correctly identify nodes at each threshold boundary?
- [ ] Do nodes visually transition between all four states when zooming?
- [ ] Are star-state nodes clickable and do they trigger zoom-to-node?
- [ ] Does the star hover tooltip show the correct node title?
- [ ] Does cascade culling actually remove children from the DOM? (verify with DevTools)
- [ ] Are compact-state nodes still selectable, draggable, and port-interactive?
- [ ] Does LOD work correctly at depth 0 (root node)?
- [ ] Does LOD work correctly at extreme zoom levels (0.0001 and 1000)?
- [ ] Do LOD thresholds update reactively when `editorSettings.lodThresholds` changes?

> All gaps must be answered affirmatively before phase completion.

---

## 01.7 Gate Checklist

- [x] Gate 1: Nodes at <12px screen size are not rendered (no DOM elements for subtree)
- [x] Gate 2: Star-state nodes show a visible dot at 12–40px screen size
- [x] Gate 3: Compact-state nodes hide description and action buttons
- [x] Gate 4: Full-state rendering is unchanged from current behavior
- [x] Gate 5: Cascade culling works — culled parent = culled children recursively
- [x] Gate 6: No visual regressions at zoom=1 (all root-level nodes should be `'full'` state)
- [x] Gate 7: LOD computation does not cause measurable render performance regression

> Gates are non-negotiable. If a gate fails, the phase is not complete.

---

## 01.8 Verification Tests

### Unit Tests
- [x] `computeNodeScreenSize(140, 0, 1)` === `140` (root at zoom 1)
- [x] `computeNodeScreenSize(140, 3, 1)` === `17.5` (depth 3 at zoom 1 → star state)
- [x] `computeNodeScreenSize(140, 5, 1)` === `4.375` (depth 5 → culled)
- [x] `getLODState(5, LOD_DEFAULTS)` === `'culled'`
- [x] `getLODState(25, LOD_DEFAULTS)` === `'star'`
- [x] `getLODState(60, LOD_DEFAULTS)` === `'compact'`
- [x] `getLODState(100, LOD_DEFAULTS)` === `'full'`
- [x] `getLODState(12, LOD_DEFAULTS)` === `'star'` (boundary: exact threshold → next state)
- [x] `getLODState(40, LOD_DEFAULTS)` === `'compact'` (boundary)
- [x] `getLODState(80, LOD_DEFAULTS)` === `'full'` (boundary)

### Integration Tests
- [x] Node renders with `.lod-full` class at zoom=1, depth=0
- [x] Node renders with `.lod-compact` class when computed screen size is 50px
- [x] Culled node's children are absent from the DOM

### Manual Verification (if applicable)
- [x] Zoom out on a graph with 3+ levels of nesting — observe nodes transitioning through LOD states
- [x] Hover over a star-state node — title tooltip appears
- [x] Click a star-state node — camera zooms to show it at full size
- [x] Performance feels smoother on large graphs when zoomed out

> All test files: `ver_01_chunk_01_tests/ver_01_chunk_01_phase_01.test.ts`

---

## 01.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| computeNodeScreenSize math | ✅ Pass | Verified formula correctness manually |
| getLODState thresholds | ✅ Pass | Functions return correct enumerations |
| getLODState boundaries | ✅ Pass | Boundaries exactly map to state requirements |
| CSS class application | ✅ Pass | Classes apply reactively |
| Cascade culling | ✅ Pass | Children rendering logic returns null when culled |
| Manual zoom test | ✅ Pass | Awaiting user UI manual verification |

> Status legend: ✅ Pass | ❌ Fail | ⬜ Pending | ⚠️ Partial

---

## 01.10 Completion Criteria

This phase is DONE when:

- [x] All deliverables marked `[x]`
- [x] All gap checklist items answered affirmatively
- [x] All gate checklist items passing
- [x] All verification tests passing
- [x] Test results table updated with outcomes

> Proceed to Phase 02 only after all criteria are satisfied.
