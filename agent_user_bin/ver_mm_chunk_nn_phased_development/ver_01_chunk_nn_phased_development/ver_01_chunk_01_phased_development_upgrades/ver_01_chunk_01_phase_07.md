# ver_01_chunk_01_phase_07_activity_bar_file_workspace_explorer

> Phase 07 transforms the sidebar into a multi-panel system with a VS Code-style activity bar and builds the File Explorer and Workspace Explorer panels for managing multiple graphs (spec J1/J2). The activity bar is a narrow vertical icon strip on the far left, providing navigation between Node Tree, File Explorer, Workspace Explorer, and Settings panels. File and Workspace Explorers consume the multi-file IndexedDB registry from Phase 00.

---

## 07.1 Purpose

Currently, the sidebar only displays the node tree (tree view of all nodes in the current graph). With multi-file support (Phase 00), users need:

1. **File management** — Create, open, rename, delete, and duplicate graphs without resorting to browser developer tools
2. **Workspace organization** — Group related graphs into named workspaces for project-level organization
3. **Scalable navigation** — The activity bar pattern (VS Code model) supports adding more panels in the future (search, version history, etc.) without cluttering the sidebar

The activity bar replaces the hardcoded "Explorer" header in the current Sidebar with a dynamic panel switching system.

---

## 07.2 Scope (IN / OUT)

### IN
- `ActivityBar` component — narrow vertical icon strip on the far left
- Activity bar icons: Node Tree, File Explorer, Workspace Explorer, (Settings — opens drawer from Phase 06)
- `FileExplorer` panel — lists saved graphs from IndexedDB
- File operations: open, rename, delete, create new, duplicate
- Right-click context menu on files
- `WorkspaceExplorer` panel — workspace grouping concept
- Workspace operations: create, rename, delete, add/remove files
- Breadcrumb path at top of explorer panels
- Sidebar refactored to support activity bar switching
- Current file indicator (highlighted in File Explorer)

### OUT
- Drag-and-drop file reordering (future enhancement)
- File search/filter within explorer (can be added later — sidebar search already exists for nodes)
- File thumbnails/previews (future enhancement)
- Workspace color coding (future enhancement)
- Version history panel (future chunk)

---

## 07.3 Deliverables

- [x] [D07-01] Create `components/ActivityBar.tsx` — vertical icon navigation
  - [x] Narrow strip (~48px wide) on the far left of the sidebar
  - [x] Dark background matching sidebar
  - [x] Icon buttons: Node Tree (`FolderTree`), File Explorer (`Files`), Workspace Explorer (`Boxes`), Settings (`Settings`)
  - [x] Active panel indicator: left border highlight on the active icon
  - [x] Hover tooltips for each icon
  - [x] Settings icon opens the SettingsDrawer (from Phase 06) rather than switching panels
  - [x] Clicking an already-active panel icon collapses the sidebar
- [x] [D07-02] Create `components/FileExplorer.tsx` — file management panel
  - [x] List all files from `fileRegistry` (Phase 00)
  - [x] Each file shows: name, modified date, file size indicator
  - [x] Current file highlighted with accent color
  - [x] Click to open: calls `switchFile(id)` from store
  - [x] "New File" button at the top (calls `createNewFile()`)
  - [x] Right-click context menu per file:
    - [x] Open
    - [x] Rename (inline editable)
    - [x] Duplicate
    - [x] Delete (with confirmation dialog)
  - [x] Empty state: "No files yet. Create one to get started."
  - [x] Sort by: name or modified date (toggle)
- [x] [D07-03] Create `components/WorkspaceExplorer.tsx` — workspace management
  - [x] List all workspaces from IndexedDB
  - [x] Each workspace shows: name, number of files
  - [x] Expandable: clicking a workspace shows its files
  - [x] "New Workspace" button
  - [x] Right-click context menu per workspace:
    - [x] Rename
    - [x] Delete (with confirmation — does NOT delete contained files)
    - [x] Add current file to workspace
  - [x] Right-click context menu per file within a workspace:
    - [x] Open
    - [x] Remove from workspace (does NOT delete the file)
  - [x] Workspace CRUD operations via `lib/fileRegistry.ts` (or new `lib/workspaceRegistry.ts`)
- [x] [D07-04] Add workspace storage to `lib/fileRegistry.ts` (or new file)
  - [x] `createWorkspace(name: string)` → `Workspace`
  - [x] `renameWorkspace(id: string, name: string)` → `void`
  - [x] `deleteWorkspace(id: string)` → `void`
  - [x] `addFileToWorkspace(workspaceId: string, fileId: string)` → `void`
  - [x] `removeFileFromWorkspace(workspaceId: string, fileId: string)` → `void`
  - [x] `listWorkspaces()` → `Workspace[]`
  - [x] Storage key: `knotess-workspaces`
