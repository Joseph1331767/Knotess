# ver_01_chunk_00_phase_03_standard_features

> This phase adds the minimum set of standard features expected of a productivity/node-graph editor: keyboard shortcuts, confirmation dialogs, auto-save indicator, sidebar search, error boundaries, and zoom controls.

---

## 03.1 Purpose

The app lacks basic interactive features that users expect from any productivity tool. Without keyboard shortcuts, users must use the mouse for everything. Without confirmations, a misclick can destroy data. Without search, large graphs are unnavigable. Without error boundaries, any bug crashes the entire app. These are table-stakes features.

---

## 03.2 Scope (IN / OUT)

### IN
- `useKeyboardShortcuts` hook (new file)
- `window.confirm()` for destructive actions
- Auto-save indicator in toolbar
- Filter-as-you-type search in sidebar
- React error boundary component (new file)
- Zoom controls pill (new component)

### OUT
- Custom modal components (deferred to future chunk)
- Canvas item URL editing (deferred)
- Theme toggling (deferred)
- Mobile responsiveness (deferred)

---

## 03.3 Deliverables

- [ ] [D03-01] Create `useKeyboardShortcuts` hook
- [ ] [D03-02] Wire keyboard shortcuts into Canvas
- [ ] [D03-03] Add `window.confirm()` to destructive actions
- [ ] [D03-04] Add auto-save indicator to toolbar
- [ ] [D03-05] Add search input to sidebar
- [ ] [D03-06] Create ErrorBoundary component
- [ ] [D03-07] Wrap app in ErrorBoundary
- [ ] [D03-08] Create ZoomControls component
- [ ] [D03-09] Add ZoomControls to Canvas

---

## 03.4 Implementation Details

### 03.4.1 Create useKeyboardShortcuts Hook [D03-01]

**Create file:** `d:\soft\Knotess\hooks\useKeyboardShortcuts.ts`

```typescript
'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

export function useKeyboardShortcuts() {
  const { undo, redo, cut, copy, paste, save, deleteNode, selectedNodeIds, clearSelection, rootNodeId } = useStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't fire shortcuts when typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (isCtrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (isCtrl && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (isCtrl && e.key === 's') {
        e.preventDefault();
        save();
      } else if (isCtrl && e.key === 'x') {
        e.preventDefault();
        cut();
      } else if (isCtrl && e.key === 'c') {
        e.preventDefault();
        copy();
      } else if (isCtrl && e.key === 'v') {
        e.preventDefault();
        paste(selectedNodeIds[0] || rootNodeId, 200, 200);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 0) {
          e.preventDefault();
          const confirmed = window.confirm(
            `Delete ${selectedNodeIds.length} selected node(s)? This cannot be undone.`
          );
          if (confirmed) {
            selectedNodeIds.forEach((id) => deleteNode(id));
          }
        }
      } else if (e.key === 'Escape') {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, cut, copy, paste, save, deleteNode, selectedNodeIds, clearSelection, rootNodeId]);
}
```

### 03.4.2 Wire Keyboard Shortcuts into Canvas [D03-02]

**File:** `d:\soft\Knotess\components\Canvas.tsx`

**Step 1 — Import the hook at the top:**
```typescript
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
```

**Step 2 — Call the hook inside the Canvas component body, before the return statement:**
```typescript
  useKeyboardShortcuts();
```

### 03.4.3 Add Confirmation Dialogs [D03-03]

Add `window.confirm()` to these destructive actions:

**File: `components/Toolbar.tsx`**

In `handleNew` (clear project), find:
```typescript
  const handleNew = async () => {
    try {
      await clear();
```

**Replace with:**
```typescript
  const handleNew = async () => {
    const confirmed = window.confirm('Create a new project? All unsaved changes will be lost.');
    if (!confirmed) return;
    try {
      await clear();
```

In `handleResetApp`, find:
```typescript
  const handleResetApp = async () => {
    try {
```

**Replace with:**
```typescript
  const handleResetApp = async () => {
    const confirmed = window.confirm('Reset the entire app? This will delete ALL data and cannot be undone.');
    if (!confirmed) return;
    try {
```

**File: `components/Node.tsx`**

Find the delete button onClick (around line 352):
```typescript
                    <button onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
```

