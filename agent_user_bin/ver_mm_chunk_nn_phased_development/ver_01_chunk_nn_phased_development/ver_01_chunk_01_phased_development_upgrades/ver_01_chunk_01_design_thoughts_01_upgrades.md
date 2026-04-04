# Knotess — ver_01 / chunk_01 Design Thoughts (Iteration 01)
## Subject: Upgrades & Refinements

> **Source:** `chunk_00_test_results_observation_Refinement_Thoughts.md`
> **Date:** 2026-03-31
> **Status:** Draft — pending interview lock-in

---

## Title & Overview

This document captures all upgrade ideas, bug reports, and feature requests that arose during hands-on testing of the Knotess node-graph editor after the stabilization chunk (chunk_00). The observations cover zoom-level culling, context-menu improvements, speech-to-text input, a unified connection mode, the "+" button relocation, node alignment tools, group scaling, auto-alignment on creation, expanded export capabilities, a production-grade settings panel, Electron packaging, and file/workspace explorers.

---

## Context

Knotess is a Next.js-based infinite-zoom node-graph editor stored entirely in IndexedDB via `idb-keyval`. After chunk_00 stabilized the recursive rendering, port system, buss nodes, grouping, and basic import/export, a live testing session revealed a significant list of fit-and-finish improvements, new features, and at least one reproducible crash. This chunk_01 will address all of these items.

---

## Core Feature Specifications

### 1. Zoom-Out LOD (Level-of-Detail) Culling System

**Problem:** When zoomed far out, deeply nested nodes are rendered at excessively small screen sizes, wasting GPU/DOM resources and cluttering the view.

**Desired Behavior — a graduated scale of visual states based on a node's apparent screen-space size:**

| Threshold Name | Screen-space Size | Visual State |
|---|---|---|
| **Culled** | Extra-tiny (below a tuneable minimum) | Do not render at all |
| **Star** | Just-tiny (above cull threshold, below star-max) | Render as a small white dot/star; show the node's title in a popup on hover |
| **Compact** | Medium-tiny (above star-max, below compact-max) | Render the node box but hide the description; scale the title/name to fill the node as large as possible |
| **Full** | Not tiny (above compact-max) | Normal full render — title, description, ports, buttons, everything |

**Requirements:**
- All four thresholds must be **dev-tuneable** — either via constants or a debug panel.
- The system must re-evaluate on every camera zoom/pan so transitions are instant.
- Transitions between states should be as cheap as possible (CSS class swap, not re-mount).
- The LOD state should cascade: a culled parent should cull all its children automatically.

**Current State:**
- No LOD system exists. Every node is rendered identically regardless of zoom level. The `Node.tsx` component always renders full markup (title, description, ports, buttons, edit controls).

---

### 2. Right-Click Spell-Check Correction

**Problem:** The editor has spell-checking enabled in text inputs (browser native red underline), but there is no right-click context menu to select the correct word. The browser's native context menu is suppressed by `onContextMenu={e.preventDefault()}` on the canvas.

**Desired Behavior:**
- When right-clicking inside a text input (node title `<input>`, node description `<textarea>`, port name `<input>`, or the NodeEditor rich text areas), the **native browser context menu** should appear — including the spellcheck suggestions.
- When right-clicking on the **canvas background** or on a **node body** (outside text inputs), the custom Knotess context menu should appear as it does today.

**Requirements:**
- Only suppress `e.preventDefault()` on the canvas/node context menu handlers if the click target is NOT an editable text element.
- No library needed — this is a conditional `preventDefault` fix.

**Current State:**
- `Canvas.tsx` line 197: `handleContextMenu` calls `e.preventDefault()` unconditionally.
- `Node.tsx` port context menu handler also calls `e.preventDefault()`.

---

### 3. Speech-to-Text (STT) Input

**Problem:** Text input for node titles / descriptions / editor content is keyboard-only. The user wants quick voice input.

**Desired Behavior:**
- A microphone button/toggle should be available near text inputs (or globally in the toolbar).
- When activated, the system listens via the browser's Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) and inserts recognized text into the currently focused text field.
- Should support continuous dictation (not just a single phrase).
- Visual indicator showing when the mic is active (pulsing icon, waveform, etc.).

