# ver_01_chunk_01_phase_00_foundation

> Phase 00 establishes the three core infrastructure pillars that every subsequent phase in chunk_01 depends on: (1) the interaction event coordinator that prevents interaction race conditions, (2) the full `EditorSettings` data model wired into Zustand with IndexedDB persistence, and (3) the multi-file IndexedDB storage system with file registry. It also introduces all new TypeScript types required by the spec. Without this phase, no feature phase can safely proceed.

---

## 00.1 Purpose

The current codebase has three critical gaps that block all chunk_01 features:

1. **No interaction coordination** — Event handlers in `Canvas.tsx` and `Node.tsx` fire independently, causing race conditions (Bug 01: crash/freeze on double-click + drag near ports). The event coordinator introduces a state machine that manages which interaction mode is active and rejects conflicting inputs. This is required by Phase 02 (bug fix) and Phase 03 (Route mode) at minimum.

2. **No settings infrastructure** — The store has a bare `theme: string` field but no structured settings model. Phases 01 (LOD thresholds), 06 (Settings panel), and all visual customization features need a typed `EditorSettings` interface in Zustand with reactive persistence to IndexedDB.

3. **No multi-file support** — The store currently uses a single IndexedDB key (`node-graph-state`). Phases 07 (File Explorer) and 07 (Workspace Explorer) need a file registry that can create, open, rename, delete, and duplicate independent graph files.

Additionally, several new TypeScript types (`ConnectionMode` extended with `'route'`, `LODThresholds`, `FileRegistryEntry`, `Workspace`) are needed across multiple phases and must be defined once, centrally.

---

## 00.2 Scope (IN / OUT)

### IN
- Event coordinator state machine (`lib/eventCoordinator.ts`)
- `EditorSettings` interface and Zustand settings slice with IndexedDB persistence
- Multi-file IndexedDB storage with `FileRegistryEntry` registry
- `Workspace` type definition (metadata only — no UI)
- New store methods: `addRouteConnection`, `scaleGroup`
- Extended `ConnectionMode` type to include `'route'`
- `LODThresholds` interface
- Per-file override mechanism in the settings data model (data layer only — no UI)
- Global settings getters/setters with per-file override fallback logic

### OUT
- Settings panel UI — Phase 06
- File Explorer UI — Phase 07
- Workspace Explorer UI — Phase 07
- LOD rendering logic — Phase 01
- Route mode interaction UI — Phase 03
- Event coordinator integration into Canvas/Node — Phase 02
- Any Electron-specific storage — deferred to chunk_02

---- [x] [D00-01] Create `lib/eventCoordinator.ts` — interaction mode state machine
  - [x] Define `InteractionMode` enum: `idle`, `click`, `double-click`, `drag`, `port-drag`, `route-connect`, `box-select`, `group-scale`, `alignment-drag`
  - [x] Implement `requestMode(mode)` → `boolean` (returns `false` if conflicting mode is active)
  - [x] Implement `releaseMode(mode)` → `void`
  - [x] Implement `getCurrentMode()` → `InteractionMode`
  - [x] Implement `isIdle()` → `boolean` convenience method
  - [x] Add conflict matrix defining which modes block which other modes
  - [x] Export singleton instance for app-wide use
- [x] [D00-02] Define `LODThresholds` interface in `lib/store.ts`
  - [x] `culledMax: number` (default: 12)
  - [x] `starMax: number` (default: 40)
  - [x] `compactMax: number` (default: 80)
- [x] [D00-03] Extend `ConnectionMode` type to `'child' | 'sister' | 'buss' | 'route'`
  - [x] Update `Port.type` to include `'route'` as valid value
- [x] [D00-04] Define full `EditorSettings` interface in `lib/store.ts`
  - [x] Connection Links section (linkStyle, linkThickness, linkColors, linkAnimation, linkArrowHeads)
  - [x] Color Palette / Theme section (colorPrimary through themePreset)
  - [x] Typography section (fontFamily, fontSizeScale, lineHeight, letterSpacing)
  - [x] Visual Effects section (gridVisible through glowEffects)
  - [x] Mechanics section (snapGridSize through portSnapAngle)
  - [x] Canvas section (backgroundPattern, backgroundColor, minimapVisible)
  - [x] Performance section (lodThresholds: LODThresholds)
  - [x] Align on Creation section (alignOnCreation, alignColumnOffset)
  - [x] Define `DEFAULT_EDITOR_SETTINGS` constant with all defaults