**Replace with:**
```typescript
                    <button onClick={(e) => { 
                      e.stopPropagation(); 
                      if (window.confirm('Delete this node and all its children?')) {
                        deleteNode(id); 
                      }
                    }}
```

Also find the buss node delete button (around line 366-367) and apply the same pattern.

**File: `components/NodeEditor.tsx`**

Find the page delete button (around line 143-146):
```typescript
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(activeNodeId, page.id);
```

**Replace with:**
```typescript
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this page?')) {
                            deletePage(activeNodeId, page.id);
                          }
```

### 03.4.4 Auto-Save Indicator [D03-04]

**File: `d:\soft\Knotess\lib\store.ts`**

**Step 1 — Add a `lastSavedAt` field to AppState interface:**

Find in the interface:
```typescript
  isSnapEnabled: boolean;
```

Add below it:
```typescript
  lastSavedAt: number | null;
```

**Step 2 — Initialize it:**

In the store's initial state (inside `return {`), add:
```typescript
    lastSavedAt: null,
```

**Step 3 — Update it when save completes.** In the `flushSave` function (added in Phase 01), after the IndexedDB write, update:

```typescript
  const flushSave = () => {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const { nodes, rootNodeId, camera, theme, isSnapEnabled } = getStore();
    set(STORAGE_KEY, { nodes, rootNodeId, camera, theme, isSnapEnabled })
      .then(() => {
        setStore({ lastSavedAt: Date.now() });
      })
      .catch(console.error);
  };
```

**File: `d:\soft\Knotess\components\Toolbar.tsx`**

**Step 1 — Import and use lastSavedAt:**

In the destructured store call, add `lastSavedAt`:
```typescript
  const { undo, redo, cut, copy, paste, addNode, save, selectedNodeIds, nodes, rootNodeId, setCamera, clear, isSnapEnabled, toggleSnap, lastSavedAt } = useStore();
```

**Step 2 — Add the indicator.** Find the save button (around line 144). Just before it, add:

```tsx
        {lastSavedAt && (
          <span className="text-[10px] text-neutral-500 mr-2">
            Saved {Math.round((Date.now() - lastSavedAt) / 1000)}s ago
          </span>
        )}
```

**Note:** This shows a static "Saved Xs ago" text. For a live-updating timer, you'd need a setInterval, but for chunk 00 this static display is sufficient — it updates whenever the toolbar re-renders.

### 03.4.5 Sidebar Search [D03-05]

**File:** `d:\soft\Knotess\components\Sidebar.tsx`

**Step 1 — Add search state.** After the existing `useStore` call:

```typescript
  const [searchQuery, setSearchQuery] = useState('');
```

Also add `useState` to the React import:
```typescript
import { useState } from 'react';
```

**Step 2 — Add search input UI.** Find the sidebar header (around line 51-55):
```typescript
      <div className="p-5 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.02] shadow-sm">
        <h2 className="font-bold text-[11px] tracking-[0.2em] uppercase text-neutral-400">Explorer</h2>
```

**After the closing `</div>` of this header block, add:**
```tsx
      <div className="px-3 py-2 border-b border-white/[0.05]">
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-blue-500/50 transition-colors"
        />
      </div>
```

**Step 3 — Filter the tree.** Create a helper function that checks if a node or any descendant matches the query:

Add this function inside the `Sidebar` component, before the `renderTree` function:
```typescript
  const nodeMatchesSearch = (nodeId: string, query: string): boolean => {
    if (!query) return true;
    const node = nodes[nodeId];
    if (!node) return false;
    const lowerQuery = query.toLowerCase();
    if (node.title.toLowerCase().includes(lowerQuery)) return true;
    if (node.description.toLowerCase().includes(lowerQuery)) return true;
    // Check if any child matches (so parent stays visible)
    return node.childrenIds.some((childId) => nodeMatchesSearch(childId, lowerQuery));
  };
```

**Step 4 — Apply the filter.** In `renderTree`, add a check at the beginning:

After `if (!node) return null;`, add:
```typescript
    if (searchQuery && !nodeMatchesSearch(nodeId, searchQuery)) return null;
```

### 03.4.6 Create ErrorBoundary Component [D03-06]

**Create file:** `d:\soft\Knotess\components\ErrorBoundary.tsx`