- [x] [D07-05] Refactor `components/Sidebar.tsx` to support panel switching
  - [x] Remove hardcoded "Explorer" header
  - [x] Accept `activePanel: 'tree' | 'files' | 'workspaces'` prop or state
  - [x] Render the appropriate panel based on `activePanel`
  - [x] Node Tree panel: existing tree view (move current sidebar content here)
  - [x] Maintain search functionality in Node Tree panel
  - [x] Layout: ActivityBar (48px) + Panel Content (remaining width)
- [x] [D07-06] Add breadcrumb path at top of explorer panels
  - [x] File Explorer: "Files" breadcrumb
  - [x] Workspace Explorer: "Workspaces > [Workspace Name]" breadcrumb when expanded
  - [x] Node Tree: "Nodes > [Current File Name]" breadcrumb
  - [x] Clicking breadcrumb segments navigates up the hierarchy
- [x] [D07-07] Wire sidebar layout into main app
  - [x] Update `app/page.tsx` layout to include `ActivityBar` alongside `Sidebar`
  - [x] ActivityBar always visible; Sidebar panel area toggleable
  - [x] Collapsing: clicking the active panel icon hides the sidebar panel (activity bar stays visible)

> Mark items as `[x]` when completed, `[~]` when partially done.

---

## 07.4 Implementation Details

### 07.4.1 Activity Bar Design

```
┌──────┬──────────────────────────────────────────────────┐
│ 🔽   │                                                  │
│ 📁   │    [Panel Content]                               │
│ 📦   │    (Node Tree / File Explorer / Workspace)       │
│      │                                                  │
│ ⚙️   │                                                  │
│      │                                                  │
└──────┴──────────────────────────────────────────────────┘
 48px           ~224px (remaining of 272px total)
```

The activity bar is a flex column with icons centered, separated from the panel content by a subtle border.

### 07.4.2 File Explorer UI

```typescript
const FileExplorer = () => {
  const { fileRegistry, currentFileId, switchFile, createNewFile } = useStore();
  
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-white/[0.05] flex justify-between">
        <span className="text-xs font-bold text-neutral-400 uppercase">Files</span>
        <button onClick={() => createNewFile('Untitled')} title="New File">
          <FilePlus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {fileRegistry.map(file => (
          <FileListItem 
            key={file.id} 
            file={file} 
            isActive={file.id === currentFileId}
            onOpen={() => switchFile(file.id)}
          />
        ))}
      </div>
    </div>
  );
};
```

### 07.4.3 Workspace Storage

Workspaces are stored as a JSON array in IndexedDB at key `knotess-workspaces`. Each workspace references file IDs — it does NOT contain file data. Deleting a workspace removes the grouping but preserves the files.

### 07.4.4 Sidebar Refactor Strategy

The current `Sidebar.tsx` becomes a container that renders the appropriate panel:

```typescript
const Sidebar = ({ activePanel }: { activePanel: 'tree' | 'files' | 'workspaces' }) => {
  return (
    <div className="w-56 bg-gradient-to-b ...">
      {activePanel === 'tree' && <NodeTreePanel />}
      {activePanel === 'files' && <FileExplorer />}
      {activePanel === 'workspaces' && <WorkspaceExplorer />}
    </div>
  );
};
```

The existing node tree rendering logic (renderTree, search, etc.) moves into a `NodeTreePanel` component extracted from the current Sidebar.

### 07.4.5 File Paths

| File | Purpose |
|------|---------|
| `components/ActivityBar.tsx` | [NEW] Vertical icon navigation |
| `components/FileExplorer.tsx` | [NEW] File management panel |
| `components/WorkspaceExplorer.tsx` | [NEW] Workspace management panel |
| `components/NodeTreePanel.tsx` | [NEW] Extracted from Sidebar — node tree view |
| `components/Sidebar.tsx` | [MODIFY] Refactored to panel switching container |
| `lib/fileRegistry.ts` | [MODIFY] Add workspace CRUD operations |
| `app/page.tsx` | [MODIFY] Layout update to include ActivityBar |

---

## 07.5 Isolation Requirements

- **Inputs required**: 
  - `FileRegistryEntry` type and file registry API (Phase 00)
  - `Workspace` type (Phase 00)
  - `switchFile`, `createNewFile`, `fileRegistry` store fields (Phase 00)
  - SettingsDrawer opener (Phase 06 — the Settings icon in the activity bar triggers it)
