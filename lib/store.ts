import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { get, set } from 'idb-keyval';
import { getRegistry, saveRegistry, createFile as createRegistryFile, openFile, saveFile, deleteFile as deleteRegistryFile } from './fileRegistry';

/** Buss nodes are small circular port extensions — this is their diameter in px. */
export const BUSS_NODE_SIZE = 48;

export type CanvasItemType = 'text' | 'image' | 'iframe' | 'video' | 'audio' | 'html' | 'link';

export interface CanvasItem {
  id: string;
  type: CanvasItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  data: any;
  assetId?: string; // Optional link to a project-level asset
}

export type AssetType = 'text' | 'image' | 'video' | 'audio' | 'iframe' | 'html';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  data: Record<string, any>; // { url?: string, text?: string, html?: string, base64?: string }
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  fileIds: string[];
}

export interface PageData {
  id: string;
  name: string;
  items: CanvasItem[];
}

export interface Port {
  id: string;
  name: string;
  angle: number;
  targetNodeId: string;
  type?: 'child' | 'sister' | 'buss' | 'route';
  linkLabel?: string;
  isPortal?: boolean;
}

export interface NodeData {
  id: string;
  parentId: string | null;
  mainNodeId?: string;
  nodeType?: 'default' | 'buss';
  title: string;
  description: string;
  x: number;
  y: number;
  childrenIds: string[];
  tunnelLinks: string[];
  pages: PageData[];
  ports: Port[];
  /** @reserved — Will be used for node color customization in a future chunk. */
  color?: string;
  isExpanded?: boolean;
  sisterIds?: string[];
  height?: number;
  groupId?: string;
  groupColor?: string;
}

export interface LODThresholds {
  culledMax: number;
  starMax: number;
  shapeMax: number;
  compactMax: number;
}

export interface EditorSettings {
  linkStyle: 'bezier' | 'straight' | 'step';
  linkThickness: number;
  linkColors: { child: string; sister: string; tunnel: string; route: string; buss: string };
  linkAnimation: 'flow-dots' | 'none';
  linkArrowHeads: boolean;

  colorPrimary: string;
  colorSecondary: string;
  colorTertiary: string;
  colorBackground: string;
  colorNodeBg: string;
  colorText: string;
  colorAccent: string;
  themePreset: string;

  fontFamily: string;
  fontSizeScale: number;
  lineHeight: number;
  letterSpacing: number;

  gridVisible: boolean;
  gridOpacity: number;
  gridSize: number;
  nodeBlur: number;
  nodeBorderRadius: number;
  nodeShadowIntensity: number;
  glowEffects: boolean;

  snapGridSize: number;
  zoomSpeed: number;
  doubleClickBehavior: 'zoom' | 'edit' | 'both';
  portSnapAngle: number;

  backgroundPattern: 'dots' | 'grid' | 'none';
  backgroundColor: string;
  minimapVisible: boolean;

  lodThresholds: LODThresholds;

  alignOnCreation: boolean;
  alignColumnOffset: number;

  /** Base zoom multiplier when clicking into a node. Higher = more zoomed in. */
  referenceZoom: number;

  clusterViewMode: boolean;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  linkStyle: 'bezier',
  linkThickness: 2,
  linkColors: { child: '#3b82f6', sister: '#a855f7', tunnel: '#22c55e', route: '#06b6d4', buss: '#3b82f6' },
  linkAnimation: 'flow-dots',
  linkArrowHeads: true,

  colorPrimary: '#3b82f6',
  colorSecondary: '#8b5cf6',
  colorTertiary: '#10b981',
  colorBackground: '#0d1117',
  colorNodeBg: '#1e293b',
  colorText: '#f8fafc',
  colorAccent: '#38bdf8',
  themePreset: 'midnight',

  fontFamily: 'Inter, sans-serif',
  fontSizeScale: 1.0,
  lineHeight: 1.5,
  letterSpacing: 0,

  gridVisible: true,
  gridOpacity: 0.04,
  gridSize: 20,
  nodeBlur: 0,
  nodeBorderRadius: 16,
  nodeShadowIntensity: 0.5,
  glowEffects: true,

  snapGridSize: 20,
  zoomSpeed: 1.0,
  doubleClickBehavior: 'both',
  portSnapAngle: 15,

  backgroundPattern: 'dots',
  backgroundColor: '#050505',
  minimapVisible: true,

  lodThresholds: { culledMax: 5, starMax: 10, shapeMax: 20, compactMax: 40 },

  alignOnCreation: false,
  alignColumnOffset: 60,

  referenceZoom: 1.0,

  clusterViewMode: false,
};

export interface FileRegistryEntry {
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  storageKey: string;
  settingsOverrides?: Partial<EditorSettings>;
}

export interface Workspace {
  id: string;
  name: string;
  fileIds: string[];
}

export interface AppState {
  nodes: Record<string, NodeData>;
  rootNodeId: string | null;
  assets: Asset[];
  camera: { x: number; y: number; zoom: number };
  selectedNodeIds: string[];
  selectedPortIds: { nodeId: string; portIds: string[] } | null;
  activeNodeId: string | null;
  clipboard: NodeData[];
  /** @reserved — Will be used for light/dark theme toggling in a future chunk. */
  theme: string;
  linkingSourceId: string | null;
  linkingSourcePortId: { nodeId: string; portId: string } | null;
  routeConnectSource: { nodeId: string; portAngle: number } | null;
  
  past: { nodes: Record<string, NodeData>; rootNodeId: string | null }[];
  future: { nodes: Record<string, NodeData>; rootNodeId: string | null }[];
  
  init: () => Promise<void>;
  save: () => Promise<void>;
  clear: () => Promise<void>;
  
  setCamera: (camera: { x: number; y: number; zoom: number } | ((prev: { x: number; y: number; zoom: number }) => { x: number; y: number; zoom: number })) => void;
  selectNode: (id: string, multi?: boolean) => void;
  selectMultipleNodes: (ids: string[]) => void;
  selectPorts: (nodeId: string, portIds: string[]) => void;
  clearSelection: () => void;
  setActiveNode: (id: string | null) => void;
  setLinkingSourceId: (id: string | null) => void;
  setLinkingSourcePortId: (data: { nodeId: string; portId: string } | null) => void;
  setRouteConnectSource: (source: { nodeId: string; portAngle: number } | null) => void;
  