```tsx
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { get } from 'idb-keyval';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleExportData = async () => {
    try {
      const data = await get('node-graph-state');
      if (data) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'knotess-recovery-export.json';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('No data found in storage.');
      }
    } catch (err) {
      alert('Failed to export data: ' + err);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen w-screen bg-neutral-950 text-neutral-100 font-sans">
          <div className="max-w-lg text-center space-y-6 p-8">
            <div className="text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-neutral-400">
              The app encountered an unexpected error. You can export your data to prevent loss, then reload.
            </p>
            {this.state.error && (
              <details className="text-left bg-neutral-900 rounded-lg p-4 text-xs text-neutral-500 max-h-40 overflow-auto">
                <summary className="cursor-pointer text-neutral-400 mb-2">Error Details</summary>
                <pre className="whitespace-pre-wrap">{this.state.error.message}</pre>
                <pre className="whitespace-pre-wrap mt-2">{this.state.error.stack}</pre>
              </details>
            )}
            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleExportData}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-lg"
              >
                Export Data
              </button>
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors shadow-lg border border-white/10"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 03.4.7 Wrap App in ErrorBoundary [D03-07]

**File:** `d:\soft\Knotess\app\layout.tsx`

**Step 1 — Import:**
```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';
```

**Step 2 — Wrap children:**

Find:
```tsx
      <body className={inter.className} suppressHydrationWarning>{children}</body>
```

Replace with:
```tsx
      <body className={inter.className} suppressHydrationWarning>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
```

### 03.4.8 Create ZoomControls Component [D03-08]

**Create file:** `d:\soft\Knotess\components\ZoomControls.tsx`

```tsx
'use client';

import { useStore } from '@/lib/store';
import { Plus, Minus, Maximize } from 'lucide-react';