**Requirements:**
- Must gracefully degrade if the browser does not support the Web Speech API (show a disabled button with tooltip).
- No server-side transcription required — browser-native only for now.
- Should interoperate with undo/redo (recognized text insertions are undoable).

**Current State:**
- No STT integration exists anywhere in the codebase.

---

### 4. Bug 01: Crash/Freeze on Double-Click + Drag Near Ports

**Problem:** A crash or freeze occurs when double-clicking on or near ports and then dragging the mouse around. This is likely a race condition between the double-click handler (which zooms the camera) and the port drag system (which binds `pointermove` / `pointerup` listeners globally).

**Desired Behavior:**
- No crash or freeze under any click/drag sequence involving ports.
- double-click on a node should zoom to it (existing behavior).
- double-click on a port should NOT trigger the node zoom AND a port drag simultaneously.

**Requirements:**
- Audit `Node.tsx` for event handler conflicts between `handleDoubleClick`, `handlePointerDown`, and `handlePortDragStart`.
- Add guards: if a port drag is in progress, suppress the double-click zoom. If a double-click was just processed, suppress port drag initiation.
- Clean up any dangling global event listeners (`pointermove`, `pointerup`) on unmount or abort.

**Current State:**
- `Node.tsx` line 377: `handleDoubleClick` calls `setActiveNode(id)` — opens the node editor.
- `Node.tsx` line 158: `handlePortDragStart` binds global `pointermove` and `pointerup`.
- Both can fire in rapid succession on the same DOM element.

---

### 5. New "Route" Connection Mode (Replaces Legacy Link Button)

**Problem:** If a user deletes a link/connection, there is no way to add a new one. The current "Link" button (`LinkIcon` in the node toolbar, line 474-479 of `Node.tsx`) only creates tunnel links. The user wants a unified connection system.

**Desired Behavior — four distinct creation modes:**

| Mode | Button Color | Creates |
|---|---|---|
| **Child** | Blue (current) | A parent→child connection. New node becomes a child of the selected node. |
| **Sister** | Purple (current) | A sibling connection. New node becomes a peer at the same parent level. |
| **Buss** | Green (current) | A buss (junction) node. Circular node that acts as a routing hub. |
| **Route** | _(new — color TBD)_ | A pure connection/link between two existing nodes. Does NOT create a new node. |

**Route Mode Mechanics:**
- When "Route" mode is active, the user drags from the "+" button (or clicks, then clicks a target node) to establish a connection.
- The system auto-classifies the connection style:
  - **Parent→Child path style** if the source is a parent and the target is in its children subtree.
  - **Sister→Sister path style** if both nodes share the same parent.
  - **Tunnel** for any other connection (cross-branch, unrelated nodes).
- This makes the legacy standalone "Link" button redundant — it should be **removed** from the node toolbar (`Edit2`, `LinkIcon`, `Trash2` row).

**Requirements:**
- The "+" button now cycles through **4 modes** (right-click to cycle): Child → Sister → Buss → Route → Child.
- Route mode must support connecting to any visible node (not just adjacent ones).
- Ports created by Route mode should visually indicate their type (tunnel, parent-child, sister-sister).
- Removing the link button cleans up the selected-node toolbar.

**Current State:**
- `Node.tsx` line 38: mode state is `'child' | 'sister' | 'buss'` — needs `'route'` added.
- `Node.tsx` line 472-479: Legacy link button exists in the selected-node toolbar.
- `store.ts` line 102: `addNodeWithPort` only creates new nodes — a new `addRouteConnection` method (or similar) is needed for Route mode (connects existing nodes without creating a new one).

---

### 6. Relocate the "+" Button Away from the Perimeter

**Problem:** The "+" button for creating new connections currently sits on the right edge of the node (see `Node.tsx` line 509-577). This frequently overlaps with ports, making it hard to click.

**Desired Behavior:**
- The "+" button moves to where the legacy "Link" button was — inside the node toolbar area (top-right row of action buttons that appears on selection).
- If the user **drags** the "+" button toward the perimeter, the button should snap to the perimeter just like it does today, allowing the user to choose a port angle.
- If the user simply **clicks** the "+" button (no drag), it creates a new node at a default position (current click behavior).