  addNode: (parentId: string | null, x: number, y: number) => string;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  updateNodeSilent: (id: string, data: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  
  undo: () => void;
  redo: () => void;
  cut: () => void;
  copy: () => void;
  paste: (parentId: string | null, x: number, y: number) => void;
  
  addPage: (nodeId: string, name: string) => void;
  updatePage: (nodeId: string, pageId: string, data: Partial<PageData>) => void;
  deletePage: (nodeId: string, pageId: string) => void;
  
  addCanvasItem: (nodeId: string, pageId: string, item: Omit<CanvasItem, 'id'>) => void;
  updateCanvasItem: (nodeId: string, pageId: string, itemId: string, data: Partial<CanvasItem>) => void;
  deleteCanvasItem: (nodeId: string, pageId: string, itemId: string) => void;
  
  addNodeWithPort: (parentId: string, x: number, y: number, angle: number, portName: string, type?: 'child' | 'sister' | 'buss' | 'route') => string;
  updatePort: (nodeId: string, portId: string, data: Partial<Port>) => void;
  deletePort: (nodeId: string, portId: string) => void;
  movePortsToNode: (sourcePortIds: string[], sourceNodeId: string, targetNodeId: string, angleOffset?: number) => void;
  linkNodesViaPort: (sourceNodeId: string, targetNodeId: string, portAngle: number, type: 'child' | 'sister' | 'buss') => void;
  groupNodes: (nodeIds: string[], color: string) => void;
  ungroupNodes: (groupId: string) => void;
  isSnapEnabled: boolean;
  toggleSnap: () => void;
  toggleAlignOnCreation: () => void;
  toggleClusterViewMode: () => void;
  dictationActive: boolean;
  setDictationActive: (active: boolean) => void;
  lastSavedAt: number | null;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (isOpen: boolean) => void;
  activeSidebarPanel: 'tree' | 'files' | 'workspaces' | null;
  setActiveSidebarPanel: (panel: 'tree' | 'files' | 'workspaces' | null) => void;

  editorSettings: EditorSettings;
  updateEditorSettings: (partial: Partial<EditorSettings>) => void;
  resetEditorSettings: () => void;
  resetEditorSettingsSection: (section: string) => void;

  currentFileId: string | null;
  fileRegistry: FileRegistryEntry[];
  switchFile: (id: string) => Promise<void>;
  createNewFile: (name: string) => Promise<void>;
  deleteCurrentFile: () => Promise<void>;

  addRouteConnection: (sourceId: string, sourcePortAngle: number, targetId: string) => void;
  scaleGroup: (nodeIds: string[], scaleFactor: number) => void;

  // Asset Library
  addAsset: (asset: Omit<Asset, 'id' | 'createdAt'>) => string;
  updateAsset: (id: string, data: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;

  getEffectiveSetting: <K extends keyof EditorSettings>(key: K) => EditorSettings[K];
  setFileSettingOverride: (fileId: string, overrides: Partial<EditorSettings>) => void;
  clearFileSettingOverride: (fileId: string, key: keyof EditorSettings) => void;
  clearAllFileSettingOverrides: (fileId: string) => void;
}

const STORAGE_KEY = 'node-graph-state';

export const useStore = create<AppState>((setStore, getStore) => {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const flushSave = () => {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const { nodes, rootNodeId, assets, camera, theme, isSnapEnabled, currentFileId, editorSettings } = getStore();
    
    if (currentFileId) {
      saveFile(currentFileId, { nodes, rootNodeId, assets }).catch(console.error);
    }
    
    set('knotess-settings', editorSettings).catch(console.error);
    set(STORAGE_KEY, { camera, theme, isSnapEnabled })
      .then(() => {
        setStore({ lastSavedAt: Date.now() });
      })
      .catch(console.error);
  };

  const saveState = (state: Partial<AppState>) => {
    setStore(state);
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(flushSave, 300);
  };

  /** Migrate legacy save files: resize old 130px buss nodes to BUSS_NODE_SIZE. */
  const migrateNodes = (nodes: Record<string, NodeData>): Record<string, NodeData> => {
    let changed = false;
    const migrated = { ...nodes };
    for (const id of Object.keys(migrated)) {
      const n = { ...migrated[id] };
      let nodeChanged = false;

      if (n.nodeType === 'buss' && n.height && n.height > BUSS_NODE_SIZE) {
        n.height = BUSS_NODE_SIZE;
        nodeChanged = true;
      }
      
      // Auto-heal duplicate ports
      if (n.ports && n.ports.length > 0) {
        const uniquePorts = new Map();
        n.ports.forEach((p) => {
          uniquePorts.set(p.id, p);
        });
        if (uniquePorts.size !== n.ports.length) {
          n.ports = Array.from(uniquePorts.values());
          nodeChanged = true;
        }
      }

      if (n.tunnelLinks && n.tunnelLinks.length > 0) {
        n.ports = [...(n.ports || [])];
        const portTargets = new Set(n.ports.map(p => p.targetNodeId));
        n.tunnelLinks.forEach((tId, idx) => {
          if (!portTargets.has(tId)) {
            n.ports.push({
              id: uuidv4(),
              name: 'Route',
              angle: (idx * 30 + 45) % 360,
              targetNodeId: tId,
              type: 'route' as any,
            });
            portTargets.add(tId);
          }
        });
        n.tunnelLinks = [];
        nodeChanged = true;
      }
      
      if (nodeChanged) {
        migrated[id] = n;
        changed = true;
      }
    }
    return changed ? migrated : nodes;
  };

  // Flush pending save on tab close
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flushSave);
  }

  const MAX_HISTORY = 50;

  const pushHistory = () => {
    const { nodes, rootNodeId, past } = getStore();
    const snapshot = { nodes: structuredClone(nodes), rootNodeId };
    const newPast = [...past, snapshot];
    setStore({
      past: newPast.length > MAX_HISTORY ? newPast.slice(-MAX_HISTORY) : newPast,
      future: [],
    });
  };

  return {
    nodes: {},
    rootNodeId: null,
    assets: [],
    camera: { x: 0, y: 0, zoom: 1 },
    selectedNodeIds: [],
    selectedPortIds: null,
    activeNodeId: null,
    clipboard: [],
    theme: 'dark',
    linkingSourceId: null,
    linkingSourcePortId: null,
    routeConnectSource: null,
    isSnapEnabled: true,
    past: [],
    future: [],
    lastSavedAt: null,
    isSettingsOpen: false,
    activeSidebarPanel: 'tree',

    editorSettings: DEFAULT_EDITOR_SETTINGS,
    currentFileId: null,
    fileRegistry: [],

    init: async () => {
      try {
        const settings = await get<EditorSettings>('knotess-settings');
        if (settings) {
          // Deep-merge with defaults so new fields are always present
          const merged = {
            ...DEFAULT_EDITOR_SETTINGS,
            ...settings,
            linkColors: { ...DEFAULT_EDITOR_SETTINGS.linkColors, ...settings.linkColors },
          };
          // Migrate legacy yellow buss color to the new blue default
          if (merged.linkColors.buss === '#eab308') {
            merged.linkColors.buss = DEFAULT_EDITOR_SETTINGS.linkColors.buss;
          }
          setStore({ editorSettings: merged });
        }

        let registry = await getRegistry();
        
        // Migration of legacy data
        if (registry.length === 0) {
          const legacyData = await get<{nodes: any, rootNodeId: string, camera: any, theme: string, isSnapEnabled?: boolean}>(STORAGE_KEY);
          if (legacyData && legacyData.nodes && Object.keys(legacyData.nodes).length > 0) {
            const entry = await createRegistryFile('Legacy Graph');
            await saveFile(entry.id, { nodes: legacyData.nodes, rootNodeId: legacyData.rootNodeId });
            registry = await getRegistry();
            setStore({
              currentFileId: entry.id,
              fileRegistry: registry,
              nodes: legacyData.nodes,
              rootNodeId: legacyData.rootNodeId,
              camera: legacyData.camera || { x: 0, y: 0, zoom: 1 },
              theme: legacyData.theme || 'dark',
              isSnapEnabled: legacyData.isSnapEnabled !== undefined ? legacyData.isSnapEnabled : true
            });
            return;
          }
        }

        if (registry.length > 0) {
          registry.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
          const latestFile = registry[0];
          const data = await openFile(latestFile.id);
          
          const legacyGlobal = await get<any>(STORAGE_KEY) || {};
          
          setStore({ 
            currentFileId: latestFile.id,
            fileRegistry: registry,
            nodes: migrateNodes(data?.nodes || {}), 
            rootNodeId: data?.rootNodeId || null,
            assets: data?.assets || [],
            camera: legacyGlobal.camera || { x: 0, y: 0, zoom: 1 },
            theme: legacyGlobal.theme || 'dark',
            isSnapEnabled: legacyGlobal.isSnapEnabled !== undefined ? legacyGlobal.isSnapEnabled : true
          });
          return;
        }
      } catch (e) {
        console.error("Init Error", e);
      }
      
      const rootId = uuidv4();
      const rootNode: NodeData = {
        id: rootId,
        parentId: null,
        title: 'Root Node',
        description: 'The beginning of everything.',
        x: 0,
        y: 0,
        childrenIds: [],
        tunnelLinks: [],
        pages: [{ id: uuidv4(), name: 'Main Page', items: [] }],
        ports: [],
        isExpanded: true,
      };

      const entry = await createRegistryFile('New Graph');
      const formattedNodes = { [rootId]: rootNode };
      await saveFile(entry.id, { nodes: formattedNodes, rootNodeId: rootId });
      const registry = await getRegistry();
      
      setStore({ 
        currentFileId: entry.id,
        fileRegistry: registry,
        nodes: formattedNodes, 
        rootNodeId: rootId 
      });
      getStore().save();
    },

    save: async () => {
      const { nodes, rootNodeId, assets, camera, theme, isSnapEnabled, currentFileId, editorSettings } = getStore();
      if (currentFileId) {
        await saveFile(currentFileId, { nodes, rootNodeId, assets });
      }
      await set('knotess-settings', editorSettings);
      await set(STORAGE_KEY, { camera, theme, isSnapEnabled });
    },

    clear: async () => {
      const { currentFileId } = getStore();
      if (currentFileId) {
        await deleteRegistryFile(currentFileId);
      }
      const registry = await getRegistry();
      setStore({ fileRegistry: registry });
      
      if (registry.length > 0) {
        await getStore().switchFile(registry[0].id);
      } else {
        await getStore().createNewFile('New Graph');
      }
    },

    setActiveSidebarPanel: (panel) => setStore({ activeSidebarPanel: panel }),

    setCamera: (cameraUpdater) => {
      setStore((state) => ({
        camera: typeof cameraUpdater === 'function' ? cameraUpdater(state.camera) : cameraUpdater,
      }));
    },

    selectNode: (id, multi = false) => {
      const { linkingSourceId, nodes, updateNode } = getStore();
      
      if (linkingSourceId) {
        if (linkingSourceId !== id && !nodes[linkingSourceId].tunnelLinks.includes(id)) {
          updateNode(linkingSourceId, { 
            tunnelLinks: nodes[linkingSourceId].tunnelLinks.includes(id) 
              ? nodes[linkingSourceId].tunnelLinks 
              : [...nodes[linkingSourceId].tunnelLinks, id] 
          });
        }
        setStore({ linkingSourceId: null });
        return;
      }

      setStore((state) => ({
        selectedNodeIds: multi
          ? state.selectedNodeIds.includes(id)
            ? state.selectedNodeIds.filter((selId) => selId !== id)
            : [...state.selectedNodeIds, id]
          : [id],
        selectedPortIds: null,
      }));
    },

    selectMultipleNodes: (ids) => {
      setStore({ selectedNodeIds: ids, selectedPortIds: null });
    },

    selectPorts: (nodeId, portIds) => {
      setStore({ selectedPortIds: { nodeId, portIds }, selectedNodeIds: [] });
    },

    clearSelection: () => {
      const { linkingSourceId } = getStore();
      if (linkingSourceId) {
        setStore({ linkingSourceId: null });
      }
      setStore({ selectedNodeIds: [], selectedPortIds: null, linkingSourcePortId: null });
    },
    
    setActiveNode: (id) => setStore({ activeNodeId: id }),
    setLinkingSourceId: (id) => setStore({ linkingSourceId: id }),
    setLinkingSourcePortId: (data) => setStore({ linkingSourcePortId: data }),
    
    setRouteConnectSource: (source) => setStore({ routeConnectSource: source }),

    addNode: (parentId, x, y) => {
      pushHistory();
      const id = uuidv4();
      
      const { nodes, editorSettings } = getStore();
      
      let finalX = x;
      let finalY = y;
      
      if (editorSettings.alignOnCreation && parentId && nodes[parentId]) {
        const siblings = nodes[parentId].childrenIds || [];
        if (siblings.length > 0) {
          const lastChild = nodes[siblings[siblings.length - 1]];
          if (lastChild) {
            finalX = lastChild.x;
            finalY = lastChild.y + (lastChild.height || 140) + editorSettings.alignColumnOffset;
          }
        } else {
          finalX = 140;
          finalY = 280;
        }
      }

      const newNode: NodeData = {
        id,
        parentId,
        title: 'New Node',
        description: '',
        x: finalX,
        y: finalY,
        childrenIds: [],
        tunnelLinks: [],
        pages: [{ id: uuidv4(), name: 'Main Page', items: [] }],
        ports: [],
        isExpanded: true,
      };

      const newNodes = { ...nodes, [id]: newNode };

      if (parentId && newNodes[parentId]) {
        const port: Port = {
          id: uuidv4(),
          name: 'New Port',
          angle: 0,
          targetNodeId: id,
          type: 'child',
        };
        newNodes[parentId] = {
          ...newNodes[parentId],
          childrenIds: newNodes[parentId].childrenIds.includes(id) 
            ? newNodes[parentId].childrenIds 
            : [...newNodes[parentId].childrenIds, id],
          ports: [...(newNodes[parentId].ports || []), port],
          isExpanded: true,
        };
      }

      saveState({ nodes: newNodes, rootNodeId: getStore().rootNodeId || id });
      return id;
    },

    updateNode: (id, data) => {
      pushHistory();
      const { nodes } = getStore();
      if (!nodes[id]) return;
      saveState({
        nodes: {
          ...nodes,
          [id]: { ...nodes[id], ...data },
        },
      });
    },

    updateNodeSilent: (id, data) => {
      const { nodes } = getStore();
      if (!nodes[id]) return;
      saveState({
        nodes: {
          ...nodes,
          [id]: { ...nodes[id], ...data },
        },
      });
    },

    deleteNode: (id) => {
      pushHistory();
      const { nodes, rootNodeId } = getStore();
      if (!nodes[id]) return;

      const newNodes = { ...nodes };

      // Collect all IDs that will be deleted (node + all descendants)
      const deletedIds = new Set<string>();
      const collectIds = (nodeId: string) => {
        if (deletedIds.has(nodeId)) return;
        deletedIds.add(nodeId);
        const node = newNodes[nodeId];
        if (node) {
          node.childrenIds.forEach(collectIds);
        }
      };
      collectIds(id);

      // Remove from parent's childrenIds
      const parentId = newNodes[id].parentId;
      if (parentId && newNodes[parentId]) {
        newNodes[parentId] = {
          ...newNodes[parentId],
          childrenIds: newNodes[parentId].childrenIds.filter((childId) => !deletedIds.has(childId)),
          sisterIds: (newNodes[parentId].sisterIds || []).filter((sid) => !deletedIds.has(sid)),
          ports: newNodes[parentId].ports.filter((p) => !deletedIds.has(p.targetNodeId)),
        };
      }

      // Clean up ALL other nodes that reference any deleted ID
      for (const nodeId of Object.keys(newNodes)) {
        if (deletedIds.has(nodeId)) continue;
        const node = newNodes[nodeId];
        let changed = false;
        let updatedNode = { ...node };

        // Clean tunnelLinks
        const cleanedTunnelLinks = node.tunnelLinks.filter((tid) => !deletedIds.has(tid));
        if (cleanedTunnelLinks.length !== node.tunnelLinks.length) {
          updatedNode.tunnelLinks = cleanedTunnelLinks;
          changed = true;
        }

        // Clean childrenIds
        const cleanedChildrenIds = node.childrenIds.filter((cid) => !deletedIds.has(cid));
        if (cleanedChildrenIds.length !== node.childrenIds.length) {
          updatedNode.childrenIds = cleanedChildrenIds;
          changed = true;
        }

        // Clean sisterIds
        const cleanedSisterIds = (node.sisterIds || []).filter((sid) => !deletedIds.has(sid));
        if (cleanedSisterIds.length !== (node.sisterIds || []).length) {
          updatedNode.sisterIds = cleanedSisterIds;
          changed = true;
        }

        // Clean ports
        const cleanedPorts = node.ports.filter((p) => !deletedIds.has(p.targetNodeId));
        if (cleanedPorts.length !== node.ports.length) {
          updatedNode.ports = cleanedPorts;
          changed = true;
        }

        if (changed) {
          newNodes[nodeId] = updatedNode;
        }
      }

      // Delete all collected nodes
      for (const delId of deletedIds) {
        delete newNodes[delId];
      }

      saveState({
        nodes: newNodes,
        rootNodeId: rootNodeId === id ? null : rootNodeId,
        selectedNodeIds: getStore().selectedNodeIds.filter((selId) => !deletedIds.has(selId)),
      });
    },

    undo: () => {
      const { past, future, nodes, rootNodeId } = getStore();
      if (past.length === 0) return;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);

      setStore({
        past: newPast,
        future: [{ nodes: structuredClone(nodes), rootNodeId }, ...future],
        nodes: previous.nodes,
        rootNodeId: previous.rootNodeId,
      });
      getStore().save();
    },

    redo: () => {
      const { past, future, nodes, rootNodeId } = getStore();
      if (future.length === 0) return;

      const next = future[0];
      const newFuture = future.slice(1);

      setStore({
        past: [...past, { nodes: structuredClone(nodes), rootNodeId }],
        future: newFuture,
        nodes: next.nodes,
        rootNodeId: next.rootNodeId,
      });
      getStore().save();
    },

    cut: () => {
      getStore().copy();
      const { selectedNodeIds } = getStore();
      selectedNodeIds.forEach((id) => getStore().deleteNode(id));
      setStore({ selectedNodeIds: [] });
    },

    copy: () => {
      const { nodes, selectedNodeIds } = getStore();
      const clipboard = selectedNodeIds.map((id) => structuredClone(nodes[id]));
      setStore({ clipboard });
    },

    paste: (parentId, x, y) => {
      const { clipboard } = getStore();
      if (clipboard.length === 0) return;
      pushHistory();

      const { nodes } = getStore();
      const newNodes = { ...nodes };
      const newSelectedIds: string[] = [];

      // Helper function to deep clone a node and its children recursively
      const cloneNodeRecursive = (nodeToClone: NodeData, newParentId: string | null, offsetX: number, offsetY: number): string => {
        const newId = uuidv4();
        
        // Deep clone pages to ensure new IDs for items
        const clonedPages = nodeToClone.pages.map(page => ({
          ...page,
          id: uuidv4(),
          items: page.items.map(item => ({ ...item, id: uuidv4() }))
        }));

        const pastedNode: NodeData = {
          ...nodeToClone,
          id: newId,
          parentId: newParentId,
          x: nodeToClone.x + offsetX,
          y: nodeToClone.y + offsetY,
          childrenIds: [], // Will be populated below
          pages: clonedPages,
          ports: nodeToClone.ports.map(p => ({ ...p, id: uuidv4() })),
        };

        newNodes[newId] = pastedNode;

        if (newParentId && newNodes[newParentId]) {
          newNodes[newParentId] = {
            ...newNodes[newParentId],
            childrenIds: [...newNodes[newParentId].childrenIds, newId],
          };
        }

        // Recursively clone children - do NOT apply offset to children
        nodeToClone.childrenIds.forEach(childId => {
          const childNode = nodes[childId];
          if (childNode) {
            const newChildId = cloneNodeRecursive(childNode, newId, 0, 0);
            newNodes[newId].childrenIds.push(newChildId);
          }
        });

        return newId;
      };

      clipboard.forEach((node, index) => {
        const offsetX = x - node.x + index * 50;
        const offsetY = y - node.y + index * 50;
        const newId = cloneNodeRecursive(node, parentId, offsetX, offsetY);
        newSelectedIds.push(newId);
      });

      saveState({ nodes: newNodes, selectedNodeIds: newSelectedIds });
    },

    addPage: (nodeId, name) => {
      pushHistory();
      const { nodes } = getStore();
      if (!nodes[nodeId]) return;
      
      const newPage: PageData = { id: uuidv4(), name, items: [] };
      saveState({
        nodes: {
          ...nodes,
          [nodeId]: {
            ...nodes[nodeId],
            pages: [...nodes[nodeId].pages, newPage],
          },
        },
      });
    },

    updatePage: (nodeId, pageId, data) => {
      pushHistory();
      const { nodes } = getStore();
      if (!nodes[nodeId]) return;

      saveState({
        nodes: {
          ...nodes,
          [nodeId]: {
            ...nodes[nodeId],
            pages: nodes[nodeId].pages.map((p) => (p.id === pageId ? { ...p, ...data } : p)),
          },
        },
      });
    },

    deletePage: (nodeId, pageId) => {
      pushHistory();
      const { nodes } = getStore();
      if (!nodes[nodeId]) return;

      saveState({
        nodes: {
          ...nodes,
          [nodeId]: {
            ...nodes[nodeId],
            pages: nodes[nodeId].pages.filter((p) => p.id !== pageId),
          },
        },
      });
    },

    addCanvasItem: (nodeId, pageId, item) => {
      pushHistory();
      const { nodes } = getStore();
      if (!nodes[nodeId]) return;

      const newItem: CanvasItem = { ...item, id: uuidv4() };
      saveState({
        nodes: {
          ...nodes,
          [nodeId]: {
            ...nodes[nodeId],
            pages: nodes[nodeId].pages.map((p) =>
              p.id === pageId ? { ...p, items: [...p.items, newItem] } : p
            ),
          },
        },
      });
    },

    updateCanvasItem: (nodeId, pageId, itemId, data) => {
      pushHistory();
      const { nodes } = getStore();
      if (!nodes[nodeId]) return;

      saveState({
        nodes: {
          ...nodes,
          [nodeId]: {
            ...nodes[nodeId],
            pages: nodes[nodeId].pages.map((p) =>
              p.id === pageId
                ? {
                    ...p,
                    items: p.items.map((i) => (i.id === itemId ? { ...i, ...data } : i)),
                  }
                : p
            ),
          },
        },
      });
    },

    deleteCanvasItem: (nodeId, pageId, itemId) => {
      pushHistory();
      const { nodes } = getStore();
      if (!nodes[nodeId]) return;

      saveState({
        nodes: {
          ...nodes,
          [nodeId]: {
            ...nodes[nodeId],
            pages: nodes[nodeId].pages.map((p) =>
              p.id === pageId
                ? { ...p, items: p.items.filter((i) => i.id !== itemId) }
                : p
            ),
          },
        },
      });
    },

    addNodeWithPort: (parentId, x, y, angle, portName, type = 'child') => {
      pushHistory();
      const { nodes } = getStore();
      if (!nodes[parentId]) return '';

      // If sister or buss mode, the new node's parent is the same as the source node's parent
      let actualParentId = (type === 'sister' || type === 'buss') ? nodes[parentId].parentId : parentId;
      
      // If the source node is a buss node, anything connected to it should act as if it's connected to the main node it extends from
      if (nodes[parentId].nodeType === 'buss') {
        if (type === 'child') {
          actualParentId = nodes[parentId].mainNodeId || nodes[parentId].parentId;
        } else if (type === 'sister' || type === 'buss') {
          actualParentId = nodes[nodes[parentId].mainNodeId || parentId]?.parentId || null;
        }
      }

      const id = uuidv4();
      
      let finalX = x;
      let finalY = y;
      const editorSettings = getStore().editorSettings;
      const isBussChild = nodes[parentId].nodeType === 'buss' && type === 'child';

      if (editorSettings.alignOnCreation && actualParentId) {
        if (type === 'child' || isBussChild) {
          const siblings = nodes[actualParentId].childrenIds || [];
          if (siblings.length > 0) {
            const lastChild = nodes[siblings[siblings.length - 1]];
            if (lastChild) {
              finalX = lastChild.x;
              finalY = lastChild.y + (lastChild.height || 140) + editorSettings.alignColumnOffset;
            }
          } else {
            finalX = 140;
            finalY = 280;
          }
        } else if (type === 'sister') {
          const sisters = nodes[actualParentId].sisterIds || [];
          if (sisters.length > 0) {
            const lastSister = nodes[sisters[sisters.length - 1]];
            if (lastSister) {
              finalX = lastSister.x + 280 + editorSettings.alignColumnOffset;
              finalY = lastSister.y;
            }
          } else {
            // First sister: stack to the right of the node it drag-spawned from
            finalX = nodes[parentId].x + 280 + editorSettings.alignColumnOffset;
            finalY = nodes[parentId].y;
          }
        }
      }

      const newNode: NodeData = {
        id,
        parentId: actualParentId,
        mainNodeId: type === 'buss' ? (nodes[parentId].nodeType === 'buss' ? nodes[parentId].mainNodeId : parentId) : undefined,
        nodeType: type === 'buss' ? 'buss' : 'default',
        title: type === 'buss' ? portName : (type === 'sister' ? 'Sister Node' : 'New Node'),
        description: '',
        x: finalX,
        y: finalY,
        childrenIds: [],
        tunnelLinks: [],
        pages: [{ id: uuidv4(), name: 'Main Page', items: [] }],
        ports: [],
        isExpanded: true,
      };

      const port: Port = {
        id: uuidv4(),
        name: portName,
        angle,
        targetNodeId: id,
        type: type === 'buss' ? 'buss' : type,
      };

      const newNodes = { 
        ...nodes, 
        [id]: newNode,
        [parentId]: {
          ...nodes[parentId],
          ports: [...(nodes[parentId].ports || []), port],
          isExpanded: true,
          ...(type === 'sister' || type === 'buss' ? { sisterIds: (nodes[parentId].sisterIds || []).includes(id) ? (nodes[parentId].sisterIds || []) : [...(nodes[parentId].sisterIds || []), id] } : isBussChild ? {} : { childrenIds: nodes[parentId].childrenIds.includes(id) ? nodes[parentId].childrenIds : [...(nodes[parentId].childrenIds || []), id] })
        }
      };

      // If sister, buss mode, or a child of a buss node, and there's an actual parent, add to parent's childrenIds for rendering
      if ((type === 'sister' || type === 'buss' || isBussChild) && actualParentId && newNodes[actualParentId]) {
        newNodes[actualParentId] = {
          ...newNodes[actualParentId],
          childrenIds: newNodes[actualParentId].childrenIds.includes(id) 
            ? newNodes[actualParentId].childrenIds 
            : [...newNodes[actualParentId].childrenIds, id]
        };
      }

      saveState({ nodes: newNodes, rootNodeId: getStore().rootNodeId });
      return id;
    },

    updatePort: (nodeId, portId, data) => {
      pushHistory();
      const { nodes } = getStore();
      if (!nodes[nodeId]) return;

      const updatedNodes: Record<string, NodeData> = {
        ...nodes,
        [nodeId]: {
          ...nodes[nodeId],
          ports: nodes[nodeId].ports.map((p) => (p.id === portId ? { ...p, ...data } : p)),
        },
      };

      // Sync buss node title with port name — buss nodes inherit their port's name
      if (data.name !== undefined) {
        const port = nodes[nodeId].ports.find(p => p.id === portId);
        if (port && port.type === 'buss' && port.targetNodeId && updatedNodes[port.targetNodeId]?.nodeType === 'buss') {
          updatedNodes[port.targetNodeId] = {
            ...updatedNodes[port.targetNodeId],
            title: data.name,
          };
        }
      }

      saveState({ nodes: updatedNodes });
    },

    deletePort: (nodeId, portId) => {
      pushHistory();
      const { nodes } = getStore();
      if (!nodes[nodeId]) return;

      saveState({
        nodes: {
          ...nodes,
          [nodeId]: {
            ...nodes[nodeId],
            ports: (nodes[nodeId].ports || []).filter((p) => p.id !== portId),
          },
        },
      });
    },

    movePortsToNode: (sourcePortIds, sourceNodeId, targetNodeId, angleOffset) => {
      pushHistory();
      const { nodes } = getStore();
      if (!nodes[sourceNodeId] || !nodes[targetNodeId]) return;

      let portsToMove = nodes[sourceNodeId].ports.filter(p => sourcePortIds.includes(p.id));
      const remainingPorts = nodes[sourceNodeId].ports.filter(p => !sourcePortIds.includes(p.id));

      if (angleOffset !== undefined) {
        portsToMove = portsToMove.map(p => ({
          ...p,
          angle: p.angle + angleOffset
        }));
      }

      const newNodes = { ...nodes };
      
      newNodes[sourceNodeId] = {
        ...newNodes[sourceNodeId],
        ports: remainingPorts,
      };
      
      newNodes[targetNodeId] = {
        ...newNodes[targetNodeId],
        ports: [...(newNodes[targetNodeId].ports || []), ...portsToMove],
      };

      // Update relationships based on moved ports
      portsToMove.forEach(port => {
        const linkedNodeId = port.targetNodeId;
        if (!linkedNodeId || !newNodes[linkedNodeId]) return;

        // Check if source node still has a port linking to this node
        const sourceStillHasLink = remainingPorts.some(p => p.targetNodeId === linkedNodeId && p.type === port.type);
        
        if (!sourceStillHasLink) {
          if (port.type === 'child') {
            newNodes[sourceNodeId].childrenIds = newNodes[sourceNodeId].childrenIds.filter(id => id !== linkedNodeId);
          } else if (port.type === 'sister') {
            newNodes[sourceNodeId].sisterIds = (newNodes[sourceNodeId].sisterIds || []).filter(id => id !== linkedNodeId);
          }
        }

        // Add link to target node
        if (port.type === 'child') {
          if (!newNodes[targetNodeId].childrenIds.includes(linkedNodeId)) {
            newNodes[targetNodeId].childrenIds = [...newNodes[targetNodeId].childrenIds, linkedNodeId];
          }
          // Update parentId of the linked node
          newNodes[linkedNodeId] = {
            ...newNodes[linkedNodeId],
            parentId: targetNodeId,
          };
        } else if (port.type === 'sister') {
          const sisterIds = newNodes[targetNodeId].sisterIds || [];
          if (!sisterIds.includes(linkedNodeId)) {
            newNodes[targetNodeId].sisterIds = [...sisterIds, linkedNodeId];
          }
        }
      });

      saveState({ nodes: newNodes });
    },

    linkNodesViaPort: (sourceNodeId, targetNodeId, portAngle, type) => {
      pushHistory();
      const { nodes } = getStore();
      if (!nodes[sourceNodeId] || !nodes[targetNodeId]) return;

      const port: Port = {
        id: uuidv4(),
        name: 'New Link',
        angle: portAngle,
        targetNodeId: targetNodeId,
        type,
      };

      const newNodes = {
        ...nodes,
        [sourceNodeId]: {
          ...nodes[sourceNodeId],
          ports: [...(nodes[sourceNodeId].ports || []), port],
          ...(type === 'sister' || type === 'buss'
            ? { sisterIds: (nodes[sourceNodeId].sisterIds || []).includes(targetNodeId) ? nodes[sourceNodeId].sisterIds : [...(nodes[sourceNodeId].sisterIds || []), targetNodeId] } 
            : { childrenIds: (nodes[sourceNodeId].childrenIds || []).includes(targetNodeId) ? nodes[sourceNodeId].childrenIds : [...(nodes[sourceNodeId].childrenIds || []), targetNodeId] })
        }
      };

      // Ensure target has correct parent if it's a child link
      if (type === 'child') {
        newNodes[targetNodeId] = {
          ...newNodes[targetNodeId],
          parentId: sourceNodeId
        };
      } else if (type === 'sister' || type === 'buss') {
        newNodes[targetNodeId] = {
          ...newNodes[targetNodeId],
          parentId: nodes[sourceNodeId].parentId
        };
      }

      saveState({ nodes: newNodes });
    },

    toggleSnap: () => setStore((state) => ({ isSnapEnabled: !state.isSnapEnabled })),
    toggleAlignOnCreation: () => setStore((state) => ({ editorSettings: { ...state.editorSettings, alignOnCreation: !state.editorSettings.alignOnCreation } })),
    toggleClusterViewMode: () => {
      setStore((state) => ({
        editorSettings: { ...state.editorSettings, clusterViewMode: !state.editorSettings.clusterViewMode },
      }));
    },
    dictationActive: false,
    setDictationActive: (active: boolean) => setStore({ dictationActive: active }),
    setIsSettingsOpen: (isOpen: boolean) => setStore({ isSettingsOpen: isOpen }),

    groupNodes: (nodeIds, color) => {
      pushHistory();
      const { nodes } = getStore();
      const groupId = uuidv4();
      const newNodes = { ...nodes };
      for (const nid of nodeIds) {
        if (newNodes[nid]) {
          newNodes[nid] = { ...newNodes[nid], groupId, groupColor: color };
        }
      }
      saveState({ nodes: newNodes });
    },

    ungroupNodes: (groupId) => {
      pushHistory();
      const { nodes } = getStore();
      const newNodes = { ...nodes };
      for (const nid of Object.keys(newNodes)) {
        if (newNodes[nid].groupId === groupId) {
          const { groupId: _, groupColor: __, ...rest } = newNodes[nid];
          newNodes[nid] = rest as typeof newNodes[typeof nid];
        }
      }
      saveState({ nodes: newNodes });
    },

    updateEditorSettings: (partial) => {
      setStore((state) => {
        const newSettings = { ...state.editorSettings, ...partial };
        return { editorSettings: newSettings };
      });
      getStore().save();
    },

    resetEditorSettings: () => {
      setStore({ editorSettings: { ...DEFAULT_EDITOR_SETTINGS } });
      getStore().save();
    },

    resetEditorSettingsSection: (section) => {
      // Logic for section reset can be expanded
      console.log('resetEditorSettingsSection', section);
    },

    switchFile: async (id) => {
      await getStore().save();

      const data = await openFile(id);
      if (data) {
        setStore({
          currentFileId: id,
          nodes: migrateNodes(data.nodes || {}),
          rootNodeId: data.rootNodeId || null,
          assets: data.assets || [],
          past: [],
          future: [],
          selectedNodeIds: [],
          selectedPortIds: null,
          activeNodeId: null,
          clipboard: [],
        });
      }
    },

    createNewFile: async (name) => {
      await getStore().save();
      const rootId = uuidv4();
      const rootNode: NodeData = {
        id: rootId,
        parentId: null,
        title: 'Root Node',
        description: 'The beginning of everything.',
        x: 0,
        y: 0,
        childrenIds: [],
        tunnelLinks: [],
        pages: [{ id: uuidv4(), name: 'Main Page', items: [] }],
        ports: [],
        isExpanded: true,
      };

      const entry = await createRegistryFile(name);
      await saveFile(entry.id, { nodes: { [rootId]: rootNode }, rootNodeId: rootId, assets: [] });
      const registry = await getRegistry();
      
      setStore({ 
        currentFileId: entry.id,
        fileRegistry: registry,
        nodes: { [rootId]: rootNode }, 
        rootNodeId: rootId,
        assets: [],
        past: [],
        future: [],
        selectedNodeIds: [],
        activeNodeId: null,
      });
    },

    deleteCurrentFile: async () => {
      await getStore().clear();
    },

    // ── Asset Library CRUD ──────────────────────────────────
    addAsset: (assetData) => {
      const id = uuidv4();
      const asset: Asset = {
        ...assetData,
        id,
        createdAt: new Date().toISOString(),
      };
      const { assets } = getStore();
      saveState({ assets: [...assets, asset] });
      return id;
    },

    updateAsset: (id, data) => {
      const { assets } = getStore();
      saveState({
        assets: assets.map(a => a.id === id ? { ...a, ...data } : a),
      });
    },

    deleteAsset: (id) => {
      const { assets } = getStore();
      saveState({
        assets: assets.filter(a => a.id !== id),
      });
    },

    addRouteConnection: (sourceId, sourcePortAngle, targetId) => {
      pushHistory();
      const { nodes } = getStore();
      if (!nodes[sourceId] || !nodes[targetId]) return;

      const sourceNode = nodes[sourceId];
      const targetNode = nodes[targetId];

      let type: 'child' | 'sister' | 'route' = 'route';

      const isAncestor = (ancestorId: string, descendantId: string, visited: Set<string> = new Set()): boolean => {
        if (visited.has(descendantId)) return false;
        visited.add(descendantId);
        const desc = nodes[descendantId];
        if (!desc) return false;
        if (desc.parentId === ancestorId) return true;
        if (!desc.parentId) return false;
        return isAncestor(ancestorId, desc.parentId, visited);
      };

      if (isAncestor(sourceId, targetId)) {
        type = 'child';
      } else if (sourceNode.parentId && sourceNode.parentId === targetNode.parentId) {
        type = 'sister';
      }

      const port: Port = {
        id: uuidv4(),
        name: 'Route Link',
        angle: sourcePortAngle,
        targetNodeId: targetId,
        type,
      };

      const newNodes = {
        ...nodes,
        [sourceId]: {
          ...sourceNode,
          ports: [...(sourceNode.ports || []), port],
        }
      };

      if (type === 'child') {
        newNodes[sourceId].childrenIds = [...(sourceNode.childrenIds || []), targetId];
        newNodes[targetId] = { ...targetNode, parentId: sourceId };
      } else if (type === 'sister') {
        newNodes[sourceId].sisterIds = [...(sourceNode.sisterIds || []), targetId];
        newNodes[targetId] = { ...targetNode, parentId: sourceNode.parentId };
      }

      saveState({ nodes: newNodes });
    },

    scaleGroup: (nodeIds, scaleFactor) => {
      if (nodeIds.length < 2) return;
      pushHistory();
      const { nodes } = getStore();
      const newNodes = { ...nodes };

      let cx = 0, cy = 0;
      nodeIds.forEach(id => {
        cx += (nodes[id]?.x || 0);
        cy += (nodes[id]?.y || 0);
      });
      cx /= nodeIds.length;
      cy /= nodeIds.length;

      nodeIds.forEach(id => {
        if (newNodes[id]) {
          newNodes[id] = {
            ...newNodes[id],
            x: cx + (newNodes[id].x - cx) * scaleFactor,
            y: cy + (newNodes[id].y - cy) * scaleFactor,
          };
        }
      });
      
      saveState({ nodes: newNodes });
    },

    getEffectiveSetting: (key) => {
      const { editorSettings, fileRegistry, currentFileId } = getStore();
      if (currentFileId) {
        const file = fileRegistry.find(f => f.id === currentFileId);
        if (file?.settingsOverrides && (key in file.settingsOverrides)) {
          return file.settingsOverrides[key] as any;
        }
      }
      return editorSettings[key];
    },

    setFileSettingOverride: async (fileId, overrides) => {
      const { fileRegistry } = getStore();
      const idx = fileRegistry.findIndex(f => f.id === fileId);
      if (idx !== -1) {
        const newReg = [...fileRegistry];
        newReg[idx] = {
          ...newReg[idx],
          settingsOverrides: {
            ...newReg[idx].settingsOverrides,
            ...overrides
          }
        };
        setStore({ fileRegistry: newReg });
        await saveRegistry(newReg);
      }
    },

    clearFileSettingOverride: async (fileId, key) => {
      const { fileRegistry } = getStore();
      const idx = fileRegistry.findIndex(f => f.id === fileId);
      if (idx !== -1 && fileRegistry[idx].settingsOverrides) {
        const newOverrides = { ...fileRegistry[idx].settingsOverrides };
        delete newOverrides[key];
        
        const newReg = [...fileRegistry];
        newReg[idx] = {
          ...newReg[idx],
          settingsOverrides: newOverrides
        };
        setStore({ fileRegistry: newReg });
        await saveRegistry(newReg);
      }
    },

    clearAllFileSettingOverrides: async (fileId) => {
      const { fileRegistry } = getStore();
      const idx = fileRegistry.findIndex(f => f.id === fileId);
      if (idx !== -1) {
        const newReg = [...fileRegistry];
        newReg[idx] = {
          ...newReg[idx],
          settingsOverrides: undefined
        };
        setStore({ fileRegistry: newReg });
        await saveRegistry(newReg);
      }
    },
  };
});

