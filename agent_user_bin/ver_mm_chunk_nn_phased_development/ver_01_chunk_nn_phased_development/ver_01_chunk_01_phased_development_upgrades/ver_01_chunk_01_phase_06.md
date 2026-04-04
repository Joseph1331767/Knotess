# ver_01_chunk_01_phase_06_settings_panel

> Phase 06 builds the professional settings panel as a slide-out drawer from the right edge of the screen with live preview transparency (spec H1/H2). The panel exposes all setting categories defined in the `EditorSettings` model from Phase 00: Connection Links, Color/Themes, Typography, Visual Effects, Mechanics, Canvas, and Performance/LOD. Each setting control reactively updates the Zustand store so the canvas reflects changes in real-time behind the semi-transparent drawer. Settings persist to IndexedDB and support per-file overrides.

---

## 06.1 Purpose

Knotess currently hardcodes all visual and behavioral parameters. Users cannot customize link styles, colors, grid patterns, font choices, LOD thresholds, or snap behavior. The Settings panel unlocks full customization:

- **Visual identity** — Users can brand their graphs with custom color palettes, fonts, and themes
- **Workflow optimization** — Tune snap grid size, zoom speed, double-click behavior to personal preference
- **Performance tuning** — Power users can adjust LOD thresholds for their hardware (spec A2)
- **Live feedback** — The slide-out drawer with transparency lets users see the canvas updating behind the panel in real-time, which is critical for color/theme settings

The data model (`EditorSettings`) and persistence infrastructure were established in Phase 00. This phase builds the UI layer.

---

## 06.2 Scope (IN / OUT)

### IN
- `SettingsDrawer` slide-out component (from right, with backdrop transparency)
- 7 setting category sections (accordion/tab organized)
- Individual setting controls: sliders, color pickers, dropdowns, toggles, number inputs
- Reactive updates — changing a setting immediately updates the canvas
- "Reset to Defaults" per section and globally
- Per-file override indicator (show which settings are overridden for the current file)
- Settings gear icon in Sidebar wired to open the drawer
- Keyboard shortcut `Ctrl+,` to open/close settings

### OUT
- Creating new theme presets (future enhancement)
- Importing/exporting settings as JSON (future enhancement)
- Settings search/filter (can be added later)
- Per-file override UI for toggling individual overrides (foundation exists, UI is a simplification for this phase — show a "Reset this file's overrides" button)

---

## 06.3 Deliverables

- [ ] [D06-01] Create `components/SettingsDrawer.tsx` — main settings panel
  - [ ] Slide-in from right edge with CSS transform transition (300ms ease)
  - [ ] Semi-transparent backdrop: `bg-[#0d1117]/85 backdrop-blur-xl`
  - [ ] Full height panel, ~380px wide
  - [ ] Close button (X) and title bar
  - [ ] Scrollable content area
  - [ ] Accordion-style category sections (collapsible)
  - [ ] Footer: "Reset All to Defaults" button
  - [ ] Pointer events pass through the backdrop to the canvas for live preview interaction
- [ ] [D06-02] Create `components/settings/ConnectionLinksSettings.tsx`
  - [ ] Link style selector: dropdown (`bezier`, `straight`, `step`)
  - [ ] Link thickness: slider (1–8px, default 2)
  - [ ] Link color per type: 4 color pickers (child, sister, tunnel, buss/route)
  - [ ] Link animation: dropdown (`flow-dots`, `none`)
  - [ ] Arrow heads: toggle
  - [ ] "Reset Section" button
- [ ] [D06-03] Create `components/settings/ColorThemeSettings.tsx`
  - [ ] Color pickers for: primary, secondary, tertiary, background, node bg, text, accent
  - [ ] Dark/Light mode toggle
  - [ ] Theme preset selector: dropdown with presets (Midnight, Ocean, Forest, Ember, etc.)
  - [ ] Selecting a preset fills all color fields
  - [ ] "Reset Section" button
- [ ] [D06-04] Create `components/settings/TypographySettings.tsx`
  - [ ] Font family: dropdown with system fonts and popular Google Fonts (Inter, Roboto, Outfit, Fira Code, etc.)
  - [ ] Font size scale: slider (0.5–2.0×, default 1.0)
  - [ ] Line height: slider (1.0–2.5, default 1.5)
  - [ ] Letter spacing: slider (-1–5px, default 0)
  - [ ] "Reset Section" button
- [ ] [D06-05] Create `components/settings/VisualEffectsSettings.tsx`
  - [ ] Grid visibility: toggle
  - [ ] Grid opacity: slider (0–1, default 0.04)
  - [ ] Grid size: number input (10–200px, default 20)
  - [ ] Node blur: slider (0–20px, default 0)
  - [ ] Node border radius: slider (0–24px, default 16)
  - [ ] Node shadow intensity: slider (0–1, default 0.5)
  - [ ] Glow effects: toggle
  - [ ] "Reset Section" button
