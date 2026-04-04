# ver_01_chunk_01 — Upgrades & Refinements Spec

> **Goal**: Implement all upgrade features, new systems, and bug fixes identified during post-stabilization testing — including zoom-level LOD culling, context-menu spellcheck pass-through, speech-to-text dictation, a 4th "Route" connection mode, "+" button relocation, node alignment & layout tools, image and HTML viewer export, a professional settings panel, and file/workspace explorers. Defer Electron packaging to chunk_02.

---

## Locked Design Decisions

### Section A: LOD / Zoom Culling System

**A1. Default screen-pixel thresholds for LOD states** → **(b) Balanced thresholds**
- Culled: <12px, Star: 12–40px, Compact: 40–80px, Full: >80px. Sweet spot matching professional graph editors (Unreal Blueprints, Houdini). Comfortable zoom range before simplification begins; aligns with 1080p–4K screen densities.

**A2. LOD threshold configurability** → **(c) Both — dev constants + settings override**
- Ship with sensible defaults baked into constants. Power users can override via an "Advanced / Performance" section in the Settings panel. Mirrors the professional pattern used by Blender and Unreal Engine.

**Implementation notes (LOD system):**
- Four visual states: Culled → Star → Compact → Full, evaluated per-node on every camera zoom/pan.
- Transitions via CSS class swap (not re-mount) for minimal cost.
- A culled parent automatically culls all its children (cascade rule).
- Star state: small white dot/star glyph; title popup on hover.
- Compact state: node box rendered, description hidden, title scaled to fill node.
- Full state: normal full render (title, description, ports, buttons, everything).

---

### Section B: Context Menu & Spellcheck

**B1. Right-click context menu interaction with text fields** → **(a) Smart passthrough**
- If the right-click target is an `<input>`, `<textarea>`, or `contenteditable` element, allow the native browser context menu (with spellcheck suggestions) to appear. Otherwise, show the Knotess custom context menu. Industry standard pattern (Figma, Notion, Discord). One conditional `preventDefault` fix in `Canvas.tsx` and `Node.tsx`.

---
 
### Section C: Speech-to-Text (STT)

**C1. Microphone button placement** → **(Custom) Floating dictation bubble at textfield corner**
- A floating dictation bubble (pill/overlay) spawns at the corner of whichever text field was just clicked. Activated via keyboard shortcut (e.g., `Ctrl+Shift+M`). The bubble stays contextually positioned near the active input — not at the screen bottom, not in the toolbar. Minimally invasive; familiar mobile-keyboard pattern adapted for desktop with contextual positioning.

**C2. Dictation mode** → **(c) Continuous with auto-pause**
- Continuous listening via the Web Speech API. After 3–5 seconds of silence, the system auto-pauses (not auto-stops). User can resume with a tap on the bubble. Natural dictation flow with ambient noise protection. Standard in professional dictation software (Dragon, Google Voice Typing).

**Implementation notes (STT):**
- Uses browser-native Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`). No server-side transcription.
- Graceful degradation: if the browser does not support the Web Speech API, the bubble/shortcut is disabled with a tooltip explaining why.
- Recognized text insertions are undoable (integrate with undo/redo history).
- Visual indicator: pulsing mic icon and/or waveform in the floating bubble when active.

---

### Section D: Route Mode & Connection System

**D1. Route mode color** → **(b) Teal/Cyan `#06b6d4`**
- Maximally distinct from the existing Child (blue), Sister (purple), Buss (green) palette. No conflicts with existing UI colors (orange is used for child drag glow, red for delete). Reads as "connectivity/networking."

**D2. Route mode visual distinction for connection types** → **(Established) No changes to existing connection visuals**
- The three connection types (parent→child, sister→sister, tunnel) already have their looks, behaviors, and themes implemented in the codebase. Route mode does NOT alter these default visuals. Users should be able to alter visual styles via the Settings panel if desired.

**D3. Route mode target selection** → **(c) Both click-click and drag-release**
- Simple click on "+" in Route mode enters "select-target" mode (click the target node to complete the connection — banner/toast prompts user). Dragging from "+" draws a visual line to the cursor; releasing on a node creates the route, releasing on empty space cancels. Consistent with existing "+" button behavior across all modes.

**Implementation notes (Route mode):**
- The "+" button now cycles through **4 modes** (right-click to cycle): Child → Sister → Buss → Route → (repeat).
- Route mode connects two **existing** nodes — it does NOT create a new node.
- The system auto-classifies the connection style:
  - Parent→Child path style: if source is a parent and target is in its children subtree.
  - Sister→Sister path style: if both nodes share the same parent.
  - Tunnel: any other relationship (cross-branch, unrelated).