/**
 * Computes the cluster of relevant nodes given a specific target node ID.
 * The cluster includes the target node itself, and any node directly linked to it
 * via children, sister, or port connections (in either direction).
 */
export const getClusterMemberIds = (nodes: Record<string, NodeData>, targetId: string | null): Set<string> => {
  const cluster = new Set<string>();
  if (!targetId || !nodes[targetId]) return cluster;

  cluster.add(targetId);

  // 1. Add direct children
  (nodes[targetId].childrenIds || []).forEach(id => cluster.add(id));
  
  // 2. Add direct sisters
  (nodes[targetId].sisterIds || []).forEach(id => cluster.add(id));

  // 3. Add direct port targets
  (nodes[targetId].ports || []).forEach(p => {
    if (p.targetNodeId) cluster.add(p.targetNodeId);
  });

  // 4. Back-calculate incoming connections (who points to this target?)
  for (const [id, node] of Object.entries(nodes)) {
    if (node.childrenIds?.includes(targetId)) cluster.add(id);
    if (node.sisterIds?.includes(targetId)) cluster.add(id);
    if (node.ports?.some(p => p.targetNodeId === targetId)) cluster.add(id);
    if (node.tunnelLinks?.includes(targetId)) cluster.add(id);
    if (node.mainNodeId === targetId) cluster.add(id); // Buss nodes attached to this target
  }

  // 5. Add tunnel links
  (nodes[targetId].tunnelLinks || []).forEach(id => cluster.add(id));
  
  // 6. Include main node if this is a buss node
  if (nodes[targetId].mainNodeId) {
    cluster.add(nodes[targetId].mainNodeId!);
  }

  return cluster;
};