- [ ] [D06-06] Create `components/settings/MechanicsSettings.tsx`
  - [ ] Snap grid size: number input (5–100px, default 20)
  - [ ] Zoom speed: slider (0.5–3.0×, default 1.0)
  - [ ] Double-click behavior: dropdown (`zoom`, `edit`, `both`)
  - [ ] Port snap angle: number input (1–90°, default 15)
  - [ ] "Reset Section" button
- [ ] [D06-07] Create `components/settings/CanvasSettings.tsx`
  - [ ] Background pattern: dropdown (`dots`, `grid`, `none`)
  - [ ] Background color: color picker
  - [ ] Minimap visible: toggle (if minimap exists)
  - [ ] "Reset Section" button
- [ ] [D06-08] Create `components/settings/PerformanceSettings.tsx`
  - [ ] LOD threshold — Culled max: number input (1–50, default 12)
  - [ ] LOD threshold — Star max: number input (10–100, default 40)
  - [ ] LOD threshold — Compact max: number input (30–200, default 80)
  - [ ] Show current effective values vs. defaults
  - [ ] Warning: "Changing these values affects performance"
  - [ ] "Reset Section" button
- [ ] [D06-09] Wire settings gear icon in Sidebar to open drawer
  - [ ] The existing Settings icon button in `Sidebar.tsx` (line ~84) opens the SettingsDrawer
  - [ ] State: `isSettingsOpen: boolean` — managed in a parent layout component or Zustand
- [ ] [D06-10] Add keyboard shortcut `Ctrl+,` for settings
  - [ ] Register in `useKeyboardShortcuts.ts`
  - [ ] Toggle open/close the settings drawer
- [ ] [D06-11] Per-file override indicator
  - [ ] Show a subtle badge/indicator next to settings that are overridden for the current file
  - [ ] "Clear file overrides" button at the top of the drawer
  - [ ] Uses `getEffectiveSetting` logic from Phase 00
- [ ] [D06-12] Wire settings to canvas rendering
  - [ ] `Canvas.tsx`: read background pattern, background color, grid settings from `editorSettings`
  - [ ] `Node.tsx`: read node border radius, shadow, blur, colors from `editorSettings`
  - [ ] Connection rendering: read link style, thickness, colors from `editorSettings`
  - [ ] This makes all existing hardcoded visual values configurable

> Mark items as `[x]` when completed, `[~]` when partially done.

---

## 06.4 Implementation Details

### 06.4.1 SettingsDrawer Component Structure

```
SettingsDrawer
├── Title bar (title + close button)
├── Scroll container
│   ├── ConnectionLinksSettings (collapsible)
│   ├── ColorThemeSettings (collapsible)
│   ├── TypographySettings (collapsible)
│   ├── VisualEffectsSettings (collapsible)
│   ├── MechanicsSettings (collapsible)
│   ├── CanvasSettings (collapsible)
│   └── PerformanceSettings (collapsible)
├── Per-file override indicator
└── Footer (Reset All button)
```

### 06.4.2 Slide-In Animation