**Requirements:**
- New default position: inside the node's selected-state toolbar (replacing the removed Link button).
- Drag detection: beyond a small threshold, switch to the perimeter-snap mode (existing `handlePortDragStart` drag behavior).
- The mode indicator (color: blue/purple/green/new-route-color) must be visible in both the toolbar position and the perimeter-snap position.

**Current State:**
- The "+" button is absolutely positioned at `right: -20` / `top: 50%` on the node.
- The link button is at line 474-479 in the selected-node action bar.

---

### 7. Right-Click Alignment Options

**Problem:** There is no way to align nodes to each other.

**Desired Behavior:**
- User selects one or more nodes, then right-clicks on a **different** node (the "reference" node).
- The context menu shows alignment options:
  - **Align Left** — align selected nodes' left edges to the reference node's left edge.
  - **Align Right** — align right edges.
  - **Align Top** — align top edges.
  - **Align Bottom** — align bottom edges.
  - **Align Center Horizontal** — align horizontal centers.
  - **Align Center Vertical** — align vertical centers.
  - **Distribute Horizontally** — evenly space selected nodes horizontally.
  - **Distribute Vertically** — evenly space selected nodes vertically.

**Requirements:**
- Alignment is relative to the right-clicked (reference) node.
- Must work across nodes at the same depth level (same parent).
- Should be undoable (push history before applying).
- Context menu only shows alignment options when there are selected nodes AND the right-clicked node is not in the selection.

**Current State:**
- `Canvas.tsx` context menu (line 298-384) has: Add Node Here, Paste Here, Group/Ungroup, Center View.
- Node-level context menu does not exist (nodes use `onPointerDown` directly).

---

### 8. Group Scale (Distance Multiplier)

**Problem:** After grouping nodes, there is no way to scale the spatial arrangement of the group — only individual drag is possible.

**Desired Behavior:**
- User selects a group (or multi-selects nodes).
- A **"Scale Group"** action (context menu or keyboard shortcut) activates a scaling mode.
- Dragging outward increases the distance between nodes in the group while maintaining their relative positions. Dragging inward decreases the distance.
- This is NOT a CSS scale transform — it physically repositions nodes.

**Requirements:**
- The scaling operates relative to the group's centroid (average x, y of all nodes in the group).
- Each node's new position = `centroid + (original_offset_from_centroid * scale_factor)`.
- Must be undoable.
- Should work for both grouped nodes (same `groupId`) and ad-hoc multi-selections.

**Current State:**
- `store.ts` has `groupNodes` and `ungroupNodes` but no spatial manipulation of groups.
- No group scaling functionality exists.

---

### 9. "Align on Creation" Toggle

**Problem:** When creating multiple child nodes or sister nodes in sequence, they are placed at semi-random positions. There is no auto-layout.

**Desired Behavior — a global toggle called "Align on Creation":**
- **When ON:**
  - **Child nodes** auto-stack in a column underneath the first child placed. Multiple rows form if configured (e.g., max N children per column, then start a new column to the right).
  - **Sister nodes** of children auto-stack to the right or left of the node they are linked to, depending on the flow direction.
- **When OFF:** Current free-placement behavior.

**Requirements:**
- Toggle button in the Toolbar (next to Snap toggle).
- The auto-alignment only applies at the moment of creation (it does not continuously re-layout existing nodes).
- Flow direction heuristic: if a node's parent is to the left, sisters stack to the right. If parent is above, sisters stack to the left/right.
- Column stacking offset values should be tuneable.

**Current State:**
- `addNodeWithPort` in `store.ts` places nodes at user-specified coordinates. No auto-layout logic exists.

---

### 10. Export — Fully Rendered Image

**Problem:** The current export only produces a JSON data file. The user wants a visual export.

**Desired Behavior:**
- An **"Export as Image"** option renders the entire node graph (all visible nodes, descriptions, and connection links) as a single high-resolution image (JPEG or PNG).
- Internal content (pages, canvas items) is NOT included — only the outer node view.
- The export should capture the full extent of the graph, not just the viewport.

**Requirements:**
- Use `html2canvas` or a similar DOM-to-image library.
- Must handle the infinite canvas transform (calculate bounding box of all nodes, render at that scale).
- Offer resolution options (1x, 2x, 4x).
- Show a loading indicator during rendering.

