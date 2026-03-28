import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { get, set } from 'idb-keyval';

export type CanvasItemType = 'text' | 'image' | 'iframe' | 'video' | 'audio' | 'link';

export interface CanvasItem {
  id: string;
  type: CanvasItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  data: any;
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
  type?: 'child' | 'sister';
  linkLabel?: string;
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
  color?: string;
  isExpanded?: boolean;
  sisterIds?: string[];
  height?: number;
}

export interface AppState {
  nodes: Record<string, NodeData>;
  rootNodeId: string | null;
  camera: { x: number; y: number; zoom: number };
  selectedNodeIds: string[];
  selectedPortIds: { nodeId: string; portIds: string[] } | null;
  activeNodeId: string | null;
  clipboard: NodeData[];
  theme: string;
  linkingSourceId: string | null;
  linkingSourcePortId: { nodeId: string; portId: string } | null;
  
  past: { nodes: Record<string, NodeData>; rootNodeId: string | null }[];
  future: { nodes: Record<string, NodeData>; rootNodeId: string | null }[];
  
  init: () => Promise<void>;
  save: () => Promise<void>;
  clear: () => Promise<void>;
  
  setCamera: (camera: { x: number; y: number; zoom: number } | ((prev: { x: number; y: number; zoom: number }) => { x: number; y: number; zoom: number })) => void;
  selectNode: (id: string, multi?: boolean) => void;
  selectPorts: (nodeId: string, portIds: string[]) => void;
  clearSelection: () => void;
  setActiveNode: (id: string | null) => void;
  setLinkingSourceId: (id: string | null) => void;
  setLinkingSourcePortId: (data: { nodeId: string; portId: string } | null) => void;
  
  addNode: (parentId: string | null, x: number, y: number) => string;
  updateNode: (id: string, data: Partial<NodeData>) => void;
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
  
  addNodeWithPort: (parentId: string, x: number, y: number, angle: number, portName: string, type?: 'child' | 'sister' | 'buss') => string;
  updatePort: (nodeId: string, portId: string, data: Partial<Port>) => void;
  deletePort: (nodeId: string, portId: string) => void;
  movePortsToNode: (sourcePortIds: string[], sourceNodeId: string, targetNodeId: string, angleOffset?: number) => void;
  linkNodesViaPort: (sourceNodeId: string, targetNodeId: string, portAngle: number, type: 'child' | 'sister' | 'buss') => void;
  isSnapEnabled: boolean;
  toggleSnap: () => void;
}

const STORAGE_KEY = 'node-graph-state';

