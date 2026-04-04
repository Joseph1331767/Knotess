# Interview 01 — Design Decisions
## ver_01 / chunk_01 / Upgrades & Refinements

> **Target Document:** `ver_01_chunk_01_design_thoughts_01_upgrades.md`
> **Date:** 2026-03-31
> **Status:** ✅ Complete — All 20 questions locked in

**How to answer:** Reply with just the IDs and letters, e.g. `A1: b, A2: your rec, B1: a`. You can also say `skip` to defer, or give a custom answer in your own words. Ask for clarification on any question.

---

# Section A — LOD / Zoom Culling System

---

**A1. What default screen-pixel thresholds should trigger each LOD state?**

Screen-pixel threshold means: "how many pixels tall/wide does a node appear on screen?" When a node falls below a certain pixel size (because you've zoomed way out), it switches to a simpler visual state to save performance and reduce clutter.

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Tight thresholds** — Culled: <8px, Star: 8–24px, Compact: 24–60px, Full: >60px | Aggressive culling, best performance, but nodes disappear sooner when zoomed out |
| **(b)** | **Balanced thresholds** — Culled: <12px, Star: 12–40px, Compact: 40–80px, Full: >80px | Good middle ground — nodes stay visible longer, smooth visual transitions |
| **(c)** | **Generous thresholds** — Culled: <6px, Star: 6–20px, Compact: 20–50px, Full: >50px | Nodes stay rendered longer, more visual detail at medium zoom, but more DOM elements active |

> **Top Recommendations:**
> 1. **(b)** — Balanced thresholds are what most professional graph editors (Unreal Blueprints, Houdini) use. They give a comfortable zoom range before things start simplifying, and the numbers align well with typical 1080p–4K screen densities.
> 2. **(a)** — If you expect users to build very deep graphs (10+ levels), tighter culling prevents the DOM from exploding. Better pick if performance is the primary concern.
>
> **Key tradeoff:** Visual richness at zoom-out vs. render performance with large graphs.

> ✅ **LOCKED — A1: (b) Balanced thresholds** — Culled: <12px, Star: 12–40px, Compact: 40–80px, Full: >80px. Good middle ground recommended for most screen densities.

---

**A2. Should the LOD thresholds be user-configurable in the Settings panel, or developer-only constants?**

This determines who can adjust the zoom thresholds — just you as the dev via code, or end-users via a settings UI.

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Dev constants only** — Hardcoded values in a config file, not exposed in the UI | Simplest to implement, cleaner settings panel, but users can't tune for their hardware/preferences |
| **(b)** | **Settings panel — Advanced section** — Expose as sliders under an "Advanced" or "Performance" section in settings | Users can tune to their setup, labeled as advanced so casual users aren't overwhelmed |
| **(c)** | **Both — dev constants + settings override** — Ship with sensible defaults, but let power users override via settings | Maximum flexibility, slightly more code to wire up |

> **Top Recommendations:**
> 1. **(c)** — Professional tools like Blender and Unreal expose performance tuning in advanced settings while maintaining solid defaults. This is the most forward-thinking approach.
> 2. **(a)** — If the settings panel is already packed with other items, deferring user-facing LOD controls keeps scope smaller for this chunk.
>
> **Key tradeoff:** Scope/complexity now vs. future flexibility.

> ✅ **LOCKED — A2: (c) Both — dev constants + settings override** — Ship with sensible defaults, power users can override via settings. Professional standard.

---

# Section B — Context Menu & Spellcheck

---

**B1. How should the right-click context menu interact with text fields for spellcheck?**

Right now, Knotess suppresses the browser's native right-click menu everywhere. This means when you right-click a misspelled word inside a text input, you can't see the browser's "Did you mean...?" suggestions.

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Smart passthrough** — If the right-click target is an `<input>`, `<textarea>`, or `contenteditable`, let the native browser context menu show. Otherwise show the Knotess custom context menu. | Clean separation, covers the exact use case, minimal code change |
| **(b)** | **Hybrid menu** — Show the Knotess context menu but inject spellcheck suggestions at the top when the target is a text field | More polished UX (like VS Code's right-click in the editor), but significantly more work to fetch spellcheck candidates from the browser API |

> **Top Recommendations:**
> 1. **(a)** — Smart passthrough is how virtually every desktop app handles this (Figma, Notion, Discord). It's the proven pattern, trivial to implement (one `if` statement), and users already expect native spell-check menus inside text fields.
> 2. **(b)** — Only worth it if you plan to add a custom dictionary, autocomplete, or AI rewording later. Extremely high effort for this chunk.
>
> **Key tradeoff:** Implementation simplicity vs. unified custom menu experience.

> ✅ **LOCKED — B1: (a) Smart passthrough** — If right-click target is a text input, show native browser context menu (with spellcheck). Otherwise show Knotess custom menu.

---

# Section C — Speech-to-Text (STT)

---

**C1. Where should the microphone button live?**

This determines how users activate voice dictation — through a single global toggle or per-field buttons.

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Global toolbar toggle** — One mic button in the top Toolbar. When active, any focused text field receives dictated text. | Clean, uncluttered nodes; one button to manage; mic state is always visible in the toolbar. Downside: less discoverable for new users. |
| **(b)** | **Per-field mic icon** — A small mic icon appears inside every text input (node title, description, port name, editor). | Very discoverable; directly adjacent to where text goes. Downside: visual clutter, especially on small nodes; many buttons to render. |
| **(c)** | **Floating dictation bubble** — Like the microphone on mobile keyboards. A floating pill/bubble appears at the bottom of the screen when activated (triggered by a keyboard shortcut like `Ctrl+Shift+M`). | Non-intrusive, doesn't add any buttons to the UI; familiar mobile pattern brought to desktop. Downside: needs keyboard shortcut discovery. |

> **Top Recommendations:**
> 1. **(c)** — Floating bubble is how Google Docs and modern mobile OS environments handle dictation. It doesn't pollute the node UI, works with any focused field, and the pill can show a live waveform/transcript preview. Very premium feel.
> 2. **(a)** — Toolbar toggle is the simpler version that achieves the same "activate once, dictate anywhere" goal. Better if you want faster implementation.
>
> **Key tradeoff:** Premium UX polish (floating bubble) vs. implementation speed (toolbar toggle).

> ✅ **LOCKED — C1: Custom variant of (c)** — Floating dictation bubble, but instead of appearing at screen bottom, it spawns at the corner of whichever textfield was just clicked. Activates via keyboard shortcut. Bubble stays contextually positioned near the active input.

---

**C2. Should STT support continuous dictation or single-phrase mode?**

The Web Speech API can either listen for one phrase and stop, or keep listening until you manually stop it. This affects how users interact with voice input during longer text entry.

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Single-phrase** — Mic listens, captures one sentence/phrase, inserts it, then auto-stops. User clicks mic again for more. | Simpler, avoids accidentally inserting ambient room noise; user has explicit control. |
| **(b)** | **Continuous** — Mic keeps listening until the user manually stops it. Text streams in as the user speaks. | More natural for dictating long descriptions; feels like a real dictation tool. Risk of capturing unintended speech. |
| **(c)** | **Continuous with auto-pause** — Continuous mode, but after 3–5 seconds of silence, it auto-pauses (not auto-stops). User can resume with a tap. | Best of both worlds — natural flow for long dictation, but doesn't run forever. Slightly more complex state management. |

> **Top Recommendations:**
> 1. **(c)** — Continuous with auto-pause is how professional dictation software (Dragon, Google Voice Typing) works. It feels natural and handles the "oops left the mic on" case gracefully.
> 2. **(a)** — Single-phrase is the safest MVP. If STT is a minor feature, this is low-effort and still useful.
>
> **Key tradeoff:** Natural dictation feel vs. simplicity and risk of ambient noise capture.

> ✅ **LOCKED — C2: (c) Continuous with auto-pause** — Continuous listening with 3–5 second silence auto-pause. Natural dictation flow with ambient noise protection.

---

# Section D — Route Mode & Connection System

---

**D1. What color should represent Route mode (the 4th connection mode)?**

Route mode creates connections between existing nodes without spawning a new node. It needs its own color identity alongside Child (blue), Sister (purple), and Buss (green).

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Orange** `#f97316` | Warm, attention-grabbing, already used in the codebase for "child drag glow" — may conflict |
| **(b)** | **Teal/Cyan** `#06b6d4` | Cool tone, visually distinct from all three existing mode colors, no existing conflict |
| **(c)** | **Amber/Gold** `#eab308` | Unique warm tone, distinct from orange; conveys "connection/routing" energy |
| **(d)** | **Rose/Pink** `#f43f5e` | Bold and distinct, but could conflict with red (delete/error) associations |

> **Top Recommendations:**
> 1. **(b)** — Teal/Cyan is maximally distinct from the existing blue-purple-green palette. It reads as "connectivity/networking" and doesn't conflict with any existing UI color (orange is used for child drag glow, red for delete).
> 2. **(c)** — Amber/Gold works well if you want a warm tone to contrast the cool palette. It has a nice "link/chain" connotation.
>
> **Key tradeoff:** Color distinctiveness vs. aesthetic harmony with the existing dark theme.

> ✅ **LOCKED — D1: (b) Teal/Cyan `#06b6d4`** — Maximally distinct from existing blue-purple-green palette. No conflicts with existing UI colors.

---

**D2. How should Route mode visually distinguish the three auto-classified connection types (parent-child route, sister-sister route, tunnel route)?**

When you use Route mode, the system auto-classifies the connection. The question is how the resulting line/link looks — should different route types look different, or all look the same?

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Uniform line — all teal dashed** — All routes look the same (teal dashed line), regardless of classification. The port dot color and a tooltip reveal the type. | Simplest; visually clean canvas. Downside: can't tell route types apart at a glance. |
| **(b)** | **Distinct line styles per type** — Parent-child routes use a solid line, sister-sister routes use a dashed line, tunnel routes use a dotted line. All in the Route color (teal). | Easy to distinguish at a glance; familiar pattern (Figma uses similar). More rendering logic. |
| **(c)** | **Distinct colors per type** — Parent-child routes use the child color (blue), sister routes use the sister color (purple), tunnels use teal. Line style is the same (e.g., thin solid). | Maximum clarity because colors match the existing mode colors. But Route mode loses its unique visual identity; routes look like normal connections. |
| **(d)** | **Teal base + subtle pattern markers** — All routes are teal, but parent-child routes have small arrow markers, sister routes have diamond markers, tunnels have circle markers along the line (similar to UML connector annotations). | Very professional, high information density. More SVG rendering work. |

> **Top Recommendations:**
> 1. **(b)** — Distinct line styles in the same Route color is the standard approach in professional node editors (Houdini, Substance Designer). It's clear, consistent, and keeps the Route identity while providing at-a-glance type info.
> 2. **(d)** — UML-style markers are premium and information-dense, but they're more work to render and can clutter dense graphs. Great for a future enhancement.
>
> **Key tradeoff:** Visual clarity vs. implementation complexity and canvas clutter.

> ✅ **LOCKED — D2: Already established — no changes** — The three connection types (parent-child, sister-sister, tunnel) already have their looks, behaviours, and themes implemented in the codebase. These are NOT changed by default. User should be able to alter visual styles in Settings if desired.

---

**D3. When Route mode is active and the user clicks the "+" button, how should the target selection work?**

Route mode connects two *existing* nodes instead of creating a new one. The UX for selecting the target node needs to be intuitive.

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Click-click** — User clicks "+" in Route mode, then clicks the target node. A banner/toast says "Select target node..." (similar to the current Link button's UX). | Familiar pattern from the existing link system; low risk. Requires two distinct clicks. |
| **(b)** | **Drag-release** — User drags from "+" toward the target node. A visual line follows the cursor (like current port drag). Releasing on a node creates the route. Releasing on empty space cancels. | Very tactile and satisfying; the visual line shows exactly what you're connecting. More immediate than click-click. |
| **(c)** | **Both** — Simple click enters "select-target" mode (click-click). Drag enters drag-release mode. Best of both worlds. | Maximum flexibility; matches how the current "+" already works (click = default, drag = positioned). Slightly more code paths but consistent with existing patterns. |

> **Top Recommendations:**
> 1. **(c)** — Supporting both is consistent with how the "+" button already works for child/sister/buss modes (click places at default, drag chooses angle). Users won't have to learn a new interaction model.
> 2. **(b)** — If you want to keep it simpler, drag-release alone is the most intuitive for a visual connection tool (like drawing a wire in Unreal Blueprints).
>
> **Key tradeoff:** Consistency with existing "+" behavior (both) vs. simpler single interaction model (drag only).

> ✅ **LOCKED — D3: (c) Both click-click and drag-release** — Consistent with existing "+" button behavior. Click enters select-target mode, drag enters drag-release mode.

---

# Section E — "+" Button Relocation

---

**E1. Where exactly should the "+" button sit when the node is selected (before any drag)?**

The "+" currently floats on the right edge of the node, overlapping ports. It needs a new home.

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **In the action bar** — Replace the removed Link button's position in the action bar (top-right row: Edit, ~~Link~~, Delete, **+**). | Cleanest; no floating elements; consistent toolbar layout. User must drag from inside the node to the perimeter for angled placement. |
| **(b)** | **Below the action bar** — A dedicated row below the Edit/Delete bar, slightly outside the node body. | Visually distinct from edit actions; less likely to be accidentally clicked when trying to edit/delete. Slightly more visual height per node. |
| **(c)** | **Bottom-center of the node** — Centered at the bottom edge, similar to how Figma's "Add auto-layout" button sits. | Ergonomic for column layouts (children naturally go below). But may overlap with ports at the bottom. |

> **Top Recommendations:**
> 1. **(a)** — Putting it in the action bar is the cleanest approach. The Link button is being removed, so there's a natural slot. It also groups all node actions together. The drag-to-perimeter mechanic already exists, so users can still angle their new connections.
> 2. **(c)** — Bottom-center is nice for visual hierarchy (create flows downward), but it introduces port overlap issues that were the original problem.
>
> **Key tradeoff:** Clean toolbar integration (a) vs. more prominent/accessible placement (c).

> ✅ **LOCKED — E1: Custom** — Nothing about the "+" button changes functionally. Only change: its starting/default position is now at the **top corner** of the node (instead of right edge). User still clicks and drags around perimeter to set port location. All existing mechanics remain identical.

---

# Section F — Alignment & Layout Tools

---

**F1. Should alignment commands be in the context menu, a floating toolbar, or both?**

When you select nodes and want to align them to a reference, where do those controls live?

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Context menu only** — Right-click on the reference node to see alignment options. Clean and discoverable. | Low UI footprint; consistent with other right-click actions. Slower workflow (right-click → pick option). |
| **(b)** | **Floating alignment toolbar** — When 2+ nodes are selected, a small toolbar appears near the selection with alignment icons (like Figma/PowerPoint). | Faster repeat alignment; always visible when relevant. Adds visual clutter; another floating element. |
| **(c)** | **Both + keyboard shortcuts** — Context menu for discovery, floating toolbar for speed, and keyboard shortcuts (e.g., `Alt+L` for align left) for power users. | Maximum accessibility at all skill levels. Most implementation work. |

> **Top Recommendations:**
> 1. **(c)** — Professional tools (Figma, Sketch, Illustrator) provide all three: menu for discovery, toolbar for visual speed, and shortcuts for experts. This is the AAA approach.
> 2. **(a)** — Context menu only is the right choice if you want to keep initial scope small. Floating toolbar and shortcuts can be added in a later chunk.
>
> **Key tradeoff:** Full professional tooling now (c) vs. incremental delivery (a then upgrade later).

> ✅ **LOCKED — F1: (c) Both + keyboard shortcuts** — Context menu for discovery, floating toolbar for speed, keyboard shortcuts for power users. Full professional tooling.

---

**F2. How should Group Scaling work from the user's perspective?**

When you want to spread out or compress a group of nodes (changing distances between them while keeping relative positions), what's the interaction?

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Drag handles on group boundary** — When a group is selected, a bounding box appears with corner handles. Dragging a handle scales the group (like resizing a shape in PowerPoint). | Very intuitive; visual feedback. Requires rendering a bounding box overlay and handle hit-testing. |
| **(b)** | **Scroll-wheel scale** — Hold a modifier key (e.g., `Ctrl+Shift`) and scroll to scale the selected group. | No extra UI; leverages existing scroll-zoom muscle memory. Harder to discover; may conflict with zoom. |
| **(c)** | **Context menu slider** — Right-click the group → "Scale Group" opens a small popup with a slider from 0.25× to 4×. Live preview as you drag the slider. | Precise control; non-modal; easy to implement. Requires an extra click to access. |
| **(d)** | **Drag from centroid marker** — A diamond marker appears at the group center. Dragging outward from it scales up, inward scales down. | Spatial and intuitive; directly tied to the center-of-gravity concept. Requires a visible centroid marker. |

> **Top Recommendations:**
> 1. **(a)** — Drag handles on the bounding box is the most universally understood interaction (Photoshop, Figma, PowerPoint). Users already know what corner handles mean.
> 2. **(c)** — Context menu slider is a safer MVP — less rendering work, precise numeric control, and can be implemented entirely in existing UI patterns.
>
> **Key tradeoff:** Visual intuitiveness of drag handles vs. simpler implementation of a slider popup.

> ✅ **LOCKED — F2: (a) Drag handles on group boundary** — Bounding box with corner handles when group selected. Drag to scale. Universally understood interaction pattern.

---

**F3. How many children per column before wrapping, for the "Align on Creation" feature?**

When "Align on Creation" is ON and you create children, they stack vertically. At some point, a column needs to wrap to a new column so the layout doesn't become a single infinitely tall stack.

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Fixed default: 5 per column** — After 5 children in one column, the next child starts a new column to the right. Not user-configurable. | Simple; good default for most use cases. No settings clutter. |
| **(b)** | **User-configurable: default 5** — Same as (a), but the user can change it in Settings. | Extra flexibility; trivial to add a number input in settings. |
| **(c)** | **Auto-adaptive** — The system calculates based on available viewport space. If the current column would extend beyond the viewport, it wraps. | Smart and dynamic; handles different zoom levels and screen sizes. More complex to implement; behavior may be surprising. |
| **(d)** | **No wrapping — infinite column** — Just keep stacking downward. The user manually reorganizes if they want multiple columns. | Simplest possible implementation. Matches the "dumb placement" philosophy — let the user do layout. |

> **Top Recommendations:**
> 1. **(b)** — A tuneable default is the sweet spot. 5 is a solid starting number (most node graphs have 2–7 children per parent). Adding one number input in Settings is trivial.
> 2. **(d)** — If you want to keep auto-alignment dead simple for this chunk, infinite column with manual reorg is the lowest-risk approach. Wrapping can be added later.
>
> **Key tradeoff:** Polished auto-layout with wrapping (b) vs. simplest-possible initial implementation (d).

> ✅ **LOCKED — F3: (d) No wrapping — infinite column** — Keep stacking downward. User manually reorganizes for multiple columns. Simplest implementation; wrapping can be added later.

---

# Section G — Export & Viewer

---

**G1. What image format(s) should the "Export as Image" feature support?**

When exporting the node graph as a picture, different formats serve different purposes.

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **PNG only** — Lossless, supports transparency (useful if the background is transparent or dark). | Universal format; no quality loss; larger file sizes for complex graphs. |
| **(b)** | **JPEG only** — Lossy compression, smaller files, no transparency. | Smaller files; familiar. But lossy compression may blur text on nodes. |
| **(c)** | **User choice: PNG or JPEG** — A dropdown in the export dialog lets the user pick. PNG default. | Maximum flexibility; trivial to implement since both are supported by `html2canvas`. |
| **(d)** | **PNG + SVG** — PNG for raster, SVG for scalable vector output. SVG allows infinite zoom without quality loss. | Premium; SVG is perfect for documentation. But SVG export from DOM is significantly harder than raster. |

> **Top Recommendations:**
> 1. **(c)** — Offering both PNG and JPEG is trivial (one `toDataURL` call with a different MIME type). Let the user choose; default to PNG.
> 2. **(d)** — SVG export would be outstanding for documentation and print, but it's a significantly larger scope item. Better deferred to a future chunk.
>
> **Key tradeoff:** Quick dual-format (c) vs. high-value but complex SVG support (d).

> ✅ **LOCKED — G1: Custom — Extreme resolution export (16K+)** — The exported image is a high-fidelity render at extreme resolution (16K or higher). JPEG is preferred for file size, but both JPEG and PNG should be available. This is a render export, not a screen capture.

---

**G2. How should the single-file HTML Viewer be built?**

The viewer needs to render the same graph, be interactive (click, zoom, pan), but be a single self-contained `.html` file. The implementation approach affects file size, interactivity, and maintenance burden.

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Bundle React + minimal app into the HTML** — Use a bundler to compile a stripped-down version of the current React app into a single HTML file with all JS/CSS inlined. | Full interactivity (zoom, pan, click into node internals); consistent rendering with the editor. Larger file size (~200KB–1MB depending on graph size). More complex export pipeline. |
| **(b)** | **Vanilla JS viewer** — Write a lightweight standalone viewer in plain JavaScript (no React) that reads the serialized graph data and renders it to Canvas2D or SVG. | Much smaller file size (~50KB + data). Faster to load. But requires maintaining a separate rendering codebase; visual parity with the React editor is harder. |
| **(c)** | **Static HTML snapshot** — Pre-render the entire graph to static HTML/CSS (no JavaScript for interactions). Just a visual snapshot you can scroll around. | Smallest file; works everywhere; no JS required. But no interactivity — can't click nodes, zoom, or pan. Basically a fancy image. |

> **Top Recommendations:**
> 1. **(a)** — Bundling a minimal React viewer gives full interactivity and visual parity with the editor. Modern bundlers (Vite, esbuild) can tree-shake aggressively. The file size penalty is acceptable for the value delivered. This is what tools like Miro and Excalidraw do for their export/share features.
> 2. **(b)** — Vanilla JS viewer is the right call if file size is critical (e.g., emailing the HTML). But maintaining a second rendering pipeline is a long-term burden.
>
> **Key tradeoff:** Full feature parity + one codebase (a) vs. smaller file size + separate codebase (b).

> ✅ **LOCKED — G2: (a) Bundle React + minimal app** — Full interactivity and visual parity with editor. Single self-contained HTML file with all JS/CSS inlined.

---

# Section H — Settings Panel

---

**H1. Should settings be per-file (each graph has its own theme/settings) or global (one settings set for the entire editor)?**

This determines whether opening a different graph also changes your color theme, font, grid style, etc.

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Global only** — One set of settings applies to the editor. Opening a new graph doesn't change your theme. | Simple data model; consistent experience. But can't have "this graph uses dark mode, that one uses light mode." |
| **(b)** | **Per-file only** — Each graph stores its own settings. Opening a graph restores its theme. | Maximum customization per project. But inconsistent editor experience; switching files changes your whole environment. |
| **(c)** | **Global + per-file overrides** — Global settings are the default. A graph can optionally override specific settings (e.g., "this graph uses a custom color palette"). Unoverridden settings fall back to global. | Best of both worlds; how VS Code's workspace settings work (global → workspace → folder). More complex data model, but proven pattern. |

> **Top Recommendations:**
> 1. **(c)** — Global + per-file overrides is the professional standard (VS Code, JetBrains IDEs, Unity). It gives maximum flexibility while maintaining a sane default. The override can be added incrementally — start with global only, then add the override mechanism later.
> 2. **(a)** — Global only is the right MVP. Per-file overrides can be added when multi-file management (Section I) is more mature.
>
> **Key tradeoff:** Future-proof architecture (c) vs. ship-fast simplicity (a with upgrade path to c).

> ✅ **LOCKED — H1: (c) Global + per-file overrides** — Global settings as default, per-graph optional overrides. VS Code workspace settings pattern.

---

**H2. How should the Settings panel be presented?**

Where and how the settings UI appears.

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Slide-out drawer from the right** — A panel slides in from the right edge of the screen, overlaying the canvas. Like Chrome DevTools or Discord settings. | Doesn't navigate away from the canvas; can see changes live. May obscure nodes. |
| **(b)** | **Full-screen modal** — A centered modal/dialog that covers most of the screen, with categorized tabs on the left. Like VS Code's Settings or Photoshop Preferences. | More room for complex settings; focused attention. Can't see the canvas while adjusting. |
| **(c)** | **Sidebar tab** — A new tab in the existing Sidebar (alongside the Node Explorer). Compact; always accessible. | Leverages existing UI real estate; no new overlay component. Limited width for complex settings. |
| **(d)** | **Slide-out drawer with live preview** — Same as (a) but with a transparency/see-through mode where you can see the canvas updating behind the drawer as you change settings. | Most premium feel; immediate feedback. Slightly more complex CSS (backdrop, pointer-events). |

> **Top Recommendations:**
> 1. **(d)** — Slide-out with live preview is the gold standard for design tools (Figma's right panel, Blender's Properties panel). Seeing changes in real-time is crucial for color/theme settings.
> 2. **(b)** — Full-screen modal is the standard for apps with many settings categories. Better if the settings panel is very dense.
>
> **Key tradeoff:** Real-time visual feedback (d) vs. more screen space for settings (b).

> ✅ **LOCKED — H2: (d) Slide-out drawer with live preview** — Slide-out from right with transparency/see-through so canvas updates are visible in real-time behind the drawer.

---

# Section I — Electron & Desktop Packaging

---

**I1. Should the Electron shell be included in this chunk, or deferred?**

Electron is a major addition — it's essentially wrapping the web app in a desktop application with native OS features (window controls, file dialogs, system tray, splash screen). It's a significant scope increase.

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Include in chunk_01** — Build the Electron wrapper, native file dialogs, system tray, splash screen as part of this upgrades chunk. | Everything delivered together; Electron can leverage the new export and settings features. But massively increases chunk scope and risk. |
| **(b)** | **Defer to its own chunk (chunk_02)** — chunk_01 focuses on all the web-based features. chunk_02 is a dedicated Electron packaging chunk. | Keeps chunk_01 manageable; Electron gets its own focused attention. But delays the desktop experience. |
| **(c)** | **Scaffold only** — In chunk_01, set up the basic Electron project structure (main process, preload, build scripts) but DON'T implement system tray, splash screen, native dialogs. Those come in a later chunk. | Gets the architecture in place early; devs can test in Electron during chunk_01. Minimal extra scope. |

> **Top Recommendations:**
> 1. **(b)** — A dedicated Electron chunk is the safest approach. Electron has its own unique challenges (IPC, security, build pipelines, auto-update, code signing) that deserve focused attention. Mixing it with 13 other features in chunk_01 is a recipe for a bloated, risky chunk.
> 2. **(c)** — Scaffolding is a good compromise if you want to start testing in a desktop window sooner, without committing to full native features.
>
> **Key tradeoff:** Focused delivery (b) vs. getting a head start on the desktop shell (c).

> ✅ **LOCKED — I1: (b) Defer to its own chunk (chunk_02)** — Electron gets dedicated focused attention in a separate chunk. Keeps chunk_01 manageable.

---

# Section J — File & Workspace Explorer

---

**J1. For the web-only version (before Electron), how should multi-file storage work?**

Currently Knotess stores exactly one graph in IndexedDB under a single key. Multi-file support requires a new storage approach.

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **IndexedDB multi-key** — Each graph gets its own IndexedDB key (e.g., `knotess-file-{uuid}`). A separate "registry" key lists all files with metadata (name, created, modified). | Simple extension of the current approach; no new dependencies. Works well for dozens of files; might get slow with hundreds. |
| **(b)** | **IndexedDB object store** — Use a proper IndexedDB object store (table) with indexes on filename, date, etc. More structured than key-value. | Better query performance; supports sorting and filtering natively. More complex setup; requires an IndexedDB schema migration. |
| **(c)** | **OPFS (Origin Private File System)** — Use the browser's modern file system API. Files are stored as actual files in a sandboxed filesystem. | True filesystem semantics; supports streaming reads/writes for huge graphs; works with File System Access API. More complex; not available in all browsers (no Firefox support as of 2026). |

> **Top Recommendations:**
> 1. **(a)** — Multi-key IndexedDB using `idb-keyval` (already a dependency) is the simplest and most pragmatic extension. You can manage dozens to a few hundred files without issues. When Electron arrives, the abstraction layer simply swaps IndexedDB calls for `fs` calls.
> 2. **(b)** — Object store is the right move if you expect users to accumulate hundreds of files and need fast search/sort. But it requires migrating from `idb-keyval` to raw IndexedDB or a library like Dexie.
>
> **Key tradeoff:** Lowest-friction extension (a) vs. proper schema for future scale (b).

> ✅ **LOCKED — J1: (a) IndexedDB multi-key** — Each graph gets its own key with a registry. Simplest extension using existing `idb-keyval`. Swappable for `fs` when Electron arrives.

---

**J2. How should the sidebar accommodate the new explorer tabs?**

The sidebar currently shows only the node tree. Adding file and workspace explorers means multiple views.

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Activity bar icons (VS Code style)** — A narrow vertical icon strip on the far left (File, Explorer, Settings). Clicking an icon switches the sidebar panel. | Very familiar to developers; proven pattern; minimal width. |
| **(b)** | **Tab bar at top of sidebar** — Horizontal tabs at the top of the current sidebar: "Nodes", "Files", "Workspace". | Simpler to implement; more discoverable. Uses vertical space at the top. |
| **(c)** | **Collapsible accordion sections** — All three panels stacked vertically in the sidebar, each collapsible. Like VS Code's Explorer that shows "Open Editors" + "File Explorer" in one panel. | Everything visible at once; quick switching. Can feel cramped in a 280px-wide sidebar. |

> **Top Recommendations:**
> 1. **(a)** — Activity bar is the gold standard for multi-panel sidebars. It's compact, scalable (easy to add more panels later), and your user already referenced VS Code as the model. Implementing this also sets up the architecture for future panels (search, version history, etc.).
> 2. **(b)** — Tab bar is simpler and faster to ship. Good MVP if activity bar feels like too much scope.
>
> **Key tradeoff:** Scalable architecture matching VS Code (a) vs. quick-ship tab bar (b).

> ✅ **LOCKED — J2: (a) Activity bar icons (VS Code style)** — Narrow vertical icon strip on far left. Scalable, compact, familiar to developers.

---

# Section K — Bug Fix & Stability

---

**K1. For Bug 01 (crash/freeze on double-click + drag near ports), what fix strategy should we use?**

The bug is a race condition between event handlers. There are different approaches to fixing it.

| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **(a)** | **Event mutex** — Add a state flag (`isHandlingInteraction`) that prevents overlapping event handlers. If port drag is in progress, suppress double-click zoom and vice versa. | Simple, targeted fix. Low risk. But relies on manually checking the flag everywhere. |
| **(b)** | **Debounce + event coordination layer** — Create a small event coordinator that manages which interaction mode is active (drag, port-drag, click, double-click) and rejects conflicting inputs. | More robust; prevents entire categories of interaction conflicts. More code, but a one-time investment. |
| **(c)** | **Fix in situ** — Just add specific guards to the exact conflict points (e.g., `if (isDraggingPort) return` at the top of `handleDoubleClick`). No new abstraction. | Minimal code change; fastest fix. But may need to add more guards as new interactions are added in the future. |

> **Top Recommendations:**
> 1. **(b)** — An event coordination layer pays dividends as you add more interaction modes (Route mode, group scaling, alignment drag). It's a small upfront investment (~50–100 lines) that prevents future race conditions systematically.
> 2. **(c)** — Quick targeted guards are fine if you want the fastest possible fix and plan to refactor event handling later.
>
> **Key tradeoff:** Systematic future-proofing (b) vs. fastest targeted fix (c).

> ✅ **LOCKED — K1: (b) Debounce + event coordination layer** — Small event coordinator managing active interaction modes. Prevents entire categories of interaction conflicts systematically.

---

# Progress Tracker

| Status | IDs |
|--------|-----|
| ⬜ Remaining | _(none)_ |
| ✅ Locked | A1(b), A2(c), B1(a), C1(custom), C2(c), D1(b), D2(established), D3(c), E1(custom), F1(c), F2(a), F3(d), G1(custom), G2(a), H1(c), H2(d), I1(b), J1(a), J2(a), K1(b) |

**Total: 20/20 questions locked across 11 sections.**

---

# Summary of Custom Decisions

| ID | Decision |
|----|----------|
| C1 | Floating dictation bubble spawns at the corner of the clicked textfield (variant of option c) |
| D2 | Already established in code — no default changes. Connection type visuals stay as-is. User can alter in Settings. |
| E1 | "+" button starting position moves to top corner of node. All other mechanics unchanged — user still drags around perimeter. |
| F3 | No wrapping — infinite column. User manually reorganizes. |
| G1 | Extreme resolution render export (16K+). JPEG preferred, but both JPEG and PNG available. |