**Current State:**
- `Toolbar.tsx` line 39-48: `handleExport` only exports JSON.

---

### 11. Export — Single-File HTML Viewer

**Problem:** There is no way to share a Knotess graph as an interactive artifact.

**Desired Behavior:**
- An **"Export as Interactive Viewer"** option produces a single `.html` file that:
  - Contains all the graph data embedded inline.
  - Renders the same environment as the editor, but in **read-only / viewer mode**.
  - Fully interactive: clickable nodes (opens internal pages), zoom, pan.
  - No editing controls, no dev controls, no toolbar.
  - Has its own **"Export to JPEG"** button so the viewer can screenshot the current view.

- Because we are building a "viewer" component, there should also be a **"Preview"** button in the editor that opens a live preview of the current file using the same viewer.

**Requirements:**
- The viewer must be a self-contained HTML file — no external dependencies (all CSS/JS inlined or bundled).
- The viewer should be lightweight (strip out Zustand, React dev tools, etc. — can use a minimal rendering approach or pre-render to static HTML).
- The preview button in the editor opens the viewer in a new browser tab with the current graph data serialized.

**Current State:**
- No viewer component exists.
- No preview functionality exists.

---

### 12. Professional Settings Panel

**Problem:** The system settings tab (accessible via the gear icon in the Sidebar header) is a stub — it does nothing. There is no actual settings UI.

**Desired Behavior — a full settings panel with at minimum:**

| Category | Settings |
|---|---|
| **Connection Links** | Link style (bezier, straight, step), link thickness, link color per type (child/sister/tunnel/buss), animation (flow dots, none), arrow heads |
| **Color Palettes / Themes** | Primary color, secondary color, tertiary color, background color, node bg color, text color, accent color. Dark/Light mode toggle. Preset themes (Midnight, Ocean, Forest, Ember, etc.) |
| **Typography** | Font family selector (from Google Fonts or system fonts), font size scale, line height, letter spacing |
| **Visual Effects** | Grid visibility, grid opacity, grid size. Node blur amount, node border radius, node shadow intensity. Glow effects toggle. |
| **Mechanics** | Default snap grid size, default zoom speed, double-click behavior (zoom to node / open editor / both), port snap angle |
| **Canvas** | Background pattern (dots, grid, none), background color, minimap toggle |

**Requirements:**
- Settings should persist to IndexedDB alongside the graph data.
- Settings should be stored in the Zustand store and reactive (changing a color updates the canvas immediately).
- The panel should be a slide-out drawer or modal, not a separate page.
- Include a "Reset to Defaults" button per section and globally.

**Current State:**
- `Sidebar.tsx` line 84: Settings gear icon exists but has no `onClick` handler.
- `store.ts` has a `theme: string` field reserved but unused.
- No settings UI or settings data model exists.

---

### 13. Electron Wrapper & Native OS Integration

**Problem:** The app runs as a web app only. There is no plan for a desktop experience.

**Desired Behavior:**
- **Electron wrapper** that ships Knotess as a native Windows (and eventually macOS/Linux) desktop application.
- **Standard window controls:** minimize, maximize, close, custom title bar.
- **System tray icon:** with right-click menu (New Project, Open Recent, Quit).
- **Splash screen** on launch (branded loading screen while the app initializes).
- **Native file dialogs:** for Save As, Open, Export (replacing the browser `<a>` download hack).
- **File associations:** `.knotess` file extension registered to the app.