```typescript
// SettingsDrawer.tsx
<div
  className={`fixed top-0 right-0 h-full w-[380px] z-50 
    bg-[#0d1117]/85 backdrop-blur-xl border-l border-white/[0.08]
    shadow-[-8px_0_40px_rgba(0,0,0,0.6)]
    transform transition-transform duration-300 ease-out
    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
  `}
>
```

### 06.4.3 Setting Control Components

Reusable setting control wrappers:

```typescript
// SettingSlider — label + slider + value display
// SettingToggle — label + toggle switch
// SettingDropdown — label + select dropdown
// SettingColorPicker — label + color swatch + picker popup
// SettingNumberInput — label + number input with bounds
```

Each control reads from `editorSettings` and calls `updateEditorSettings({ key: newValue })` on change. Since the Zustand store is reactive, Canvas/Node immediately re-render with the new value.

### 06.4.4 Theme Presets

```typescript
const THEME_PRESETS: Record<string, Partial<EditorSettings>> = {
  midnight: {
    colorPrimary: '#1e293b', colorBackground: '#050505',
    colorNodeBg: '#0d1117', colorText: '#e2e8f0', ...
  },
  ocean: {
    colorPrimary: '#0369a1', colorBackground: '#0c1222', ...
  },
  forest: {
    colorPrimary: '#166534', colorBackground: '#0a1a0a', ...
  },
  ember: {
    colorPrimary: '#c2410c', colorBackground: '#1a0a05', ...
  },
};
```

### 06.4.5 Canvas/Node Wiring

Currently hardcoded values in Canvas.tsx and Node.tsx need to be replaced with reads from `editorSettings`:

- **Canvas background color**: currently `#050505` → `editorSettings.backgroundColor`
- **Grid lines**: currently hardcoded opacity → `editorSettings.gridOpacity`
- **Node border radius**: currently `rounded-2xl` → dynamic based on `editorSettings.nodeBorderRadius`
- **Node shadow**: currently hardcoded → dynamic based on `editorSettings.nodeShadowIntensity`

### 06.4.6 File Paths

| File | Purpose |
|------|---------|
| `components/SettingsDrawer.tsx` | [NEW] Main settings panel |
| `components/settings/ConnectionLinksSettings.tsx` | [NEW] Connection link settings |
| `components/settings/ColorThemeSettings.tsx` | [NEW] Color/theme settings |
| `components/settings/TypographySettings.tsx` | [NEW] Typography settings |
| `components/settings/VisualEffectsSettings.tsx` | [NEW] Visual effects settings |
| `components/settings/MechanicsSettings.tsx` | [NEW] Mechanics settings |
| `components/settings/CanvasSettings.tsx` | [NEW] Canvas settings |
| `components/settings/PerformanceSettings.tsx` | [NEW] Performance/LOD settings |
| `components/Sidebar.tsx` | [MODIFY] Wire gear icon to open drawer |
| `components/Canvas.tsx` | [MODIFY] Read visual settings from store |
| `components/Node.tsx` | [MODIFY] Read visual settings from store |
| `hooks/useKeyboardShortcuts.ts` | [MODIFY] Add Ctrl+, shortcut |

---

## 06.5 Isolation Requirements

- **Inputs required**: 
  - `EditorSettings` interface and `DEFAULT_EDITOR_SETTINGS` (Phase 00)
  - `updateEditorSettings`, `resetEditorSettings`, `resetEditorSettingsSection` store methods (Phase 00)
  - `getEffectiveSetting` for per-file overrides (Phase 00)
  - `editorSettings` state from store (Phase 00)
- **Outputs produced**: 
  - Settings UI (self-contained component tree)
  - Canvas/Node wired to use dynamic settings (visual changes)
  - `Ctrl+,` keyboard shortcut
- **No forward dependencies**: Confirmed.
- **Note**: Phase 06 is the first phase that makes the EditorSettings actually *visible* and *interactive* to the user. Previous phases that consume settings (Phase 01 LOD) already read from the store — now the user can change those values.

---

## 06.6 Gap Checklist

- [ ] Does the drawer slide in smoothly from the right?
- [ ] Is the canvas visible behind the semi-transparent drawer?
- [ ] Do all 7 setting sections render with correct controls?
- [ ] Does changing a color immediately update the canvas behind the drawer?
- [ ] Does changing the grid pattern immediately update the canvas?
- [ ] Does "Reset Section" correctly restore defaults for that section only?
- [ ] Does "Reset All" correctly restore all settings to defaults?
- [ ] Does `Ctrl+,` toggle the drawer open/close?
- [ ] Does the gear icon in Sidebar open the drawer?
- [ ] Do settings persist after page reload?
- [ ] Does the per-file override indicator correctly show overridden settings?
- [ ] Are all slider/number inputs bounded to valid ranges?

> All gaps must be answered affirmatively before phase completion.

---

## 06.7 Gate Checklist

- [ ] Gate 1: Drawer renders with 7 collapsible setting sections
- [ ] Gate 2: At least one setting from each category is reactive (changing it updates the canvas)
- [ ] Gate 3: Canvas background color is controlled by `editorSettings.backgroundColor` (not hardcoded)
- [ ] Gate 4: Settings persist to IndexedDB and reload correctly
- [ ] Gate 5: "Reset to Defaults" works globally and per-section
- [ ] Gate 6: Drawer is semi-transparent with live canvas visible behind it

> Gates are non-negotiable. If a gate fails, the phase is not complete.

---

## 06.8 Verification Tests

### Unit Tests
- [ ] Theme preset application fills all expected color fields
- [ ] Reset per-section only affects that section's fields
- [ ] Setting validation (slider bounds, number input bounds)

### Integration Tests
- [ ] Open drawer → change background color → canvas updates in real-time
- [ ] Change LOD threshold → zoom test → LOD transitions at new threshold
- [ ] Change grid opacity → canvas grid updates
- [ ] Close drawer → reopen → settings preserved
- [ ] Reload page → open drawer → settings match what was set before

### Manual Verification (if applicable)
- [ ] Drawer animation is smooth (no jank)
- [ ] All setting controls are usable and labeled clearly
- [ ] Color pickers work correctly (pick a color, see it applied)
- [ ] Toggle between theme presets and observe the canvas changing
- [ ] The drawer does not block canvas interaction when positioned correctly

> All test files: `ver_01_chunk_01_tests/ver_01_chunk_01_phase_06.test.ts`

---

## 06.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| Drawer slide-in/out | ⬜ Pending | |
| Reactive updates (color) | ⬜ Pending | |
| Reactive updates (grid) | ⬜ Pending | |
| Settings persistence | ⬜ Pending | |
| Reset to defaults | ⬜ Pending | |
| Theme presets | ⬜ Pending | |
| Per-file overrides | ⬜ Pending | |
| Keyboard shortcut | ⬜ Pending | |

> Status legend: ✅ Pass | ❌ Fail | ⬜ Pending | ⚠️ Partial

---

## 06.10 Completion Criteria

This phase is DONE when:

- [ ] All deliverables marked `[x]`
- [ ] All gap checklist items answered affirmatively
- [ ] All gate checklist items passing
- [ ] All verification tests passing
- [ ] Test results table updated with outcomes

> Proceed to Phase 07 only after all criteria are satisfied.