- The legacy standalone "Link" button (`LinkIcon` in the selected-node toolbar) is **removed** — Route mode subsumes its functionality.
- New store method needed (e.g., `addRouteConnection`) that creates a connection between existing nodes without spawning a new node.
- Route mode must support connecting to any visible node (not just adjacent ones).

---

### Section E: "+" Button Relocation

**E1. "+" button default position** → **(Custom) Top corner of the node**
- The "+" button's starting/default position moves from the right-edge midpoint to the **top corner** of the node. No functional changes — user still clicks and drags around the perimeter to set port angle/location. All existing mechanics remain identical. The only change is the resting position to eliminate overlap with ports on the right edge.

---

### Section F: Alignment & Layout Tools

**F1. Alignment command access points** → **(c) Both + keyboard shortcuts**
- **Context menu**: right-click on a reference node (while other nodes are selected) shows alignment options — Align Left, Align Right, Align Top, Align Bottom, Align Center Horizontal, Align Center Vertical, Distribute Horizontally, Distribute Vertically.
- **Floating alignment toolbar**: when 2+ nodes are selected, a compact toolbar appears near the selection with alignment icons (Figma/PowerPoint pattern).
- **Keyboard shortcuts**: e.g., `Alt+L` for align left, `Alt+R` for align right, etc., for power users.
- Full professional tooling from day one.

**F2. Group scaling interaction** → **(a) Drag handles on group boundary**
- When a group (or multi-selection) is selected, a bounding box with corner drag handles appears. Dragging a handle scales the spatial arrangement: each node repositions relative to the group centroid (`centroid + (offset × scale_factor)`). This is NOT a CSS scale — it physically repositions nodes.
- Must be undoable. Works for both grouped nodes (same `groupId`) and ad-hoc multi-selections.

**F3. "Align on Creation" column wrapping** → **(d) No wrapping — infinite column**
- When "Align on Creation" is ON, children auto-stack vertically below the first child. No automatic column wrapping — the stack extends downward indefinitely. The user manually reorganizes into multiple columns if desired. Simplest implementation; wrapping can be added in a future chunk.

**Implementation notes (Align on Creation toggle):**
- Global toggle in the Toolbar (next to existing Snap toggle).
- When ON and creating child nodes: auto-stack in a column underneath the first child.
- When ON and creating sister nodes: auto-stack to the right or left of the linked node depending on flow direction heuristic (if parent is to the left → sisters stack right; if parent is above → sisters stack left/right).
- Auto-alignment applies only at creation time — does NOT retroactively re-layout existing nodes.
- Column stacking offset values should be tuneable (dev constants, potentially settings-exposed later).

---

### Section G: Export & Viewer

**G1. Image export format and quality** → **(Custom) Extreme resolution render export (16K+)**
- The exported image is a high-fidelity render at extreme resolution (16,000px+ on the longest axis). Not a screen capture — a full render of all nodes, descriptions, and connection links (no internal content).
- JPEG is preferred for file size, but both JPEG and PNG are available via a format picker in the export dialog.
- Resolution options: user-selectable or auto-calculated to fit the full graph extents at high fidelity.
- Show a loading indicator during rendering.
- Implementation: DOM-to-image rendering (e.g., `html2canvas` or similar). Must calculate bounding box of all nodes and render at the target resolution.

**G2. Single-file HTML Viewer approach** → **(a) Bundle React + minimal app**
- The viewer is a stripped-down React app bundled into a single self-contained `.html` file with all JS/CSS inlined.
- Full interactivity: zoom, pan, click into node internals.
- Read-only: no editing controls, no dev controls, no toolbar.
- The viewer includes its own **"Export to JPEG"** button for the user to screenshot the current view.
- A **"Preview"** button in the editor opens a live preview of the current graph in the viewer (new browser tab with serialized graph data).
- Visual parity with the editor. Modern bundlers (Vite, esbuild) tree-shake aggressively to minimize file size.

---

### Section H: Settings Panel

**H1. Settings scope** → **(c) Global + per-file overrides**
- Global settings serve as the default for all graphs. Individual graphs can optionally override specific settings (e.g., a custom color palette). Un-overridden settings fall back to global. Mirrors VS Code's workspace settings pattern (global → workspace → folder). The override mechanism can be added incrementally — start with global, layer per-file on top.