export const useStore = create<AppState>((setStore, getStore) => {
  const saveState = (state: Partial<AppState>) => {
    setStore(state);
    const { nodes, rootNodeId, camera, theme, isSnapEnabled } = getStore();
    set(STORAGE_KEY, { nodes, rootNodeId, camera, theme, isSnapEnabled }).catch(console.error);
  };

  const pushHistory = () => {
    const { nodes, rootNodeId, past } = getStore();
    setStore({
      past: [...past, { nodes: JSON.parse(JSON.stringify(nodes)), rootNodeId }],
      future: [],
    });
  };

  return {
    nodes: {},
    rootNodeId: null,
    camera: { x: 0, y: 0, zoom: 1 },
    selectedNodeIds: [],
    selectedPortIds: null,
    activeNodeId: null,
    clipboard: [],
    theme: 'dark',
    linkingSourceId: null,
    linkingSourcePortId: null,
    isSnapEnabled: true,
    past: [],
    future: [],

    init: async () => {
      try {
        const data = await get(STORAGE_KEY);
        if (data && data.nodes) {
          setStore({ 
            nodes: data.nodes, 
            rootNodeId: data.rootNodeId,
            camera: data.camera || { x: 0, y: 0, zoom: 1 },
            theme: data.theme || 'dark',
            isSnapEnabled: data.isSnapEnabled !== undefined ? data.isSnapEnabled : true
          });
          return;
        }
      } catch (e) {
        console.error('Failed to load state from IndexedDB, falling back to initial state:', e);
      }
      
      // Fallback: Create initial root node if no data or error
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
      saveState({ nodes: { [rootId]: rootNode }, rootNodeId: rootId });
    },

    save: async () => {
      const { nodes, rootNodeId, camera, theme } = getStore();
      await set(STORAGE_KEY, { nodes, rootNodeId, camera, theme });
    },
    clear: async () => {
      console.log('Clearing project state...');
      await import('idb-keyval').then(mod => mod.del(STORAGE_KEY));
      
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

      setStore({
        nodes: { [rootId]: rootNode },
        rootNodeId: rootId,
        camera: { x: window.innerWidth / 2, y: window.innerHeight / 2, zoom: 1 },
        selectedNodeIds: [],
        activeNodeId: null,
        clipboard: [],
        theme: 'dark',
        linkingSourceId: null,
        past: [],
        future: [],
      });
    },

    setCamera: (cameraUpdater) => {
      setStore((state) => ({
        camera: typeof cameraUpdater === 'function' ? cameraUpdater(state.camera) : cameraUpdater,
      }));
    },

    selectNode: (id, multi = false) => {
      const { linkingSourceId, nodes, updateNode } = getStore();
      
      if (linkingSourceId) {
        if (linkingSourceId !== id && !nodes[linkingSourceId].tunnelLinks.includes(id)) {
          updateNode(linkingSourceId, { tunnelLinks: [...nodes[linkingSourceId].tunnelLinks, id] });
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

    addNode: (parentId, x, y) => {
      pushHistory();
      const id = uuidv4();
      const newNode: NodeData = {
        id,
        parentId,
        title: 'New Node',
        description: '',
        x,
        y,
        childrenIds: [],
        tunnelLinks: [],
        pages: [{ id: uuidv4(), name: 'Main Page', items: [] }],
        ports: [],
        isExpanded: true,
      };

      const { nodes } = getStore();
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
          childrenIds: [...newNodes[parentId].childrenIds, id],
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

    deleteNode: (id) => {
      pushHistory();
      const { nodes, rootNodeId } = getStore();
      if (!nodes[id]) return;

      const newNodes = { ...nodes };
      
      // Recursive delete helper
      const deleteRecursive = (nodeId: string) => {
        const node = newNodes[nodeId];
        if (!node) return;
        node.childrenIds.forEach(deleteRecursive);
        delete newNodes[nodeId];
      };

      const parentId = newNodes[id].parentId;
      if (parentId && newNodes[parentId]) {
        newNodes[parentId] = {
          ...newNodes[parentId],
          childrenIds: newNodes[parentId].childrenIds.filter((childId) => childId !== id),
        };
      }

      deleteRecursive(id);

      saveState({
        nodes: newNodes,
        rootNodeId: rootNodeId === id ? null : rootNodeId,
        selectedNodeIds: getStore().selectedNodeIds.filter((selId) => selId !== id),
      });
    },

    undo: () => {
      const { past, future, nodes, rootNodeId } = getStore();
      if (past.length === 0) return;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);

      setStore({
        past: newPast,
        future: [{ nodes: JSON.parse(JSON.stringify(nodes)), rootNodeId }, ...future],
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
        past: [...past, { nodes: JSON.parse(JSON.stringify(nodes)), rootNodeId }],
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
      const clipboard = selectedNodeIds.map((id) => JSON.parse(JSON.stringify(nodes[id])));
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
      const newNode: NodeData = {
        id,
        parentId: actualParentId,
        mainNodeId: type === 'buss' ? (nodes[parentId].nodeType === 'buss' ? nodes[parentId].mainNodeId : parentId) : undefined,
        nodeType: type === 'buss' ? 'buss' : 'default',
        title: type === 'buss' ? portName : (type === 'sister' ? 'Sister Node' : 'New Node'),
        description: '',
        x,
        y,
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

      const isBussChild = nodes[parentId].nodeType === 'buss' && type === 'child';

      const newNodes = { 
        ...nodes, 
        [id]: newNode,
        [parentId]: {
          ...nodes[parentId],
          ports: [...(nodes[parentId].ports || []), port],
          isExpanded: true,
          ...(type === 'sister' || type === 'buss' ? { sisterIds: [...(nodes[parentId].sisterIds || []), id] } : isBussChild ? {} : { childrenIds: [...(nodes[parentId].childrenIds || []), id] })
        }
      };

      // If sister, buss mode, or a child of a buss node, and there's an actual parent, add to parent's childrenIds for rendering
      if ((type === 'sister' || type === 'buss' || isBussChild) && actualParentId && newNodes[actualParentId]) {
        newNodes[actualParentId] = {
          ...newNodes[actualParentId],
          childrenIds: [...newNodes[actualParentId].childrenIds, id]
        };
      }

      saveState({ nodes: newNodes, rootNodeId: getStore().rootNodeId });
      return id;
    },

    updatePort: (nodeId, portId, data) => {
      pushHistory();
      const { nodes } = getStore();
      if (!nodes[nodeId]) return;

      saveState({
        nodes: {
          ...nodes,
          [nodeId]: {
            ...nodes[nodeId],
            ports: nodes[nodeId].ports.map((p) => (p.id === portId ? { ...p, ...data } : p)),
          },
        },
      });
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
            ports: nodes[nodeId].ports.filter((p) => p.id !== portId),
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
  };
});
