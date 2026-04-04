# Knotess — ver_01_chunk_01 Upgrades & Refinements — Development Phase Checklist (Abstracts + Purposes)

> High-level phase map only (no deep task lists yet).
> Next step: create individual `.md` per phase.
> **Source Spec:** `ver_01_chunk_01_spec.md` — 20 locked decisions across 11 sections (A–K).
> **Electron (Section I):** Deferred to chunk_02 per decision I1.

---

## Phase Status

| Phase | Title | Status |
|-------|-------|--------|
| 00 | Foundation — Event Coordinator + Settings Data Model + Multi-File Storage | ✅ Complete |
| 01 | LOD Zoom Culling System | ✅ Complete |
| 02 | Context Menu Spellcheck + Bug Fix (Event Conflicts) | ✅ Complete |
| 03 | Route Mode + "+" Button Relocation | ✅ Complete |
| 04 | Alignment, Layout Tools + Group Scaling | ✅ Complete |
| 05 | Speech-to-Text Dictation | ✅ Complete |
| 06 | Settings Panel (Slide-Out Drawer) | ⬜ Pending |
| 07 | Activity Bar + File Explorer + Workspace Explorer | ⬜ Pending |
| 08 | Export — Image Render + HTML Viewer + Preview | ⬜ Pending |

---

## Phase 00 — Foundation: Event Coordinator + Settings Data Model + Multi-File Storage

**Purpose:** Establish the shared infrastructure — the event coordination layer, the full EditorSettings data model in Zustand, the multi-file IndexedDB registry, and new types (`ConnectionMode: 'route'`, `LODThresholds`, `FileRegistryEntry`, `Workspace`) — that all subsequent phases depend on.

- Create the interaction event coordinator (idle, click, double-click, drag, port-drag, route-connect) — spec K1.
- Define and wire the `EditorSettings` interface into the Zustand store with IndexedDB persistence — spec H1/H2.
- Implement multi-file IndexedDB storage with file registry (create, open, rename, delete, duplicate) — spec J1.
- Add new types: `ConnectionMode` extended with `'route'`, `LODThresholds`, `FileRegistryEntry`, `Workspace`.
- Add new store methods: `addRouteConnection`, `scaleGroup`, global settings getters/setters with per-file override logic.

**Key outputs:**
- `lib/eventCoordinator.ts` — interaction mode state machine.
- `lib/store.ts` — extended with settings slice, multi-file slice, new types and methods.
- `lib/fileRegistry.ts` — IndexedDB multi-key file management.
- All new TypeScript interfaces from the spec's "New Types Summary."

---

## Phase 01 — LOD Zoom Culling System

**Purpose:** Implement the four-state level-of-detail rendering system (Culled → Star → Compact → Full) so deeply nested nodes at small screen sizes are culled or simplified, dramatically improving performance on large graphs — spec A1/A2.

- Compute per-node apparent screen-pixel size on every camera zoom/pan.
- Implement four visual states via CSS class swap (no re-mount): culled (hidden), star (dot + hover title), compact (box + scaled title, no description), full (normal).
- Cascade rule: a culled parent automatically culls all children.
- Wire LOD thresholds to dev constants with settings override (consuming the EditorSettings from Phase 00).

**Key outputs:**
- `lib/lodSystem.ts` — LOD computation utility.
- `components/Node.tsx` — CSS class-driven LOD rendering.
- LOD threshold settings wired to the settings model.

---

## Phase 02 — Context Menu Spellcheck + Bug Fix (Event Conflicts)

**Purpose:** Fix the unconditional `preventDefault` on right-click so native browser spellcheck menus appear inside text fields (spec B1), and wire the event coordinator from Phase 00 into Node.tsx/Canvas.tsx to eliminate the crash/freeze on double-click + drag near ports (spec K1).

- Modify `Canvas.tsx` `handleContextMenu` to detect if the click target is an `<input>`, `<textarea>`, or `contenteditable` — if so, allow native menu; otherwise show Knotess context menu.
- Do the same in `Node.tsx` port context menu handler.
- Integrate the event coordinator throughout Canvas.tsx and Node.tsx — reject conflicting interaction inputs (e.g., suppress double-click zoom during port drag).
- Clean up dangling global event listeners on unmount/abort.

**Key outputs:**
- Conditional `preventDefault` in Canvas.tsx and Node.tsx.
- Event coordinator integrated into all pointer/click handlers.
- Bug 01 resolved.

---

## Phase 03 — Route Mode + "+" Button Relocation