**H2. Settings panel presentation** → **(d) Slide-out drawer with live preview**
- A panel slides in from the right edge of the screen. Transparency/see-through mode lets the user see the canvas updating behind the drawer in real-time as settings are changed. Gold standard for design tools (Figma, Blender).

**Implementation notes (Settings panel categories):**

| Category | Settings |
|---|---|
| **Connection Links** | Link style (bezier, straight, step), link thickness, link color per type (child/sister/tunnel/buss), animation (flow dots, none), arrow heads |
| **Color Palettes / Themes** | Primary, secondary, tertiary color. Background, node bg, text, accent colors. Dark/Light mode toggle. Preset themes (Midnight, Ocean, Forest, Ember, etc.) |
| **Typography** | Font family selector (Google Fonts / system fonts), font size scale, line height, letter spacing |
| **Visual Effects** | Grid visibility/opacity/size. Node blur, border radius, shadow intensity. Glow effects toggle |
| **Mechanics** | Default snap grid size, default zoom speed, double-click behavior (zoom to node / open editor / both), port snap angle |
| **Canvas** | Background pattern (dots, grid, none), background color, minimap toggle |
| **Performance (Advanced)** | LOD thresholds (from A2 — overrides for Culled, Star, Compact, Full pixel values) |

- Settings persist to IndexedDB alongside graph data.
- Settings stored in the Zustand store and reactive (changing a color updates the canvas immediately).
- Include a "Reset to Defaults" button per section and globally.

---

### Section I: Electron & Desktop Packaging

**I1. Electron shell scope** → **(b) Defer to its own chunk (chunk_02)**
- Electron packaging (native window controls, system tray, splash screen, native file dialogs, `.knotess` file extension, auto-updater, installer) is deferred to a dedicated chunk_02. This keeps chunk_01 focused on web-based features and at a manageable scope. Electron has its own unique challenges (IPC, security, build pipelines, code signing) deserving focused attention.

---

### Section J: File & Workspace Explorer

**J1. Multi-file storage for web-only version** → **(a) IndexedDB multi-key**
- Each graph gets its own IndexedDB key (e.g., `knotess-file-{uuid}`). A separate "registry" key lists all files with metadata (name, created date, modified date). Uses existing `idb-keyval` dependency. Supports dozens to a few hundred files. When Electron arrives, the abstraction layer swaps IndexedDB calls for `fs` calls.

**J2. Sidebar explorer layout** → **(a) Activity bar icons (VS Code style)**
- A narrow vertical icon strip on the far left of the sidebar. Icons for: Node Tree, File Explorer, Workspace Explorer, (Settings). Clicking an icon switches the main sidebar panel. Compact, scalable (easy to add more panels later — search, version history, etc.), and directly modeled after VS Code's activity bar.

**Implementation notes (Explorers):**
- **File Explorer**: shows a flat or hierarchical list of saved graphs from IndexedDB. Supports open, rename, delete, create new, duplicate. Collapsible tree, right-click context menu, drag-and-drop reorder, breadcrumb path.
- **Workspace Explorer**: higher-level grouping of multiple related projects/graphs. For web-only version, workspaces are a metadata concept stored in IndexedDB.
- Copy mechanics from VS Code's sidebar UX.

---

### Section K: Bug Fix & Stability

**K1. Bug 01 fix strategy (crash/freeze on double-click + drag near ports)** → **(b) Debounce + event coordination layer**
- Create a small event coordinator that manages which interaction mode is active (idle, click, double-click, drag, port-drag, route-connect). The coordinator rejects conflicting inputs (e.g., if port drag is in progress, suppress double-click zoom; if double-click was just processed, suppress port drag initiation).
- Clean up dangling global event listeners (`pointermove`, `pointerup`) on unmount or abort.
- This is a one-time investment (~50–100 lines) that prevents entire categories of interaction conflicts systematically — paying dividends as Route mode, group scaling, and alignment drag are added.

---

## New Types Summary