export function ZoomControls() {
  const { camera, setCamera, nodes } = useStore();

  const zoomIn = () => {
    const newZoom = Math.min(camera.zoom * 1.3, 1000);
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    const scaleChange = newZoom / camera.zoom;
    setCamera({
      x: screenCenterX - (screenCenterX - camera.x) * scaleChange,
      y: screenCenterY - (screenCenterY - camera.y) * scaleChange,
      zoom: newZoom,
    });
  };

  const zoomOut = () => {
    const newZoom = Math.max(camera.zoom / 1.3, 0.0001);
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    const scaleChange = newZoom / camera.zoom;
    setCamera({
      x: screenCenterX - (screenCenterX - camera.x) * scaleChange,
      y: screenCenterY - (screenCenterY - camera.y) * scaleChange,
      zoom: newZoom,
    });
  };

  const fitToView = () => {
    setCamera({ x: window.innerWidth / 2, y: window.innerHeight / 2, zoom: 1 });
  };

  const zoomPercent = Math.round(camera.zoom * 100);

  return (
    <div className="absolute bottom-6 right-6 z-30 bg-[#0d1117]/90 backdrop-blur-2xl border border-white/[0.08] rounded-xl px-2 py-1.5 flex items-center gap-1 shadow-[0_8px_32px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.02]">
      <button
        onClick={zoomOut}
        className="p-1.5 hover:bg-white/[0.08] rounded-lg text-neutral-400 hover:text-white transition-colors"
        title="Zoom Out"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="text-[11px] font-mono text-neutral-400 min-w-[40px] text-center select-none">
        {zoomPercent}%
      </span>
      <button
        onClick={zoomIn}
        className="p-1.5 hover:bg-white/[0.08] rounded-lg text-neutral-400 hover:text-white transition-colors"
        title="Zoom In"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-4 bg-white/[0.08] mx-0.5" />
      <button
        onClick={fitToView}
        className="p-1.5 hover:bg-white/[0.08] rounded-lg text-neutral-400 hover:text-white transition-colors"
        title="Fit to View"
      >
        <Maximize className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
```

### 03.4.9 Add ZoomControls to Canvas [D03-09]

**File:** `d:\soft\Knotess\components\Canvas.tsx`

**Step 1 — Import:**
```typescript
import { ZoomControls } from './ZoomControls';
```

**Step 2 — Add the component inside the Canvas div, just before the closing `</div>`.** Find the last `</div>` of the Canvas component and add `<ZoomControls />` just before it:

```tsx
      <ZoomControls />
    </div>
```

---

## 03.5 Isolation Requirements

- **Inputs required**: Phase 02 completed (stable components)
- **Outputs produced**: Full standard feature set
- **No forward dependencies**: None

---

## 03.6 Gap Checklist

- [ ] Do Ctrl+Z/Ctrl+Y work for undo/redo?
- [ ] Does Ctrl+S save (and update the auto-save indicator)?
- [ ] Does Delete key show a confirmation before deleting?
- [ ] Does Escape deselect all nodes?
- [ ] Does the sidebar search filter nodes correctly?
- [ ] Does the error boundary catch errors and show the fallback?
- [ ] Do zoom controls (+, −, fit-to-view) work?
- [ ] Do shortcuts NOT fire while typing in a text input?

---

## 03.7 Gate Checklist

- [ ] `npm run dev` starts without errors
- [ ] All existing Playwright tests pass
- [ ] New Playwright tests for shortcuts and search pass
- [ ] Error boundary renders fallback when a component throws

---

## 03.8 Verification Tests

Add file `d:\soft\Knotess\e2e\features.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Standard Features', () => {
  test('keyboard shortcut Ctrl+Z undoes last action', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Root Node')).toBeVisible({ timeout: 10000 });

    // Add a node
    await page.getByTitle('Add Node').click();
    await expect(page.getByText('New Node')).toBeVisible({ timeout: 5000 });

    // Undo
    await page.keyboard.press('Control+z');

    // The new node should be gone
    await expect(page.getByText('New Node')).not.toBeVisible({ timeout: 5000 });
  });

  test('Escape key deselects all nodes', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Root Node')).toBeVisible({ timeout: 10000 });

    // Click root node to select
    await page.getByText('Root Node').click();

    // The edit/delete buttons should appear (indicating selection)
    await expect(page.getByTitle('Edit')).toBeVisible({ timeout: 3000 });

    // Press Escape
    await page.keyboard.press('Escape');

    // Edit button should disappear (node deselected)
    await expect(page.getByTitle('Edit')).not.toBeVisible({ timeout: 3000 });
  });

  test('sidebar search filters nodes', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Root Node')).toBeVisible({ timeout: 10000 });

    // Type in the search box
    const searchInput = page.getByPlaceholder('Search nodes...');
    await searchInput.fill('nonexistent');

    // Root Node should be hidden in the sidebar tree
    // (it still exists on canvas, but sidebar tree is filtered)
    const sidebarTree = page.locator('.flex-1.overflow-y-auto');
    await expect(sidebarTree.getByText('Root Node')).not.toBeVisible({ timeout: 3000 });

    // Clear search
    await searchInput.fill('');

    // Root Node should reappear
    await expect(sidebarTree.getByText('Root Node')).toBeVisible({ timeout: 3000 });
  });

  test('zoom controls are visible and clickable', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Root Node')).toBeVisible({ timeout: 10000 });

    // Zoom controls should be visible
    await expect(page.getByTitle('Zoom In')).toBeVisible();
    await expect(page.getByTitle('Zoom Out')).toBeVisible();
    await expect(page.getByTitle('Fit to View')).toBeVisible();

    // Check zoom percentage text
    await expect(page.getByText('100%')).toBeVisible();

    // Click zoom in
    await page.getByTitle('Zoom In').click();

    // Zoom percentage should increase
    await expect(page.getByText('130%')).toBeVisible({ timeout: 2000 });
  });

  test('destructive action shows confirmation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Root Node')).toBeVisible({ timeout: 10000 });

    // Set up dialog handler (dismiss = cancel)
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.dismiss();
    });

    // Click "New" button (which should trigger confirmation)
    await page.getByText('New').click();

    // Root Node should still exist (we dismissed the dialog)
    await expect(page.getByText('Root Node')).toBeVisible();
  });
});
```

---

## 03.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| features.spec.ts — Ctrl+Z undo | ⬜ Pending | |
| features.spec.ts — Escape deselect | ⬜ Pending | |
| features.spec.ts — sidebar search | ⬜ Pending | |
| features.spec.ts — zoom controls | ⬜ Pending | |
| features.spec.ts — confirmation dialog | ⬜ Pending | |

---

## 03.10 Completion Criteria

This phase is DONE when:

- [ ] All deliverables [D03-01] through [D03-09] marked `[x]`
- [ ] All gap checklist items answered affirmatively
- [ ] All gate checklist items passing
- [ ] All verification tests passing
- [ ] Test results table updated

> Proceed to Phase 04 only after all criteria are satisfied.