**Requirements:**
- Electron main process + preload script + renderer (the existing Next.js app).
- IPC bridge for file system operations (read/write `.knotess` files to disk).
- Auto-updater integration (Electron's `autoUpdater` or `electron-updater`).
- Proper app installer (NSIS for Windows, DMG for macOS).

**Current State:**
- No Electron infrastructure exists. The project is a pure Next.js web app.
- `package.json` has no Electron dependencies.

---

### 14. File Explorer & Workspace Explorer

**Problem:** There is no way to manage multiple graphs/files or see a project workspace.

**Desired Behavior — two explorer panels modeled after VS Code's sidebar:**

| Explorer | Purpose |
|---|---|
| **File Explorer** | Shows the files on disk (or in local storage). Browse `.knotess` files, open them, rename, delete, create new ones. |
| **Workspace Explorer** | Shows a higher-level "workspace" concept — multiple related projects/graphs grouped together. Think of it like VS Code's workspace that can contain multiple folders. |

**Requirements:**
- The Sidebar currently shows a node tree. The explorers should be **additional tabs** in the sidebar (like VS Code's Activity Bar: Explorer, Search, Source Control, etc.).
- File Explorer shows a flat or hierarchical list of saved graphs.
- Workspace Explorer shows a list of workspaces, each containing multiple files.
- For the web-only version (pre-Electron), files are IndexedDB entries. For the Electron version, these map to actual filesystem paths.
- Copy mechanics from VS Code:
  - Collapsible tree
  - Right-click context menu (Rename, Delete, Duplicate, Move)
  - Drag and drop to reorder
  - Breadcrumb path at the top

**Current State:**
- `Sidebar.tsx` has a single-purpose node tree and a search bar. No tab system, no file management.
- `store.ts` uses a single `STORAGE_KEY` — only one graph is stored.

---

## Architecture / Technical Summary

```
┌──────────────────────────────────────────────────────────────┐
│  Electron Shell (chunk_01 or future chunk)                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Renderer (Next.js App)                                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────────┐    │  │
│  │  │ Toolbar  │  │ Sidebar  │  │ Canvas            │    │  │
│  │  │ +STT btn │  │ +Tabs    │  │ +LOD System       │    │  │
│  │  │ +Align   │  │ +File    │  │ +Route Mode       │    │  │
│  │  │  toggle  │  │  Explorer│  │ +Alignment tools  │    │  │
│  │  │ +Export  │  │ +Workspace │ │ +Group Scale     │    │  │
│  │  │  menu    │  │  Explorer│  │ +Context menu v2  │    │  │
│  │  └──────────┘  │ +Settings│  └───────────────────┘    │  │
│  │                │  Panel   │                            │  │
│  │                └──────────┘                            │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ Zustand Store (lib/store.ts)                     │  │  │
│  │  │ +settings slice  +multi-file management          │  │  │
│  │  │ +LOD thresholds  +align-on-creation flag         │  │  │
│  │  │ +route connections  +group scale actions          │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ Viewer Component (standalone, exportable)        │  │  │
│  │  │ - Read-only Canvas + Node rendering              │  │  │
│  │  │ - Self-contained (inlineable to single HTML)     │  │  │
│  │  │ - Own "Export to JPEG" button                    │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Main Process                                          │  │
│  │  - Native file dialogs, system tray, splash screen     │  │
│  │  - IPC bridge for file I/O                             │  │
│  │  - Auto-updater                                        │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Open Discussion Points

> These areas have obvious technical gaps or ambiguity that should be resolved in the `/interview` workflow before implementation planning begins.

1. **LOD thresholds:** What exact pixel values should the default thresholds be? Should they be configurable via the Settings panel, or only via dev constants?
2. **Route mode color:** What color should represent Route mode? Orange, yellow, teal? How should tunnel vs parent-child vs sister routes be visually distinguished on the link line itself?
3. **STT scope:** Should STT be a floating global mic button (like mobile keyboards), or one mic icon per text field, or a toolbar toggle?
4. **Group scaling UI:** Should scaling be via a drag gesture (like a resize handle on the group boundary), a slider in a contextual popup, or keyboard shortcut (e.g., hold Ctrl+Shift+scroll)?
5. **Align on creation — column limits:** How many children per column before wrapping to a new column? Should the user pick this, or should it be a fixed default?
6. **HTML viewer — rendering approach:** Should the viewer re-use React (bundled in the export) for full interactivity, or should it use a lightweight vanilla JS renderer for smaller file size?
7. **Settings persistence:** Should settings be per-file (each graph has its own theme) or global (one settings set for the editor)?
8. **Electron priority:** Is the Electron shell part of this chunk, or should it be deferred to a later chunk since it has its own significant scope?
9. **File/Workspace Explorer scope:** For the web-only version, is IndexedDB multi-key storage sufficient, or does the user expect a virtual filesystem abstraction?
10. **Export image format:** Should the user be able to choose between PNG (lossless, larger) and JPEG (lossy, smaller), or is one format sufficient?