```typescript
// Additions / modifications to store.ts

// Mode now includes 'route'
type ConnectionMode = 'child' | 'sister' | 'buss' | 'route';

// New method for Route mode — connects existing nodes without creating new ones
interface AppState {
  // ... existing ...

  // Route mode: connect two existing nodes
  addRouteConnection: (sourceId: string, sourcePortAngle: number, targetId: string) => void;

  // Group scaling: reposition nodes relative to centroid
  scaleGroup: (nodeIds: string[], scaleFactor: number) => void;

  // Silent update (already exists from chunk_00 spec)
  updateNodeSilent: (id: string, data: Partial<NodeData>) => void;
}

// LOD thresholds configuration
interface LODThresholds {
  culledMax: number;    // default: 12  — below this, node is culled
  starMax: number;      // default: 40  — below this, node is a star
  compactMax: number;   // default: 80  — below this, node is compact
  // Above compactMax: full render
}

// Settings data model (partial — key categories)
interface EditorSettings {
  // Connection Links
  linkStyle: 'bezier' | 'straight' | 'step';
  linkThickness: number;
  linkColors: Record<ConnectionMode | 'tunnel', string>;
  linkAnimation: 'flow-dots' | 'none';
  linkArrowHeads: boolean;

  // Color Palette / Theme
  colorPrimary: string;
  colorSecondary: string;
  colorTertiary: string;
  colorBackground: string;
  colorNodeBg: string;
  colorText: string;
  colorAccent: string;
  darkMode: boolean;
  themePreset: string;  // 'midnight' | 'ocean' | 'forest' | 'ember' | 'custom'

  // Typography
  fontFamily: string;
  fontSizeScale: number;
  lineHeight: number;
  letterSpacing: number;

  // Visual Effects
  gridVisible: boolean;
  gridOpacity: number;
  gridSize: number;
  nodeBlur: number;
  nodeBorderRadius: number;
  nodeShadowIntensity: number;
  glowEffects: boolean;

  // Mechanics
  snapGridSize: number;
  zoomSpeed: number;
  doubleClickBehavior: 'zoom' | 'edit' | 'both';
  portSnapAngle: number;

  // Canvas
  backgroundPattern: 'dots' | 'grid' | 'none';
  backgroundColor: string;
  minimapVisible: boolean;

  // Performance / LOD
  lodThresholds: LODThresholds;

  // Align on Creation
  alignOnCreation: boolean;
  alignColumnOffset: number;
}

// File registry for multi-file support
interface FileRegistryEntry {
  id: string;         // UUID
  name: string;
  createdAt: string;  // ISO timestamp
  modifiedAt: string; // ISO timestamp
  storageKey: string; // IndexedDB key: 'knotess-file-{id}'
}

// Workspace for workspace explorer
interface Workspace {
  id: string;
  name: string;
  fileIds: string[];  // References to FileRegistryEntry.id
}
```

---

## Unfinished Business Coverage

No `*_unfinished_business.md` files were found targeting chunk_01. All feature items originate from the raw test observations document (`chunk_00_test_results_observation_Refinement_Thoughts.md`) and were fully formalized in the design-thoughts and interview documents.

**Source traceability — raw observation → spec section:**

- [x] Zoom-out LOD culling system → covered by **Section A (A1, A2)**
- [x] Right-click spell-check correction → covered by **Section B (B1)**
- [x] STT capabilities → covered by **Section C (C1, C2)**
- [x] Bug 01: crash/freeze on double-click + drag → covered by **Section K (K1)**
- [x] Route mode (replacing link button) → covered by **Section D (D1, D2, D3)**
- [x] "+" button relocation → covered by **Section E (E1)**
- [x] Right-click alignment options → covered by **Section F (F1)**
- [x] Group scaling → covered by **Section F (F2)**
- [x] "Align on Creation" toggle → covered by **Section F (F3)**
- [x] Export as fully rendered image → covered by **Section G (G1)**
- [x] Export as single-file HTML viewer + preview button → covered by **Section G (G2)**
- [x] Professional settings panel → covered by **Section H (H1, H2)**
- [x] Electron wrapper plan → covered by **Section I (I1)** — deferred to chunk_02
- [x] File explorer & workspace explorer → covered by **Section J (J1, J2)**

---

## Consistency with Prior Specs

This spec builds upon the foundation established in `ver_01_chunk_00_spec.md` (Stabilization & Foundation):

- **Carries forward**: `updateNodeSilent` (B2 from chunk_00), undo history pattern (A3 from chunk_00), `structuredClone` (B4), debounced IndexedDB writes (B8), `useKeyboardShortcuts` hook (D1), sidebar search pattern (D4), zoom controls (D6).
- **Extends**: The `theme: string` field reserved in chunk_00 (C2) is now fully realized by the Settings panel (Section H). The error boundary (D5) remains; new features must not break it.
- **No contradictions** with chunk_00 locked decisions.

---

## Ready for `/create-phase-plan`

All **20 decisions locked** across **11 sections** (A–K). 14 source features fully covered. Electron deferred to chunk_02. Proceed to phase planning when ready.
