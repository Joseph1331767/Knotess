# Knotess — Deep Audit Report

> **Auditor**: Antigravity Agent  
> **Date**: 2026-03-27  
> **Scope**: Full codebase (`app/`, `components/`, `hooks/`, `lib/`, root configs)  
> **Goal**: Stabilize and add upon — not redesign.

---

## Table of Contents
1. [Missing Standard Features](#1-missing-standard-features)
2. [Non-Standard / Scope-Specific Feature Suggestions](#2-non-standard--scope-specific-feature-suggestions)
3. [Dead Code](#3-dead-code)
4. [Memory Leaks](#4-memory-leaks)
5. [Bad Implementations & Anti-Patterns](#5-bad-implementations--anti-patterns)
6. [Minor Issues & Polish](#6-minor-issues--polish)

---

## 1. Missing Standard Features

These are features commonly expected in productivity / node-graph / canvas software that are currently absent.

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| 1.1 | **Keyboard Shortcuts** | 🔴 High | No keyboard shortcut system exists. Standard shortcuts like `Ctrl+Z` (undo), `Ctrl+S` (save), `Ctrl+C/V/X` (copy/paste/cut), `Delete` (delete node), `Escape` (deselect) are all missing. Users must click toolbar buttons for everything. |
| 1.2 | **Search / Filter Nodes** | 🔴 High | No way to search for a node by title/description. As graphs grow, this becomes essential. The sidebar tree has no filter/search input. |
| 1.3 | **Multi-Select via Marquee (Box Select)** | 🔴 High | Shift-click multi-select exists, but there is no drag-to-select (rubber band / marquee selection) on the canvas. This is standard in every node editor. |
| 1.4 | **Confirmation Dialogs for Destructive Actions** | 🟡 Medium | `deleteNode`, `deletePage`, `clear()`, and "Reset App" have no confirmation. A single misclick can destroy an entire project. |
| 1.5 | **Auto-Save / Dirty State Indicator** | 🟡 Medium | Save is manual only (button click). No auto-save on a timer or on state change. No visual indicator showing unsaved changes. |
| 1.6 | **Responsive / Mobile Layout** | 🟡 Medium | `use-mobile.ts` hook exists but is **never imported or used** anywhere. The UI is completely unresponsive on mobile — the sidebar, toolbar, and canvas have fixed widths and no mobile breakpoints. |
| 1.7 | **Accessible Color Picker for Nodes** | 🟡 Medium | `NodeData` has a `color` field but there is no UI to set it. Nodes all appear the same color. |
| 1.8 | **Zoom Controls UI** | 🟡 Medium | Zoom is scroll-wheel only. No zoom buttons (+/-), no zoom percentage indicator, no "fit to view" button. |
| 1.9 | **Error Boundaries** | 🟡 Medium | No React error boundaries exist. A crash in any component (e.g., a corrupt node) will white-screen the entire app. |
| 1.10 | **Tooltips / Onboarding** | 🟢 Low | No tooltips on canvas interactions. Right-click to cycle modes, port dragging, double-click to zoom — none of these are discoverable. |
| 1.11 | **Node Resizing** | 🟢 Low | Nodes have a fixed width (280px / 130px for buss). No resize handles. |
| 1.12 | **Canvas Item URL Editing** | 🟢 Low | Images, iframes, videos, and audio items are created with hardcoded placeholder URLs. There is no UI to edit the URL after creation. |

---

## 2. Non-Standard / Scope-Specific Feature Suggestions

These are features specific to the Knotess concept (infinite nested node graph + per-node canvas pages) that would significantly improve the product.

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| 2.1 | **Minimap / Overview Panel** | 🔴 High | With infinite zoom and nested nodes, users easily get lost. A minimap showing the entire graph with a viewport indicator is essential for navigation. |
| 2.2 | **Breadcrumb Navigation** | 🔴 High | When zoomed deep into nested children, there's no way to see or navigate back through the parent hierarchy. A breadcrumb trail (Root > Parent > Current) would solve this. |
| 2.3 | **Node Templates / Presets** | 🟡 Medium | All new nodes start as "New Node" with an empty description. Users should be able to define templates (e.g., "Task", "Idea", "Reference") with preset colors, pages, and descriptions. |
| 2.4 | **Canvas Item Connections** | 🟡 Medium | Items on a node's canvas pages are independent. Allowing items within a page to be linked (like a mini-node graph within a page) would be a powerful recursive feature. |
| 2.5 | **Multi-User / Collaboration** | 🟡 Medium | Data is stored in IndexedDB (browser-local). There is no backend, no sync, no multi-device support. Even a simple JSON export-to-cloud or WebSocket sync would add value. |
| 2.6 | **Node Tagging & Filtering** | 🟡 Medium | Nodes have title + description but no tags/labels. Adding a tag system with filtering on the sidebar tree would improve organization. |
| 2.7 | **Markdown Support in Text Items** | 🟢 Low | Canvas text items are plain text. Adding basic markdown rendering (headings, bold, lists, links) would make them much more useful for note-taking. |
| 2.8 | **Drag & Drop File Upload** | 🟢 Low | Canvas items (images, videos, audio) require URLs. Supporting drag-and-drop of local files (stored as blobs in IndexedDB) would be a significant UX improvement. |
| 2.9 | **Theming System** | 🟢 Low | `theme` state exists in the store but is never used. The UI is hardcoded to a dark theme. A proper light/dark toggle (or custom themes) would be a nice addition. |

---

## 3. Dead Code

| # | Location | Description |
|---|----------|-------------|
| 3.1 | [use-mobile.ts](file:///d:/soft/Knotess/hooks/use-mobile.ts) | **Entirely unused**. The `useIsMobile` hook is never imported anywhere in the codebase. |
| 3.2 | [utils.ts](file:///d:/soft/Knotess/lib/utils.ts) | **Entirely unused**. The `cn()` utility (clsx + tailwind-merge) is never called. Both `clsx` and `tailwind-merge` are installed dependencies with zero usage. |
| 3.3 | [store.ts L45](file:///d:/soft/Knotess/lib/store.ts#L45) | `NodeData.color` field — declared but never read or written by any UI component. |
| 3.4 | [store.ts L59](file:///d:/soft/Knotess/lib/store.ts#L59) | `AppState.theme` — initialized to `'dark'`, persisted to IndexedDB, but never consumed by any component for styling. |
| 3.5 | [store.ts L42](file:///d:/soft/Knotess/lib/store.ts#L42) | `NodeData.tunnelLinks` — while tunnel links are rendered, the `tunnelLinks` array is only ever *added to*, never cleaned up when nodes are deleted. Orphaned references accumulate. |
| 3.6 | [package.json](file:///d:/soft/Knotess/package.json) | `@google/genai` dependency — not imported or used anywhere. `@hookform/resolvers` — no form validation exists. `firebase-tools` — no Firebase configuration exists. `autoprefixer` — PostCSS config does not reference it. |
| 3.7 | [page.tsx L9-11](file:///d:/soft/Knotess/app/page.tsx#L9-L11) | Hardcoded "Debug Mode: Changes Reflected" banner — left over from development. |
| 3.8 | Multiple files | Excessive `console.log` statements left in production code (`Node.tsx:9`, `Sidebar.tsx:7`, `NodeEditor.tsx:10`, `Toolbar.tsx:10-13`, `Canvas.tsx:17`, `layout.tsx:13`). |

---

## 4. Memory Leaks

| # | Severity | Location | Description |
|---|----------|----------|-------------|
| 4.1 | 🔴 **Critical** | [Node.tsx L194-257](file:///d:/soft/Knotess/components/Node.tsx#L194-L257) | **Pointer event listeners on `window` are never cleaned up on unmount.** `handlePointerMove`/`handlePointerUp` are added to `window` via `addEventListener` inside `handlePointerDown`, but if the component unmounts while the user is mid-drag (e.g., node gets deleted, parent collapses), the `pointerup` handler never fires and the listeners permanently leak. This happens in **three separate places**: node dragging (L194), port dragging (L117), and port interaction (L492). |
| 4.2 | 🔴 **Critical** | [Node.tsx L44](file:///d:/soft/Knotess/components/Node.tsx#L44) | **`clickTimeoutRef` is never cleared on unmount.** If the component unmounts between the `setTimeout` call (L560) and its execution, the callback will fire on an unmounted component, causing React state update warnings and potential crashes. |
| 4.3 | 🟡 **Moderate** | [store.ts L63-64](file:///d:/soft/Knotess/lib/store.ts#L63-L64) | **Undo/Redo history grows unbounded.** `past` and `future` arrays are never capped. Every single node edit (including real-time dragging) pushes a full deep clone of the entire `nodes` object into `past`. On a graph with hundreds of nodes, this will consume memory rapidly and eventually crash the browser tab. |
| 4.4 | 🟡 **Moderate** | [Canvas.tsx L20-45](file:///d:/soft/Knotess/components/Canvas.tsx#L20-L45) | **Wheel event listener re-registers on every `camera` change.** The `useEffect` at L20 has `[camera, setCamera]` as dependencies, so it removes and re-adds the wheel listener on every zoom/pan. This is a performance concern and can cause event processing gaps during rapid scrolling. |
| 4.5 | 🟡 **Moderate** | [NodeEditor.tsx L22-55](file:///d:/soft/Knotess/components/NodeEditor.tsx#L22-L55) | Same issue as 4.4 — wheel event listener re-registers on every `camera` state change within the NodeEditor canvas. |

---

## 5. Bad Implementations & Anti-Patterns

| # | Severity | Location | Description |
|---|----------|----------|-------------|
| 5.1 | 🔴 **Critical** | [Node.tsx L46-65](file:///d:/soft/Knotess/components/Node.tsx#L46-L65) | **`useEffect` that calls `updateNode` on every render.** This effect measures the node's DOM height and writes it to the store. But writing to the store triggers a re-render, which re-runs the effect, which writes again. This creates a near-infinite render loop that only stops because `Math.round` eventually converges. It also pushes to undo history on every cycle. |
| 5.2 | 🔴 **Critical** | [store.ts L293](file:///d:/soft/Knotess/lib/store.ts#L293) | **`pushHistory()` is called on `updateNode`.** Since `updateNode` is called during *real-time dragging* (every `pointermove` event), hundreds of undo snapshots are created per second while dragging a node. Each snapshot is a `JSON.parse(JSON.stringify(nodes))` deep clone. This is extremely expensive for both CPU and memory. |
| 5.3 | 🟡 **Moderate** | [NodeEditor.tsx L18-20](file:///d:/soft/Knotess/components/NodeEditor.tsx#L18-L20) | **`setState` called during render.** `setActivePageId` is called directly in the render body (not inside `useEffect`), which is a React anti-pattern that triggers immediate re-renders and console warnings. |
| 5.4 | 🟡 **Moderate** | [Node.tsx — entire file](file:///d:/soft/Knotess/components/Node.tsx) | **1029-line monolith component.** This single file handles: node rendering, editing, dragging, port creation, port editing, port dragging, port relocation, connection line rendering, tunnel link rendering, collapse/expand, child rendering, and buss node logic. It should be decomposed into at least 4-5 sub-components. |
| 5.5 | 🟡 **Moderate** | [store.ts L117](file:///d:/soft/Knotess/lib/store.ts#L117) | **Deep cloning via `JSON.parse(JSON.stringify(...))`.** Used for undo history and clipboard operations. This is slow, doesn't handle `undefined` values, and breaks on circular references. Should use `structuredClone()` or a library like `immer`. |
| 5.6 | 🟡 **Moderate** | [Canvas.tsx L214](file:///d:/soft/Knotess/components/Canvas.tsx#L214) | **DOM query inside render (`document.querySelector`).** The linking line SVG in Canvas.tsx queries the DOM for port elements on every render frame. This is fragile, slow, and breaks the React data-flow model. |
| 5.7 | 🟢 **Minor** | [store.ts L110-111](file:///d:/soft/Knotess/lib/store.ts#L110-L111) | **Fire-and-forget IndexedDB writes.** `saveState` calls `set(STORAGE_KEY, ...)` with `.catch(console.error)` but never awaits it. Rapid state changes can cause write contention and potential data loss if the tab is closed mid-write. |
| 5.8 | 🟢 **Minor** | [Node.tsx L1021](file:///d:/soft/Knotess/components/Node.tsx#L1021) | **`Array.from(new Set(node.childrenIds))`** — deduplication of `childrenIds` in the render path is a band-aid for a data integrity bug. If duplicates exist in the data, they should be prevented at the store level, not filtered at render time. |
| 5.9 | 🟢 **Minor** | [Node.tsx L903](file:///d:/soft/Knotess/components/Node.tsx#L903) | Same issue — `Array.from(new Set(node.tunnelLinks))` deduplicates tunnel links at render time. |
| 5.10 | 🟢 **Minor** | [store.ts L304-334](file:///d:/soft/Knotess/lib/store.ts#L304-L334) | **`deleteNode` does not clean up tunnel links.** When a node is deleted, other nodes that have `tunnelLinks` pointing to the deleted node are not updated. This creates dangling references that the UI silently ignores but that pollute the data. |

---

## 6. Minor Issues & Polish

| # | Location | Description |
|---|----------|-------------|
| 6.1 | `globals.css` | CSS file contains only `@import "tailwindcss";` — no custom styles, no CSS variables, no design tokens. Everything is inline Tailwind classes. |
| 6.2 | `next.config.ts` | `output: 'standalone'` is set, which is intended for Docker/Cloud Run deployments. This adds overhead for local development and is unnecessary for a local-first app. |
| 6.3 | `.eslintrc.json` + `eslint.config.mjs` | Two ESLint configs exist simultaneously (legacy `.eslintrc.json` and flat `eslint.config.mjs`). This can cause confusion and conflicting rules. |
| 6.4 | `package.json` | App is named `ai-studio-applet` — should be renamed to `knotess` or similar. |
| 6.5 | `NodeEditor.tsx` | Canvas items use hardcoded placeholder URLs from `picsum.photos` and `w3schools.com`. These should at minimum have editable URL fields. |
| 6.6 | `Node.tsx` | The `console.log('Node rendered', id)` at L9 fires on **every render of every node**. In a graph with 50 nodes, this floods the console with hundreds of logs per second during pan/zoom. |

---

## Summary of Critical Action Items

> [!CAUTION]
> These items should be addressed before adding new features:

1. **Fix window event listener leaks** in `Node.tsx` (§4.1) — use `useEffect` cleanup or `AbortController`.
2. **Debounce or batch undo history** during drag operations (§5.2) — only push on `pointerup`, not every `pointermove`.
3. **Fix the height-measurement render loop** in `Node.tsx` (§5.1) — use `ResizeObserver` instead of `useEffect` + `updateNode`.
4. **Cap undo/redo history** (§4.3) — limit `past`/`future` to ~50 entries.
5. **Move `setActivePageId` into `useEffect`** in `NodeEditor.tsx` (§5.3).
6. **Add keyboard shortcuts** (§1.1) — minimum: undo, redo, save, delete, escape.
7. **Remove dead dependencies** from `package.json` (§3.6) and stale `console.log`s (§3.8).
8. **Add confirmation dialogs** for destructive actions (§1.4).