- **Outputs produced**: 
  - Multi-panel sidebar with activity bar (structural UI change)
  - File Explorer for managing multiple graphs
  - Workspace Explorer for organizing files
  - Workspace storage operations
- **No forward dependencies**: Confirmed.
- **Note**: This phase has a dependency on Phase 06 only for the Settings icon behavior. If Phase 06 is not yet complete, the Settings icon can be a no-op placeholder.

## 07.5.1 Soft Dependency on Phase 06

The Settings icon in the activity bar opens the SettingsDrawer from Phase 06. If Phase 06 is not yet implemented, the icon should still render but show a "Settings coming soon" tooltip or simply do nothing. This is a non-blocking soft dependency.

---

## 07.6 Gap Checklist

- [x] Does the activity bar render with all 4 icons?
- [x] Does clicking each activity bar icon switch the sidebar panel?
- [x] Does the File Explorer list all files from the registry?
- [x] Can the user create a new file from the File Explorer?
- [x] Can the user rename a file via the right-click menu?
- [x] Can the user delete a file (with confirmation)?
- [x] Can the user duplicate a file?
- [x] Does clicking a file in the explorer switch to that file's graph?
- [x] Is the current file highlighted in the list?
- [x] Does the Workspace Explorer list workspaces?
- [x] Can the user create, rename, and delete workspaces?
- [x] Can the user add/remove files from workspaces?
- [x] Does the node tree panel still work as before (with search)?
- [x] Does clicking the active panel icon collapse the sidebar?
- [x] Are breadcrumbs displayed at the top of each panel?

> All gaps must be answered affirmatively before phase completion.

---

## 07.7 Gate Checklist

- [x] Gate 1: Activity bar renders with at least 3 icon buttons (tree, files, workspaces)
- [x] Gate 2: File Explorer lists files from IndexedDB and opens them on click
- [x] Gate 3: Creating a new file from File Explorer creates a new graph and switches to it
- [x] Gate 4: Deleting a file removes it from both the registry and IndexedDB
- [x] Gate 5: Node Tree panel still renders the correct tree for the current file
- [x] Gate 6: Sidebar width doesn't change (activity bar fits within the existing width)

> Gates are non-negotiable. If a gate fails, the phase is not complete.

---

## 07.8 Verification Tests

### Unit Tests
- [x] `createWorkspace` → `listWorkspaces` includes new workspace
- [x] `deleteWorkspace` → `listWorkspaces` excludes deleted workspace
- [x] `addFileToWorkspace` → workspace's `fileIds` includes the file
- [x] `removeFileFromWorkspace` → workspace's `fileIds` excludes the file
- [x] Panel switching: `activePanel = 'files'` renders FileExplorer

### Integration Tests
- [x] Create file → appears in File Explorer list
- [x] Open file → canvas shows that file's graph
- [x] Delete file → removed from explorer, another file loaded
- [x] Create workspace → add files → workspace shows files
- [x] Delete workspace → files still exist in File Explorer
- [x] Activity bar: click tree icon → node tree shown; click files icon → file explorer shown

### Manual Verification (if applicable)
- [x] Activity bar icons are visually clear and properly spaced
- [x] File Explorer has correct styling (dark theme, hover states, active indicator)
- [x] Right-click context menus appear at the correct position
- [x] Inline rename works (click rename → edit in place → press Enter)
- [x] Sidebar collapse/expand works when clicking the active panel icon
- [x] Breadcrumbs navigate correctly

> All test files: `ver_01_chunk_01_tests/ver_01_chunk_01_phase_07.test.ts`

---

## 07.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| Activity bar rendering | ⬜ Pending | |
| Panel switching | ⬜ Pending | |
| File CRUD operations | ⬜ Pending | |
| File Explorer UI | ⬜ Pending | |
| Workspace CRUD | ⬜ Pending | |
| Workspace Explorer UI | ⬜ Pending | |
| Sidebar refactor | ⬜ Pending | |
| Breadcrumbs | ⬜ Pending | |

> Status legend: ✅ Pass | ❌ Fail | ⬜ Pending | ⚠️ Partial

---

## 07.10 Completion Criteria

This phase is DONE when:

- [x] All deliverables marked `[x]`
- [x] All gap checklist items answered affirmatively
- [x] All gate checklist items passing
- [x] All verification tests passing
- [x] Test results table updated with outcomes

> Proceed to Phase 08 only after all criteria are satisfied.