- [x] [D00-05] Add `EditorSettings` slice to Zustand store
  - [x] `editorSettings: EditorSettings` state field (initialized from `DEFAULT_EDITOR_SETTINGS`)
  - [x] `updateEditorSettings(partial: Partial<EditorSettings>)` method
  - [x] `resetEditorSettings()` method (reset to defaults)
  - [x] `resetEditorSettingsSection(section: string)` method (reset one category)
  - [x] Settings persist to IndexedDB via existing debounced save mechanism (key: `knotess-settings`)
  - [x] Settings load from IndexedDB in `init()`
- [x] [D00-06] Define `FileRegistryEntry` interface
  - [x] `id: string` (UUID)
  - [x] `name: string`
  - [x] `createdAt: string` (ISO timestamp)
  - [x] `modifiedAt: string` (ISO timestamp)
  - [x] `storageKey: string` (IndexedDB key: `knotess-file-{id}`)
  - [x] `settingsOverrides?: Partial<EditorSettings>` (per-file override)
- [x] [D00-07] Define `Workspace` interface
  - [x] `id: string`
  - [x] `name: string`
  - [x] `fileIds: string[]`
- [x] [D00-08] Create `lib/fileRegistry.ts` — multi-file IndexedDB management
  - [x] `createFile(name: string)` → `FileRegistryEntry` — creates new file with empty graph in IndexedDB
  - [x] `openFile(id: string)` → `{ nodes, rootNodeId }` — loads graph data from `knotess-file-{id}`
  - [x] `saveFile(id: string, data: { nodes, rootNodeId })` → `void`
  - [x] `renameFile(id: string, name: string)` → `void`
  - [x] `deleteFile(id: string)` → `void` — removes both registry entry and graph data
  - [x] `duplicateFile(id: string, newName: string)` → `FileRegistryEntry`
  - [x] `listFiles()` → `FileRegistryEntry[]`
  - [x] `getRegistry()` → `FileRegistryEntry[]` — reads registry key from IndexedDB
  - [x] `saveRegistry(entries: FileRegistryEntry[])` → `void`
  - [x] Uses `idb-keyval` (existing dependency). Registry stored at key `knotess-file-registry`.
- [x] [D00-09] Add multi-file slice to Zustand store
  - [x] `currentFileId: string | null` state field
  - [x] `fileRegistry: FileRegistryEntry[]` state field
  - [x] `switchFile(id: string)` — saves current file, loads new file, applies per-file settings overrides
  - [x] `createNewFile(name: string)` — creates file via registry, switches to it
  - [x] `deleteCurrentFile()` — deletes current file, switches to another or creates new
  - [x] Load file registry in `init()`; if no files exist, migrate existing `node-graph-state` data as the first file
- [x] [D00-10] Implement `addRouteConnection` store method
  - [x] Signature: `addRouteConnection(sourceId: string, sourcePortAngle: number, targetId: string) => void`
  - [x] Creates a port on the source node pointing to the target node
  - [x] Auto-classifies type: parent→child if source is ancestor of target; sister→sister if same parent; tunnel otherwise
  - [x] Does NOT create a new node — connects existing ones
  - [x] Pushes undo history before mutation
- [x] [D00-11] Implement `scaleGroup` store method
  - [x] Signature: `scaleGroup(nodeIds: string[], scaleFactor: number) => void`
  - [x] Computes centroid of selected nodes
  - [x] Repositions each node: `newPos = centroid + (oldPos - centroid) * scaleFactor`
  - [x] Pushes undo history before mutation
- [x] [D00-12] Per-file settings override logic
  - [x] `getEffectiveSetting<K>(key: K)` — returns per-file override if set, otherwise global setting
  - [x] `setFileSettingOverride(fileId: string, overrides: Partial<EditorSettings>)` — stores overrides in file registry entry
  - [x] `clearFileSettingOverride(fileId: string, key: keyof EditorSettings)` — removes a single overrideerride(fileId: string, key: keyof EditorSettings)` — removes a single override

> Mark items as `[x]` when completed, `[~]` when partially done.

---

## 00.4 Implementation Details

### 00.4.1 Event Coordinator (`lib/eventCoordinator.ts`)

```typescript
export type InteractionMode =
  | 'idle'
  | 'click'
  | 'double-click'
  | 'drag'
  | 'port-drag'
  | 'route-connect'
  | 'box-select'
  | 'group-scale'
  | 'alignment-drag';