**Purpose:** Add the 4th connection mode ("Route") that connects existing nodes without creating new ones (spec D1–D3), and relocate the "+" button's default position to the top corner of the node (spec E1). Remove the legacy Link button.

- Extend the "+" button mode cycle to 4 modes: Child → Sister → Buss → Route.
- Implement Route mode mechanics: click-click (with banner/toast) and drag-release target selection.
- Auto-classify connection style (parent→child, sister→sister, tunnel) based on node relationships.
- Wire `addRouteConnection` store method (from Phase 00) into the Route interaction flow.
- Relocate "+" button starting position to top corner of node; all drag-to-perimeter mechanics remain identical.
- Remove legacy Link button (`LinkIcon`) from selected-node toolbar.
- Route mode color: Teal/Cyan `#06b6d4`.

**Key outputs:**
- `Node.tsx` — Route mode UI, "+" button relocation, Link button removal.
- `store.ts` — `addRouteConnection` fully implemented.
- Route mode interaction flow (both click-click and drag-release).

---

## Phase 04 — Alignment, Layout Tools + Group Scaling

**Purpose:** Add professional alignment and distribution commands (spec F1), group bounding-box scaling (spec F2), and the "Align on Creation" toggle (spec F3), giving users full spatial control over node arrangement.

- Context menu alignment options (Align Left/Right/Top/Bottom, Center H/V, Distribute H/V) on right-click of a reference node when other nodes are selected.
- Floating alignment toolbar when 2+ nodes are selected.
- Keyboard shortcuts (e.g., `Alt+L`, `Alt+R`, etc.).
- Group bounding box with corner drag handles — scale repositions nodes relative to centroid.
- "Align on Creation" toggle in the Toolbar: vertical column stacking for children, directional stacking for sisters. No wrapping (infinite column).

**Key outputs:**
- `components/AlignmentToolbar.tsx` — floating alignment toolbar.
- Context menu extensions in Canvas.tsx/Node.tsx.
- `lib/alignment.ts` — alignment/distribution math utilities.
- `lib/groupScale.ts` — group scaling logic (centroid-based repositioning).
- `Toolbar.tsx` — "Align on Creation" toggle.
- Keyboard shortcuts registered in `useKeyboardShortcuts.ts`.

---

## Phase 05 — Speech-to-Text Dictation

**Purpose:** Add browser-native speech-to-text dictation via a floating bubble that spawns at the corner of the active text field (spec C1/C2), providing quick hands-free input with continuous listening and auto-pause.

- Implement `useSpeechToText` hook wrapping the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`).
- Floating dictation bubble component — pill overlay positioned at the corner of the focused text field.
- Continuous listening with 3–5 second silence auto-pause.
- Keyboard shortcut activation (`Ctrl+Shift+M`).
- Graceful degradation: disabled with tooltip if API unavailable.
- Visual indicator: pulsing mic icon and/or waveform when active.
- Text insertions integrated with undo/redo history.

**Key outputs:**
- `hooks/useSpeechToText.ts` — Web Speech API wrapper.
- `components/DictationBubble.tsx` — floating bubble UI.
- Integration with text fields in Node.tsx and NodeEditor.tsx.

---

## Phase 06 — Settings Panel (Slide-Out Drawer)

**Purpose:** Build the professional settings panel as a slide-out drawer from the right with live preview transparency (spec H1/H2), exposing all setting categories (Connection Links, Color/Themes, Typography, Visual Effects, Mechanics, Canvas, Performance/LOD).

- Slide-out drawer component with transparency/see-through backdrop.
- Setting categories organized as accordion/tab sections within the drawer.
- Each setting control (slider, color picker, dropdown, toggle) reactively updates the Zustand store — canvas reflects changes in real-time behind the drawer.
- "Reset to Defaults" per section and globally.
- Per-file override mechanism: individual graphs can override specific settings.
- Settings persist to IndexedDB (consuming the storage foundation from Phase 00).
- Wire settings gear icon in Sidebar to open the drawer.

**Key outputs:**
- `components/SettingsDrawer.tsx` — main settings panel component.
- `components/settings/` — per-category setting sections (ConnectionLinks, ColorThemes, Typography, VisualEffects, Mechanics, Canvas, Performance).
- All settings reactive and persisted.

---

## Phase 07 — Activity Bar + File Explorer + Workspace Explorer

**Purpose:** Transform the sidebar into a multi-panel system with a VS Code-style activity bar (spec J2), and build the File Explorer and Workspace Explorer panels for managing multiple graphs (spec J1/J2).

- Activity bar: narrow vertical icon strip on the far left — icons for Node Tree, File Explorer, Workspace Explorer, (Settings).
- File Explorer panel: flat/hierarchical list of saved graphs from IndexedDB; supports open, rename, delete, create new, duplicate; right-click context menu, drag-and-drop reorder.
- Workspace Explorer panel: workspace grouping concept — metadata stored in IndexedDB; create/rename/delete workspaces; add/remove files.
- Breadcrumb path at top of explorer panels.
- Consumes the multi-file registry from Phase 00.

**Key outputs:**
- `components/ActivityBar.tsx` — vertical icon navigation.
- `components/FileExplorer.tsx` — file management panel.
- `components/WorkspaceExplorer.tsx` — workspace management panel.
- `components/Sidebar.tsx` — refactored to support activity bar switching.

---

## Phase 08 — Export: Image Render + HTML Viewer + Preview

**Purpose:** Implement the extreme-resolution image export (16K+ render) with JPEG/PNG format choice (spec G1), the single-file HTML interactive viewer bundled with React (spec G2), and the in-editor Preview button.

- Image export: DOM-to-image rendering of full graph (all nodes, descriptions, links); compute bounding box; render at extreme resolution (16K+ on longest axis); JPEG/PNG format picker; loading indicator.
- HTML Viewer: stripped-down read-only React app bundled to a single self-contained `.html` file with all JS/CSS inlined; full interactivity (zoom, pan, click into node internals); no editing/dev controls; own "Export to JPEG" button.
- Preview button in editor: opens a live preview tab with serialized current graph data fed to the viewer.
- Vite/esbuild build pipeline for tree-shaken viewer bundle.

**Key outputs:**
- `components/ExportDialog.tsx` — export UI with format picker and resolution options.
- `lib/imageExport.ts` — DOM-to-image render pipeline.
- `viewer/` — standalone viewer React app.
- Viewer build pipeline (Vite/esbuild config for single-file output).
- Preview button in Toolbar.tsx.

---

## Dependency Graph

```
Phase 00 (Foundation)
  ├── Phase 01 (LOD) ← uses LODThresholds from Phase 00
  ├── Phase 02 (Context Menu + Bug Fix) ← uses Event Coordinator from Phase 00
  ├── Phase 03 (Route Mode) ← uses addRouteConnection, ConnectionMode from Phase 00
  ├── Phase 04 (Alignment) ← uses scaleGroup from Phase 00
  ├── Phase 05 (STT) ← independent, but uses undo history pattern from Phase 00
  ├── Phase 06 (Settings) ← uses EditorSettings model from Phase 00
  ├── Phase 07 (Explorers) ← uses FileRegistry from Phase 00
  └── Phase 08 (Export) ← independent; benefits from Settings for theming
```

Phases 01–08 depend on Phase 00 but are **independent of each other** and could theoretically be parallelized or reordered. The listed order prioritizes:

1. **Core rendering** (LOD) — most impactful performance improvement.
2. **Stability** (Bug fix + context menu) — essential quality of life.
3. **Core interaction** (Route mode) — foundational feature change.
4. **Spatial tools** (Alignment) — builds on new interaction patterns.
5. **Input enhancement** (STT) — additive, self-contained.
6. **Configuration** (Settings) — consumes all prior features' options.
7. **File management** (Explorers) — structural UI change.
8. **Export** (Image + Viewer) — capstone feature requiring everything else stable.

---

## Next Step

✅ **All 9 individual phase files have been created** (`ver_01_chunk_01_phase_00.md` through `ver_01_chunk_01_phase_08.md`).

**To begin execution**, use the `/phase` workflow to synchronize and start executing **Phase 00 — Foundation**.

### Created Files

| File | Phase |
|------|-------|
| `ver_01_chunk_01_phase_00.md` | Foundation — Event Coordinator + Settings Data Model + Multi-File Storage |
| `ver_01_chunk_01_phase_01.md` | LOD Zoom Culling System |
| `ver_01_chunk_01_phase_02.md` | Context Menu Spellcheck + Bug Fix (Event Conflicts) |
| `ver_01_chunk_01_phase_03.md` | Route Mode + "+" Button Relocation |
| `ver_01_chunk_01_phase_04.md` | Alignment, Layout Tools + Group Scaling |
| `ver_01_chunk_01_phase_05.md` | Speech-to-Text Dictation |
| `ver_01_chunk_01_phase_06.md` | Settings Panel (Slide-Out Drawer) |
| `ver_01_chunk_01_phase_07.md` | Activity Bar + File Explorer + Workspace Explorer |
| `ver_01_chunk_01_phase_08.md` | Export — Image Render + HTML Viewer + Preview |