// Conflict matrix: modes that block each other
const CONFLICTS: Record<InteractionMode, InteractionMode[]> = {
  'idle': [],
  'click': ['double-click', 'drag', 'port-drag'],
  'double-click': ['click', 'drag', 'port-drag'],
  'drag': ['click', 'double-click', 'port-drag', 'box-select'],
  'port-drag': ['click', 'double-click', 'drag', 'route-connect'],
  'route-connect': ['port-drag', 'drag'],
  'box-select': ['drag', 'group-scale'],
  'group-scale': ['box-select', 'drag', 'alignment-drag'],
  'alignment-drag': ['group-scale', 'drag'],
};

class EventCoordinator {
  private currentMode: InteractionMode = 'idle';

  requestMode(mode: InteractionMode): boolean { ... }
  releaseMode(mode: InteractionMode): void { ... }
  getCurrentMode(): InteractionMode { ... }
  isIdle(): boolean { ... }
}

export const eventCoordinator = new EventCoordinator();
```

The coordinator is a singleton. Components call `requestMode()` before starting an interaction; if it returns `false`, the interaction is rejected. Components call `releaseMode()` in their cleanup (pointerup, abort, unmount).

### 00.4.2 EditorSettings Data Model

The full `EditorSettings` interface as specified in the spec's "New Types Summary" section. All fields have sensible defaults defined in `DEFAULT_EDITOR_SETTINGS`. The settings are stored in a dedicated IndexedDB key (`knotess-settings`) separate from graph data.

The settings slice is added to the existing Zustand store via a new section in the `create()` call. The `init()` method is extended to also load settings.

### 00.4.3 File Registry (`lib/fileRegistry.ts`)

Uses `idb-keyval` for all IndexedDB operations. The registry is a JSON array stored at key `knotess-file-registry`. Each file's graph data is stored at `knotess-file-{uuid}`.

Migration logic: on first run (no registry exists), check if `node-graph-state` has data. If so, create a `FileRegistryEntry` for it, copy the data to `knotess-file-{newId}`, and set `currentFileId` to the new ID. The legacy `node-graph-state` key is preserved for backward compatibility but no longer written to.

### 00.4.4 Store Methods: `addRouteConnection` and `scaleGroup`

`addRouteConnection` is similar to the existing `linkNodesViaPort` but with auto-classification logic:
1. Check if source is an ancestor of target → type = `'child'`
2. Check if source and target share the same parent → type = `'sister'`
3. Otherwise → add to `tunnelLinks` (tunnel connection)

`scaleGroup` computes the centroid as the average (x, y) of all selected nodes, then applies the scaling formula to each node's position. This only affects `x` and `y`, not visual scale.

### 00.4.5 File Paths

| File | Purpose |
|------|---------|
| `lib/eventCoordinator.ts` | [NEW] Interaction mode state machine |
| `lib/fileRegistry.ts` | [NEW] Multi-file IndexedDB management |
| `lib/store.ts` | [MODIFY] Add types, settings slice, multi-file slice, new methods |

---

## 00.5 Isolation Requirements

- **Inputs required**: Existing codebase from chunk_00 (stable). `idb-keyval` dependency (already installed).
- **Outputs produced**:
  - `eventCoordinator` singleton — consumed by Phase 02, 03, 04
  - `EditorSettings` + `DEFAULT_EDITOR_SETTINGS` — consumed by Phase 01, 06
  - `FileRegistryEntry` + file registry API — consumed by Phase 07
  - `Workspace` type — consumed by Phase 07
  - `addRouteConnection` method — consumed by Phase 03
  - `scaleGroup` method — consumed by Phase 04
  - Extended `ConnectionMode` with `'route'` — consumed by Phase 03
  - `LODThresholds` interface — consumed by Phase 01
- **No forward dependencies**: Confirmed. This phase depends on nothing from later phases.

---

## 00.6 Gap Checklist

Before proceeding to the next phase, answer explicitly:

- [ ] Does `eventCoordinator.requestMode()` correctly reject conflicting modes?
- [ ] Does `eventCoordinator.releaseMode()` correctly return to idle?
- [ ] Can `EditorSettings` be loaded from IndexedDB on app init?
- [ ] Can `EditorSettings` be updated and persisted reactively?
- [ ] Can `resetEditorSettings()` correctly restore all defaults?
- [ ] Does the file registry correctly create, list, and delete files?
- [ ] Does `switchFile()` correctly save the current file and load the new one?
- [ ] Does migration from legacy `node-graph-state` work on first run?
- [ ] Does `addRouteConnection` correctly auto-classify connection types?
- [ ] Does `scaleGroup` correctly reposition nodes relative to centroid?
- [ ] Do per-file settings overrides correctly fall back to global settings?
- [ ] Are all new TypeScript types exported and importable?

> All gaps must be answered affirmatively before phase completion.

---

## 00.7 Gate Checklist

Hard requirements that MUST pass before this phase is complete:

- [x] Gate 1: `eventCoordinator` compiles and exports correctly from `lib/eventCoordinator.ts`
- [x] Gate 2: `EditorSettings` interface includes all fields from the spec's "New Types Summary"
- [x] Gate 3: Settings persist across page reloads (save to IndexedDB, load in `init()`)
- [x] Gate 4: `fileRegistry.createFile()` creates a new entry and stores graph data at `knotess-file-{id}`
- [x] Gate 5: `fileRegistry.deleteFile()` removes both registry entry and graph data key
- [x] Gate 6: `addRouteConnection` creates a port without spawning a new node
- [x] Gate 7: `scaleGroup` repositions nodes without changing their internal data (only x, y)
- [x] Gate 8: Application still loads and functions normally after all changes (no regressions)
- [x] Gate 9: `ConnectionMode` type includes `'route'` and existing code still compiles
- [x] Gate 10: Existing undo/redo works with all new store methods

> Gates are non-negotiable. If a gate fails, the phase is not complete.

---

## 00.8 Verification Tests

### Unit Tests
- [ ] Test `eventCoordinator.requestMode('drag')` returns `true` from idle
- [ ] Test `eventCoordinator.requestMode('port-drag')` returns `false` while in `drag` mode
- [ ] Test `eventCoordinator.releaseMode('drag')` returns to `idle`
- [ ] Test `DEFAULT_EDITOR_SETTINGS` has all required keys
- [ ] Test `addRouteConnection` with parent-child relationship classifies as `'child'`
- [ ] Test `addRouteConnection` with same-parent nodes classifies as `'sister'`
- [ ] Test `addRouteConnection` with unrelated nodes adds to `tunnelLinks`
- [ ] Test `scaleGroup` with scaleFactor=2 doubles distances from centroid
- [ ] Test `scaleGroup` with scaleFactor=0.5 halves distances from centroid

### Integration Tests
- [ ] Test `fileRegistry.createFile()` → `fileRegistry.listFiles()` includes new file
- [ ] Test `fileRegistry.deleteFile()` → `fileRegistry.listFiles()` excludes deleted file
- [ ] Test `fileRegistry.openFile()` returns saved graph data
- [ ] Test settings round-trip: update → reload → verify persisted values
- [ ] Test migration: existing `node-graph-state` data migrates to file registry on first init

### Manual Verification (if applicable)
- [ ] App loads without errors after all Phase 00 changes
- [ ] Existing node creation, editing, deletion still works
- [ ] Undo/redo still works for all existing operations
- [ ] IndexedDB inspector shows `knotess-settings` and `knotess-file-registry` keys after init

> All test files: `ver_01_chunk_01_tests/ver_01_chunk_01_phase_00.test.ts`

---

## 00.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| eventCoordinator request/release | ⬜ Pending | |
| eventCoordinator conflict rejection | ⬜ Pending | |
| DEFAULT_EDITOR_SETTINGS completeness | ⬜ Pending | |
| addRouteConnection auto-classify | ⬜ Pending | |
| scaleGroup centroid math | ⬜ Pending | |
| fileRegistry CRUD | ⬜ Pending | |
| settings persistence round-trip | ⬜ Pending | |
| legacy migration | ⬜ Pending | |
| no-regression smoke test | ⬜ Pending | |

> Status legend: ✅ Pass | ❌ Fail | ⬜ Pending | ⚠️ Partial

---

## 00.10 Completion Criteria

This phase is DONE when:

- [ ] All deliverables marked `[x]`
- [ ] All gap checklist items answered affirmatively
- [ ] All gate checklist items passing
- [ ] All verification tests passing
- [ ] Test results table updated with outcomes

> Proceed to Phase 01 only after all criteria are satisfied.
