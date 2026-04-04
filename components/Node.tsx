'use client';

import { useStore, BUSS_NODE_SIZE } from '@/lib/store';
import { computeNodeScreenSize, getLODState, getEffectiveLODThresholds } from '@/lib/lodSystem';
import { isEditableTextTarget } from '@/lib/domUtils';
import { eventCoordinator } from '@/lib/eventCoordinator';
import { motion } from 'motion/react';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Trash2, Maximize2, X, Check } from 'lucide-react';
import { useContext } from 'react';
import { PortPositionContext, ClusterContext } from './Canvas';

export function Node({ id, renderPath = [] }: { id: string; renderPath?: string[] }) {
  // === Targeted selectors: only re-render when THIS node's data changes ===
  const node = useStore(state => state.nodes[id]);
  const isSelected = useStore(state => state.selectedNodeIds.includes(id));
  const selectedPortIds = useStore(state => state.selectedPortIds);
  const cameraZoom = useStore(state => state.camera.zoom); // Only zoom for LOD, NOT x/y
  const editorSettings = useStore(state => state.editorSettings);
  const isSnapEnabled = useStore(state => state.isSnapEnabled);

  // === All store actions are fetched at event-time, not at render-time ===
  const getStore = useCallback(() => useStore.getState(), []);
  const nodes = useStore(state => state.nodes); // needed for connection line rendering
  const [isEditing, setIsEditing] = useState(false);
  const [isDraggingPort, setIsDraggingPort] = useState(false);
  const [nodeMode, setNodeMode] = useState<'child' | 'sister' | 'buss' | 'route'>('child');
  const [dragCursor, setDragCursor] = useState<{ x: number; y: number } | null>(null);
  const [dragAngle, setDragAngle] = useState(0);
  const [editingPortId, setEditingPortId] = useState<string | null>(null);
  const [hoveredPortId, setHoveredPortId] = useState<string | null>(null);
  const [lineContextMenu, setLineContextMenu] = useState<{ portId: string, x: number, y: number, midX: number, midY: number } | null>(null);
  const [nodeHeight, setNodeHeight] = useState(() => {
    // Seed from stored height so we never start with a wrong default
    const stored = useStore.getState().nodes[id];
    return stored?.height || 140;
  });
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const dragAngleRef = useRef(0);
  const nodeRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragAbortRef = useRef<AbortController | null>(null);
  const portCreatedByDragRef = useRef(false);
  const portPositionsRef = useContext(PortPositionContext);
  const clusterMemberIds = useContext(ClusterContext);
  const isOutsideCluster = editorSettings.clusterViewMode && clusterMemberIds && !clusterMemberIds.has(id);

  useEffect(() => {
    return () => {
      if (dragAbortRef.current) {
        dragAbortRef.current.abort();
        dragAbortRef.current = null;
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const el = nodeRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      // CRITICAL: browsers report 0-height elements when tabs are backgrounded.
      // Never update heights while the document is hidden.
      if (document.hidden) return;

      for (const entry of entries) {
        const currentNode = useStore.getState().nodes[id];
        if (!currentNode) return;

        if (currentNode.nodeType === 'buss') {
          if (currentNode.height !== BUSS_NODE_SIZE) {
            useStore.getState().updateNodeSilent(id, { height: BUSS_NODE_SIZE });
          }
          setNodeHeight(BUSS_NODE_SIZE);
        } else {
          const el = nodeRef.current;
          if (!el) return;
          const measured = el.offsetHeight;
          // If the browser reports 0 or a tiny value, it's a backgrounded-tab glitch — skip.
          if (measured < 10) return;
          const h = Math.max(Math.round(measured), 60);
          if (currentNode.height !== h) {
            useStore.getState().updateNodeSilent(id, { height: h });
          }
          setNodeHeight(h);
        }
      }
    });

    observer.observe(el);

    // When the tab comes back from being hidden, force a re-measure
    // to correct any stale heights from the backgrounded period.
    const handleVisibilityChange = () => {
      if (!document.hidden && nodeRef.current) {
        const currentNode = useStore.getState().nodes[id];
        if (!currentNode || currentNode.nodeType === 'buss') return;
        const measured = nodeRef.current.offsetHeight;
        if (measured >= 10) {
          const h = Math.max(Math.round(measured), 60);
          if (currentNode.height !== h) {
            useStore.getState().updateNodeSilent(id, { height: h });
          }
          setNodeHeight(h);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id]);

  const nodeWidth = node?.nodeType === 'buss' ? BUSS_NODE_SIZE : 280; 

  const getPointOnPerimeter = (angle: number) => {
    if (!node) return { x: 0, y: 0 };
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    if (node.nodeType === 'buss') {
      const radius = nodeWidth / 2;
      return {
        x: radius + cos * radius,
        y: radius + sin * radius,
      };
    }
    
    const halfW = nodeWidth / 2;
    const halfH = Math.max(nodeHeight, 1) / 2;
    
    const dx = cos;
    const dy = sin;
    
    const scale = Math.min(
      dx !== 0 ? Math.abs(halfW / dx) : Infinity,
      dy !== 0 ? Math.abs(halfH / dy) : Infinity
    );
    
    return { x: dx * scale + halfW, y: dy * scale + halfH };
  };

  useEffect(() => {
    if (!portPositionsRef || !nodeRef.current || !node) return;
    const currentPositions = portPositionsRef.current;
    const nodeRect = nodeRef.current.getBoundingClientRect();
    const ports = node.ports || [];
    
    for (const port of ports) {
      const pos = getPointOnPerimeter(port.angle);
      currentPositions.set(`${id}:${port.id}`, {
        x: nodeRect.left + pos.x,
        y: nodeRect.top + pos.y,
      });
    }
    return () => {
      for (const port of ports) {
        currentPositions.delete(`${id}:${port.id}`);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.ports, id, portPositionsRef, nodeHeight]);

  if (!node) return null;

  if (renderPath.includes(id)) {
    console.warn(`Circular React downward render detected for node ${id}! Halting recursion to prevent freeze.`);
    return null;
  }

  let depth = 0;
  let current: any = node;
  const visited = new Set<string>();
  while (current && current.parentId) {
    if (visited.has(current.id)) {
      console.warn('Circular reference detected in node hierarchy!', id);
      break;
    }
    visited.add(current.id);
    depth++;
    current = nodes[current.parentId];
  }

  const thresholds = getEffectiveLODThresholds(editorSettings);
  // Use constant base height to prevent negative feedback loops from compact modes hiding text
  const BASE_NODE_HEIGHT = 140;
  // Use renderPath.length instead of absolute depth to perfectly match the DOM scaling sequence
  const renderDepth = renderPath.length;
  const screenSize = computeNodeScreenSize(BASE_NODE_HEIGHT, renderDepth, cameraZoom);
  const lodState = getLODState(screenSize, thresholds);

  if (lodState === 'culled') return null;

  const getNormalFromAngle = (angle: number) => {
    if (node.nodeType === 'buss') {
      const rad = (angle * Math.PI) / 180;
      return { x: Math.cos(rad), y: Math.sin(rad) };
    }
    const normAngle = ((angle % 360) + 360) % 360;
    if (normAngle >= 315 || normAngle < 45) return { x: 1, y: 0 };
    if (normAngle >= 45 && normAngle < 135) return { x: 0, y: 1 };
    if (normAngle >= 135 && normAngle < 225) return { x: -1, y: 0 };
    return { x: 0, y: -1 };
  };

  const handlePortDragStart = (e: React.PointerEvent) => {
    if (!eventCoordinator.requestMode('port-drag')) return;
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingPort(true);
    portCreatedByDragRef.current = false;
    
    const handleMove = (moveEvent: PointerEvent) => {
      if (!nodeRef.current) return;
      const rect = nodeRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const dx = moveEvent.clientX - centerX;
      const dy = moveEvent.clientY - centerY;
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      
      // Snapping
      const snap = 15;
      angle = Math.round(angle / snap) * snap;
      
      dragAngleRef.current = angle;
      setDragAngle(angle);
      
      if (nodeMode === 'route') {
        setDragCursor({ x: moveEvent.clientX, y: moveEvent.clientY });
      }
    };

    const handleUp = (upEvent: PointerEvent) => {
      eventCoordinator.releaseMode('port-drag');
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      setIsDraggingPort(false);

      if (nodeMode === 'route') {
        const targetEl = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
        const targetNodeEl = targetEl?.closest('[data-node-id]');
        if (targetNodeEl) {
          const targetNodeId = targetNodeEl.getAttribute('data-node-id');
          if (targetNodeId && targetNodeId !== id) {
            useStore.getState().addRouteConnection(id, dragAngleRef.current, targetNodeId);
          }
        }
        portCreatedByDragRef.current = true;
        setNodeMode('child'); // Reset after use
        setDragCursor(null);
        return;
      }

      // Calculate position for new child
      // We want it to be some distance away from the port
      const rad = (dragAngleRef.current * Math.PI) / 180;
      const dist = nodeMode === 'sister' ? 400 : (nodeMode === 'buss' ? 100 : 800); // Sisters are at same scale, children are scaled 0.5x
      
      let childX, childY;
      if (nodeMode === 'sister' || nodeMode === 'buss') {
        // Sister and buss nodes are siblings of the current node, so their position is relative to the parent's parent
        childX = node.x + Math.cos(rad) * dist + nodeWidth / 2;
        childY = node.y + Math.sin(rad) * dist + nodeHeight / 2;
      } else if (node.nodeType === 'buss' && nodeMode === 'child') {
        // If creating a child from a buss node, it acts as a child of the main node
        // So its position must be relative to the main node, in the main node's children coordinate system (scaled by 2)
        const mainNode = nodes[node.mainNodeId || node.parentId || ''];
        if (mainNode) {
          const relX = (node.x - mainNode.x) * 2;
          const relY = (node.y - mainNode.y) * 2;
          childX = relX + Math.cos(rad) * dist + nodeWidth; // nodeWidth is 130, so * 2 is 260, but let's just use nodeWidth
          childY = relY + Math.sin(rad) * dist + nodeHeight;
        } else {
          childX = Math.cos(rad) * dist + nodeWidth / 2;
          childY = Math.sin(rad) * dist + nodeHeight / 2;
        }
      } else {
        // Child nodes are children of the current node, so their position is relative to the current node
        childX = Math.cos(rad) * dist + nodeWidth / 2;
        childY = Math.sin(rad) * dist + nodeHeight / 2;
      }

      if (isSnapEnabled) {
        const snapValue = 20;
        childX = Math.round(childX / snapValue) * snapValue;
        childY = Math.round(childY / snapValue) * snapValue;
      }

      getStore().addNodeWithPort(id, childX, childY, dragAngleRef.current, 'New Port', nodeMode);
      portCreatedByDragRef.current = true;
      setNodeMode('child'); // Reset after use
    };

    if (dragAbortRef.current) dragAbortRef.current.abort();
    const controller = new AbortController();
    dragAbortRef.current = controller;

    window.addEventListener('pointermove', handleMove, { signal: controller.signal });
    window.addEventListener('pointerup', handleUp, { signal: controller.signal });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const routeConnectSource = useStore.getState().routeConnectSource;
    if (routeConnectSource) {
      e.stopPropagation();
      e.preventDefault();
      if (routeConnectSource.nodeId !== id) {
        useStore.getState().addRouteConnection(routeConnectSource.nodeId, routeConnectSource.portAngle, id);
      }
      useStore.getState().setRouteConnectSource(null);
      eventCoordinator.releaseMode('route-connect');
      return;
    }

    if (!eventCoordinator.requestMode('drag')) return;
    e.stopPropagation();

    // Capture state before selection changes
    const wasMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
    const prevSelectedIds = useStore.getState().selectedNodeIds;

    getStore().selectNode(id, wasMultiSelect);

    if (nodeRef.current && !isEditing) {
      // Start dragging
      const startX = e.clientX;
      const startY = e.clientY;
      const initialNodeX = node.x;
      const initialNodeY = node.y;

      // Capture initial positions of buss nodes that extend from this node
      const allNodes = useStore.getState().nodes;
      const bussNodeInitials: { id: string; x: number; y: number }[] = [];
      for (const nid of Object.keys(allNodes)) {
        if (allNodes[nid].mainNodeId === id) {
          bussNodeInitials.push({ id: nid, x: allNodes[nid].x, y: allNodes[nid].y });
        }
      }

      // Capture initial positions of co-moving nodes:
      // 1. Grouped nodes (same groupId), 2. Other currently-selected nodes
      const currentSelectedIds = useStore.getState().selectedNodeIds;
      const thisNode = allNodes[id];
      const coMovingIds = new Set<string>();
      // Add grouped siblings
      if (thisNode?.groupId) {
        for (const nid of Object.keys(allNodes)) {
          if (nid !== id && allNodes[nid].groupId === thisNode.groupId) {
            coMovingIds.add(nid);
          }
        }
      }
      // Add other selected nodes
      for (const nid of currentSelectedIds) {
        if (nid !== id) coMovingIds.add(nid);
      }
      const coMovingInitials: { id: string; x: number; y: number }[] = [];
      for (const nid of coMovingIds) {
        if (allNodes[nid]) {
          coMovingInitials.push({ id: nid, x: allNodes[nid].x, y: allNodes[nid].y });
        }
      }

      const handlePointerMove = (moveEvent: PointerEvent) => {
        let current = nodes[id];
        let depth = 0;
        const dragVisited = new Set<string>();
        while (current && current.parentId) {
          if (dragVisited.has(current.id)) break;
          dragVisited.add(current.id);
          depth++;
          current = nodes[current.parentId];
        }
        const cumulativeScale = Math.pow(0.5, depth) * useStore.getState().camera.zoom;

        const dx = (moveEvent.clientX - startX) / cumulativeScale;
        const dy = (moveEvent.clientY - startY) / cumulativeScale;

        let newX = initialNodeX + dx;
        let newY = initialNodeY + dy;

        if (isSnapEnabled) {
          const snapValue = 20; // Base snap value in node's local coordinate space
          newX = Math.round(newX / snapValue) * snapValue;
          newY = Math.round(newY / snapValue) * snapValue;
        }

        getStore().updateNodeSilent(id, { x: newX, y: newY });

        // Move buss nodes that extend from this node by the same delta
        const actualDx = newX - initialNodeX;
        const actualDy = newY - initialNodeY;
        for (const buss of bussNodeInitials) {
          useStore.getState().updateNodeSilent(buss.id, { 
            x: buss.x + actualDx, 
            y: buss.y + actualDy 
          });
        }
        // Move all co-moving nodes (group siblings + other selected nodes)
        for (const co of coMovingInitials) {
          useStore.getState().updateNodeSilent(co.id, {
            x: co.x + actualDx,
            y: co.y + actualDy
          });
        }
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        eventCoordinator.releaseMode('drag');
        if (dragAbortRef.current) {
          dragAbortRef.current.abort();
          dragAbortRef.current = null;
        }

        // If it was a click (no significant movement), zoom to node
        const dist = Math.hypot(upEvent.clientX - startX, upEvent.clientY - startY);
        if (dist < 5) {
          const prevActiveId = prevSelectedIds[0];
          const prevActiveNode = prevActiveId ? allNodes[prevActiveId] : null;
          const isBrotherSister = prevActiveNode && prevActiveNode.parentId === node.parentId && prevActiveId !== id;
          
          let shouldZoom = true;
          if (wasMultiSelect) {
            shouldZoom = false; // "when holding ctrl i dont want it to zoom and center i want it to select"
          } else if (isBrotherSister && !upEvent.altKey) {
            shouldZoom = false; // "clicking on fellow chilkdren/sisters/brothers it shouldnt center... however if holding alt... then it should zoom"
          }

          if (shouldZoom) {
            let current = nodes[id];
            let depth = 0;
            const clickVisited = new Set<string>();
          while (current && current.parentId) {
            if (clickVisited.has(current.id)) break;
            clickVisited.add(current.id);
            depth++;
            current = nodes[current.parentId];
          }
          
          // Compute absolute world position by walking up the parent chain
          // This is more reliable than getBoundingClientRect which depends on current camera
          let worldX = node.x + nodeWidth / 2;
          let worldY = node.y + nodeHeight / 2;
          let scale = 1;
          let walkId = node.parentId;
          const posVisited = new Set<string>();
          const allNodes = useStore.getState().nodes;
          while (walkId && allNodes[walkId]) {
            if (posVisited.has(walkId)) break;
            posVisited.add(walkId);
            const parent = allNodes[walkId];
            // Children live inside a scale(0.5) container at parent's origin
            worldX = parent.x + worldX * 0.5;
            worldY = parent.y + worldY * 0.5;
            scale *= 0.5;
            walkId = parent.parentId;
          }

          const { referenceZoom } = getStore().editorSettings;
          // Target zoom: navigate so this depth level appears at the reference zoom
          // 2^depth brings this depth's nodes to 1:1, then multiply by referenceZoom
          const targetZoom = Math.pow(2, depth) * referenceZoom;
          const screenCenterX = window.innerWidth / 2;
          const screenCenterY = window.innerHeight / 2;

          getStore().setCamera(() => ({
            x: screenCenterX - worldX * targetZoom,
            y: screenCenterY - worldY * targetZoom,
            zoom: targetZoom,
          }));
          }
        }
        
        // If there was actual dragging, finalize with a history push
        if (dist >= 5) {
          const finalNode = useStore.getState().nodes[id];
          if (finalNode) {
            getStore().updateNode(id, { x: finalNode.x, y: finalNode.y });
          }
        }
      };

      if (dragAbortRef.current) dragAbortRef.current.abort();
      const controller = new AbortController();
      dragAbortRef.current = controller;

      window.addEventListener('pointermove', handlePointerMove, { signal: controller.signal });
      window.addEventListener('pointerup', handlePointerUp, { signal: controller.signal });
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!eventCoordinator.isIdle()) return;
    e.stopPropagation();
    if (nodeRef.current && !isEditing) {
      getStore().setActiveNode(id);
    }
  };

  const handleOpenEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    getStore().setActiveNode(id);
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    getStore().addNode(id, 600, 0);
  };

  const getAbsolutePosition = (targetId: string) => {
    let current = nodes[targetId];
    if (!current) return { x: 0, y: 0, scale: 1 };
    const path = [];
    while (current) {
      path.push(current);
      if (!current.parentId) break;
      current = nodes[current.parentId];
    }
    path.reverse();
    
    let absX = 0;
    let absY = 0;
    let scale = 1;
    
    for (let i = 0; i < path.length; i++) {
      absX += path[i].x * scale;
      absY += path[i].y * scale;
      if (i < path.length - 1) {
        scale *= 0.5;
      }
    }
    return { x: absX, y: absY, scale };
  };

  const teleportToNode = (destId: string) => {
    getStore().selectNode(destId);
    const absPos = getAbsolutePosition(destId);
    const destNode = nodes[destId];
    if (!destNode) return;
    
    const dWidth = destNode.nodeType === 'buss' ? 48 : 280;
    const dHeight = destNode.nodeType === 'buss' ? 48 : (destNode.height || 140);
    
    // Scale local centered coordinates into global accumulation
    const worldX = absPos.x + (dWidth / 2) * absPos.scale;
    const worldY = absPos.y + (dHeight / 2) * absPos.scale;

    getStore().setCamera(() => {
      let curr = destNode;
      let depth = 0;
      while(curr && curr.parentId) { depth++; curr = nodes[curr.parentId]; }
      const targetZoom = Math.pow(2, depth) * getStore().editorSettings.referenceZoom;
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;
      return {
        x: screenCenterX - worldX * targetZoom,
        y: screenCenterY - worldY * targetZoom,
        zoom: targetZoom,
      };
    });
  };

  return (
    <div
      className="absolute"
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
      }}
    >
      {/* Node Content */}
      <motion.div
        id={`node-${id}`}
        data-node-id={id}
        ref={nodeRef}
        layoutId={`node-${id}`}
        className={`${node.nodeType === 'buss' ? 'flex items-center justify-center text-center border-blue-500/40 border-2' : 'w-[280px] p-5 border'} cursor-pointer relative z-20 transition-all duration-300 ${
          isSelected 
            ? 'ring-1 ring-blue-500/50' 
            : (node.nodeType === 'buss' ? 'hover:border-blue-400/60' : 'hover:border-white/[0.15]')
        } lod-${lodState} ${isOutsideCluster ? 'opacity-[0.15] filter grayscale scale-95' : 'opacity-100 scale-100'}`}
        style={{
          ...(node.nodeType === 'buss' ? { width: BUSS_NODE_SIZE, height: BUSS_NODE_SIZE } : {}),
          borderRadius: node.nodeType === 'buss' ? '9999px' : `${editorSettings.nodeBorderRadius}px`,
          backdropFilter: `blur(${editorSettings.nodeBlur}px)`,
          backgroundColor: isSelected ? `${editorSettings.colorNodeBg}` : `${editorSettings.colorNodeBg}e6`,
          borderColor: isSelected ? editorSettings.colorPrimary : node.groupColor ? `${node.groupColor}60` : undefined,
          boxShadow: node.groupColor 
            ? `0 0 0 3px ${node.groupColor}40, 0 0 20px ${node.groupColor}20` 
            : editorSettings.glowEffects 
              ? `0 ${10 * editorSettings.nodeShadowIntensity}px ${40 * editorSettings.nodeShadowIntensity}px rgba(0,0,0,${0.5 * editorSettings.nodeShadowIntensity})`
              : 'none',
        }}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        title={lodState === 'shape' || lodState === 'star' ? node.title : undefined}
      >
        {/* Group color indicator dot */}
        {node.groupColor && (
          <div 
            className={`absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full border-2 border-[#0d1117] z-30 shadow-lg`}
            style={{ backgroundColor: node.groupColor }}
            title="Grouped"
          />
        )}
        {/* Inner Grid / AAA Polish */}
        <div className={`absolute inset-0 overflow-hidden pointer-events-none`} style={{ borderRadius: node.nodeType === 'buss' ? '9999px' : `${editorSettings.nodeBorderRadius}px` }}>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:12px_12px]" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent" />
          <div className={`absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]`} style={{ borderRadius: node.nodeType === 'buss' ? '9999px' : `${editorSettings.nodeBorderRadius}px` }} />
        </div>

        <div className="node-text-content w-full h-full flex flex-col relative z-10">
        {isEditing ? (
          <div className={`flex flex-col gap-3 relative z-10 ${node.nodeType === 'buss' ? 'w-full px-2' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
            {node.nodeType !== 'buss' && (
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Editing Node</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
                  className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            )}
            <input
              autoFocus
              className={`bg-transparent border-b border-blue-500/50 outline-none font-bold placeholder:text-neutral-600 ${node.nodeType === 'buss' ? 'text-sm text-center w-full' : 'text-xl'}`}
              style={{ color: editorSettings.colorText }}
              value={node.title}
              placeholder="Node Title"
              onChange={(e) => getStore().updateNode(id, { title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
            />
            {node.nodeType !== 'buss' && (
              <textarea
                className="bg-transparent border-b border-neutral-700 outline-none text-sm text-neutral-300 resize-none placeholder:text-neutral-600"
                value={node.description}
                placeholder="Node Description"
                onChange={(e) => getStore().updateNode(id, { description: e.target.value })}
                rows={3}
              />
            )}
          </div>
        ) : (
          <div className={`flex flex-col gap-2 relative z-10 ${node.nodeType === 'buss' ? 'items-center w-full px-2' : ''}`}>
            <div className={`flex ${node.nodeType === 'buss' ? 'justify-center w-full' : 'justify-between items-start'}`}>
              <h3 
                className={`${node.nodeType === 'buss' ? 'text-[10px] text-center break-words w-full leading-none' : 'text-xl'} font-bold truncate text-white tracking-tight`} 
                style={{ color: editorSettings.colorText }}
                title={node.nodeType === 'buss' ? node.title : undefined}
              >
                {node.nodeType === 'buss' ? (node.title?.[0] || '•').toUpperCase() : node.title}
              </h3>
              {isSelected && node.nodeType !== 'buss' && (
                <div className="node-actions flex gap-1 bg-black/40 p-1 rounded-lg border border-white/[0.05] backdrop-blur-md shadow-inner">
                  <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1.5 hover:bg-white/[0.1] rounded-md text-neutral-400 hover:text-white transition-colors" title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { 
                    e.stopPropagation(); 
                    if (window.confirm('Delete this node and all its children?')) {
                      getStore().deleteNode(id); 
                    }
                  }} className="p-1.5 hover:bg-red-500/20 rounded-md text-red-400 hover:text-red-300 transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            {node.nodeType !== 'buss' && (
              <p className="node-description text-sm text-neutral-400 line-clamp-3 leading-relaxed">{node.description || 'No description provided.'}</p>
            )}
            {isSelected && node.nodeType === 'buss' && (
              <div className="node-actions absolute -top-10 left-1/2 -translate-x-1/2 flex gap-1 bg-black/40 p-1 rounded-lg border border-white/[0.05] backdrop-blur-md shadow-inner">
                <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1.5 hover:bg-white/[0.1] rounded-md text-neutral-400 hover:text-white transition-colors" title="Edit">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); getStore().deleteNode(id); }} className="p-1.5 hover:bg-red-500/20 rounded-md text-red-400 hover:text-red-300 transition-colors" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
        </div>

        {/* Add Child Button / Port Creator */}
        {isSelected && (
          <div 
            className="absolute z-20"
            style={{
              left: isDraggingPort ? getPointOnPerimeter(dragAngle).x : 'auto',
              top: isDraggingPort ? getPointOnPerimeter(dragAngle).y : -20,
              right: isDraggingPort ? 'auto' : -20,
              transform: isDraggingPort ? 'translate(-50%, -50%)' : 'none',
            }}
          >
            <button
              onPointerDown={(e) => {
                if (e.button === 2) {
                  e.preventDefault();
                  e.stopPropagation();
                  setNodeMode(prev => prev === 'child' ? 'sister' : prev === 'sister' ? 'buss' : prev === 'buss' ? 'route' : 'child');
                  return;
                }
                if (e.button === 0) {
                  if (nodeMode === 'route') {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!eventCoordinator.requestMode('route-connect')) return;
                    useStore.getState().setRouteConnectSource({ nodeId: id, portAngle: 0 }); // Angle gets updated on drag
                  }
                  handlePortDragStart(e);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                if (!isDraggingPort && e.button === 0 && !portCreatedByDragRef.current) {
                  e.stopPropagation();
                  if (nodeMode === 'route') {
                    // Start click-click mode
                    return;
                  }
                   // For simple click, we don't have an angle, but we can default to 0 or something
                  const dist = nodeMode === 'sister' ? 300 : (nodeMode === 'buss' ? 80 : 600);
                  let newX, newY;
                  const alignOn = getStore().editorSettings.alignOnCreation;
                  const alignOffset = getStore().editorSettings.alignColumnOffset || 60;

                  const freshState = getStore();
                  const freshNode = freshState.nodes[id];
                  const freshNodes = freshState.nodes;

                  if (alignOn && nodeMode === 'child' && freshNode.childrenIds.length > 0) {
                    // Auto-stack: place below existing children in a column
                    const children = freshNode.childrenIds.map(cid => freshNodes[cid]).filter(Boolean).sort((a, b) => a.y - b.y);
                    const firstChild = children[0];
                    const lastChild = children[children.length - 1];
                    newX = firstChild.x;
                    newY = lastChild.y + (lastChild.height || 140) + alignOffset;
                  } else if (alignOn && nodeMode === 'sister') {
                    // Auto-stack sisters to the right of the source node
                    const sisters = (freshNode.sisterIds || []).map(sid => freshNodes[sid]).filter(Boolean).sort((a, b) => a.y - b.y);
                    if (sisters.length > 0) {
                      const lastSister = sisters[sisters.length - 1];
                      newX = freshNode.x + dist;
                      newY = lastSister.y + (lastSister.height || 140) + alignOffset;
                    } else {
                      newX = freshNode.x + dist;
                      newY = freshNode.y;
                    }
                  } else if (nodeMode === 'sister' || nodeMode === 'buss') {
                    newX = freshNode.x + dist;
                    newY = freshNode.y;
                  } else if (node.nodeType === 'buss' && nodeMode === 'child') {
                    const mainNode = freshNodes[freshNode.mainNodeId || freshNode.parentId || ''];
                    if (mainNode) {
                      const relX = (node.x - mainNode.x) * 2;
                      const relY = (node.y - mainNode.y) * 2;
                      newX = relX + dist;
                      newY = relY;
                    } else {
                      newX = dist;
                      newY = 0;
                    }
                  } else {
                    newX = dist;
                    newY = 0;
                  }
                  if (isSnapEnabled) {
                    const snapValue = 20;
                    newX = Math.round(newX / snapValue) * snapValue;
                    newY = Math.round(newY / snapValue) * snapValue;
                  }
                  getStore().addNodeWithPort(id, newX, newY, 0, 'New Port', nodeMode as any);
                  setNodeMode('child');
                }
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 border border-white/10 ${
                isDraggingPort 
                  ? (nodeMode === 'sister' ? 'bg-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.6)]' : nodeMode === 'buss' ? 'bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.6)]' : nodeMode === 'route' ? 'bg-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.6)]' : 'bg-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.6)]')
                  : (nodeMode === 'sister' ? 'bg-purple-600 shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:bg-purple-500' : nodeMode === 'buss' ? 'bg-green-600 shadow-[0_0_20px_rgba(34,197,94,0.5)] hover:bg-green-500' : nodeMode === 'route' ? 'bg-cyan-600 shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:bg-cyan-500' : 'bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:bg-blue-500')
              }`}
              title={nodeMode === 'sister' ? "Sister Node Mode" : nodeMode === 'buss' ? "Buss Node Mode" : nodeMode === 'route' ? "Route Mode — Connect existing nodes" : "Drag to create Port, Right-click to cycle modes"}
            >
              <Plus className="w-5 h-5 text-white drop-shadow-md" />
            </button>
          </div>
        )}

        {/* Route Drag Line */}
        {nodeMode === 'route' && isDraggingPort && dragCursor && nodeRef.current && (() => {
          const rect = nodeRef.current.getBoundingClientRect();
          const scaleX = rect.width / (node.nodeType === 'buss' ? BUSS_NODE_SIZE : 280);
          const scaleY = rect.height / nodeHeight;
          const localTargetX = (dragCursor.x - rect.left) / scaleX;
          const localTargetY = (dragCursor.y - rect.top) / scaleY;
          
          return (
            <svg className="absolute inset-0 overflow-visible pointer-events-none z-50">
              <line
                x1={getPointOnPerimeter(dragAngle).x}
                y1={getPointOnPerimeter(dragAngle).y}
                x2={localTargetX}
                y2={localTargetY}
                stroke="#06b6d4"
                strokeWidth={3 / scaleX}
                strokeDasharray={`${8 / scaleX} ${8 / scaleX}`}
              />
            </svg>
          );
        })()}

        {/* Render Existing Ports */}
        {(node.ports || []).map((port) => {
          const pos = getPointOnPerimeter(port.angle);
          const isHovered = hoveredPortId === port.id;
          const isEditingPort = editingPortId === port.id;

          return (
            <div
              key={port.id}
              data-port-id={port.id}
              className="absolute z-30 pointer-events-auto"
              style={{
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseEnter={() => setHoveredPortId(port.id)}
              onMouseLeave={() => setHoveredPortId(null)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (clickTimeoutRef.current) {
                  clearTimeout(clickTimeoutRef.current);
                  clickTimeoutRef.current = null;
                }
                setEditingPortId(null);
                // Select all ports at this location (same angle)
                const sameLocationPorts = (node.ports || []).filter(p => Math.abs(p.angle - port.angle) < 1);
                getStore().selectPorts(id, sameLocationPorts.map(p => p.id));
              }}
              onContextMenu={(e) => {
                if (isEditableTextTarget(e.target as EventTarget)) return;
                e.preventDefault();
                e.stopPropagation();
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                setEditingPortId(null);
                const startX = e.clientX;
                const startY = e.clientY;
                let isDragging = false;
                
                const isRightClick = e.button === 2;
                
                if (isRightClick) {
                  if (!eventCoordinator.requestMode('route-connect')) return;
                  getStore().setLinkingSourcePortId({ nodeId: id, portId: port.id });
                } else {
                  if (!eventCoordinator.requestMode('port-drag')) return;
                }

                const handleMove = (moveEvent: PointerEvent) => {
                  const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
                  if (dist < 5) return;

                  isDragging = true;
                  
                  if (isRightClick) {
                    // Linking logic is handled by global mouse move in Canvas or by state update
                    return;
                  }

                  if (!nodeRef.current) return;
                  const rect = nodeRef.current.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;
                  
                  const dx = moveEvent.clientX - centerX;
                  const dy = moveEvent.clientY - centerY;
                  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                  
                  // Snapping
                  const snap = 15;
                  angle = Math.round(angle / snap) * snap;
                  
                  // If this port is part of a selection, move all selected ports
                  if (selectedPortIds && selectedPortIds.nodeId === id && selectedPortIds.portIds.includes(port.id)) {
                    selectedPortIds.portIds.forEach(pid => {
                      getStore().updatePort(id, pid, { angle });
                    });
                  } else {
                    getStore().updatePort(id, port.id, { angle });
                  }
                };

                const handleUp = (upEvent: PointerEvent) => {
                  if (dragAbortRef.current) {
                    dragAbortRef.current.abort();
                    dragAbortRef.current = null;
                  }
                  
                  if (isRightClick) {
                    eventCoordinator.releaseMode('route-connect');
                    // Check if dropped on another node
                    const element = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
                    const targetNodeElement = element?.closest('[data-node-id]');
                    const targetNodeId = targetNodeElement?.getAttribute('data-node-id');
                    
                    if (targetNodeId && targetNodeId !== id) {
                      const sourceNode = nodes[id];
                      const targetNode = nodes[targetNodeId];
                      
                      let type: 'child' | 'sister' | 'buss' = 'child';
                      // If they share a parent, it's a sister link
                      if (sourceNode.parentId && targetNode.parentId === sourceNode.parentId) {
                        type = 'sister';
                      }
                      if (targetNode.nodeType === 'buss') {
                        type = 'buss';
                      }
                      
                      getStore().linkNodesViaPort(id, targetNodeId, port.angle, type);
                    }
                    getStore().setLinkingSourcePortId(null);
                    return;
                  }

                  eventCoordinator.releaseMode('port-drag');

                  const dist = Math.hypot(upEvent.clientX - startX, upEvent.clientY - startY);
                  if (dist < 5) {
                    if (clickTimeoutRef.current) {
                      clearTimeout(clickTimeoutRef.current);
                    }
                    clickTimeoutRef.current = setTimeout(() => {
                      setEditingPortId(port.id);
                    }, 250);
                  } else if (isDragging) {
                    // Check for global relocation
                    const element = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
                    const targetNodeElement = element?.closest('[data-node-id]');
                    const targetNodeId = targetNodeElement?.getAttribute('data-node-id');
                    
                    if (targetNodeId && targetNodeId !== id) {
                      const portIdsToMove = (selectedPortIds && selectedPortIds.nodeId === id && selectedPortIds.portIds.includes(port.id))
                        ? selectedPortIds.portIds
                        : [port.id];
                      
                      // Calculate new angle relative to target node
                      let angleOffset = 0;
                      if (targetNodeElement) {
                        const targetRect = targetNodeElement.getBoundingClientRect();
                        const targetCenterX = targetRect.left + targetRect.width / 2;
                        const targetCenterY = targetRect.top + targetRect.height / 2;
                        const dx = upEvent.clientX - targetCenterX;
                        const dy = upEvent.clientY - targetCenterY;
                        let newAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
                        const snap = 15;
                        newAngle = Math.round(newAngle / snap) * snap;
                        
                        // Get the current angle of the port from the store
                        const currentPort = nodes[id].ports.find(p => p.id === port.id);
                        if (currentPort) {
                          angleOffset = newAngle - currentPort.angle;
                        }
                      }
                      
                      getStore().movePortsToNode(portIdsToMove, id, targetNodeId, angleOffset);
                    }
                  }
                };

                if (dragAbortRef.current) dragAbortRef.current.abort();
                const controller = new AbortController();
                dragAbortRef.current = controller;
                
                window.addEventListener('pointermove', handleMove, { signal: controller.signal });
                window.addEventListener('pointerup', handleUp, { signal: controller.signal });
              }}
            >
              <div 
                className={`w-4 h-4 rounded-full border-2 border-[#0d1117] shadow-lg transition-all duration-300 pointer-events-none ${
                  isHovered || isEditingPort || (selectedPortIds && selectedPortIds.nodeId === id && selectedPortIds.portIds.includes(port.id))
                    ? (port.type === 'sister' ? 'bg-purple-400 scale-125 ring-4 ring-purple-500/20' : 'bg-blue-400 scale-125 ring-4 ring-blue-500/20')
                    : (port.type === 'sister' ? 'bg-purple-600' : 'bg-blue-600')
                }`}
              />
              
              {/* Port Label (Hover) */}
              {isHovered && !isEditingPort && (
                <div 
                  className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-[#161b22]/95 backdrop-blur-xl border border-white/10 rounded-lg p-2 shadow-2xl min-w-[120px] flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingPortId(port.id);
                  }}
                >
                  <span className="text-xs text-neutral-400">{port.name}</span>
                </div>
              )}

              {/* Port Editor (Click) */}
              {isEditingPort && (
                <div 
                  className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-[#161b22]/95 backdrop-blur-xl border border-blue-500/50 rounded-lg p-2 shadow-2xl min-w-[120px] flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col gap-2">
                      <input
                        autoFocus
                        className="bg-transparent border-b border-blue-500 outline-none text-xs text-white px-1"
                        value={port.name}
                        onChange={(e) => getStore().updatePort(id, port.id, { name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingPortId(null)}
                      />
                      <div className="flex flex-wrap gap-1">
                        {['true', 'false', 'success', 'error', 'input', 'output'].map(name => (
                          <button
                            key={name}
                            onClick={() => {
                              getStore().updatePort(id, port.id, { name });
                              setEditingPortId(null);
                            }}
                            className="text-[10px] bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded text-neutral-400 hover:text-white transition-colors"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between mt-1">
                        <button onClick={() => getStore().deletePort(id, port.id)} className="text-[10px] text-red-400 hover:text-red-300">Delete</button>
                        <button onClick={() => setEditingPortId(null)} className="text-[10px] text-blue-400 hover:text-blue-300">Done</button>
                      </div>
                    </div>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Open Editor Button */}
        {isSelected && !isEditing && (
          <button
            onClick={handleOpenEditor}
            className="absolute -top-4 -left-4 w-10 h-10 bg-[#161b22] border border-white/[0.15] rounded-full flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.5)] hover:bg-[#21262d] hover:border-white/[0.25] z-20 transition-all hover:scale-110 hover:shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
            title="Open Full Editor"
          >
            <Maximize2 className="w-4 h-4 text-neutral-300 drop-shadow-md" />
          </button>
        )}

        {/* Collapse/Expand Button */}
        {node.childrenIds.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              getStore().updateNode(id, { isExpanded: !node.isExpanded });
            }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#161b22] border border-white/[0.15] rounded-full flex items-center justify-center shadow-lg hover:bg-[#21262d] hover:border-white/[0.25] z-20 transition-all"
            title={node.isExpanded ? "Collapse Children" : "Expand Children"}
          >
            <div className={`w-2 h-2 border-b-2 border-r-2 border-neutral-400 transform transition-transform ${node.isExpanded ? 'rotate-45 -translate-y-0.5' : '-rotate-45 translate-y-0.5'}`} />
          </button>
        )}
      </motion.div>

      {/* Connection Lines to Children and Sisters */}
      {(node.isExpanded && (node.childrenIds.length > 0 || (node.sisterIds && node.sisterIds.length > 0) || (node.ports || []).some(p => p.targetNodeId && nodes[p.targetNodeId]))) && (
        <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-0">
          <defs>
            <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
            </linearGradient>
            <linearGradient id="tunnel-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.8)" />
              <stop offset="50%" stopColor="rgba(139, 92, 246, 0.6)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
            </linearGradient>
            <filter id="tunnel-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <style>
            {`
              @keyframes flow {
                to {
                  stroke-dashoffset: -40;
                }
              }
              .animate-flow {
                animation: flow 1s linear infinite;
              }
            `}
          </style>
          {(node.ports || []).map((port) => {
            const targetId = port.targetNodeId;
            const target = nodes[targetId];
            if (!target) return null;

            const isSister = port.type === 'sister';
            const isBuss = port.type === 'buss';
            const isRoute = port.type === 'route';
            const isSameScale = isSister || isBuss;
            
            let startX, startY;
            const pos = getPointOnPerimeter(port.angle);
            startX = pos.x;
            startY = pos.y;

            const targetWidth = target.nodeType === 'buss' ? BUSS_NODE_SIZE : 280;
            const targetHeight = target.nodeType === 'buss' ? BUSS_NODE_SIZE : (target.height || 140);
            let endX, endY;
            let targetEdgeCenters: { x: number, y: number, normal: { x: number, y: number } }[] = [];
            
            const getAbsolutePosition = (nodeId: string) => {
              let current = nodes[nodeId];
              if (!current) return { x: 0, y: 0, scale: 1 };
              
              let path = [];
              let curr: any = current;
              const pathVis = new Set<string>();
              while (curr) {
                if (pathVis.has(curr.id)) {
                  console.warn('Circular reference in getAbsolutePosition', nodeId);
                  break;
                }
                pathVis.add(curr.id);
                path.unshift(curr);
                curr = curr.parentId ? nodes[curr.parentId] : null;
              }
              
              let absX = 0;
              let absY = 0;
              let scale = 1;
              
              for (let i = 0; i < path.length; i++) {
                absX += path[i].x * scale;
                absY += path[i].y * scale;
                if (i < path.length - 1) {
                  scale *= 0.5;
                }
              }
              return { x: absX, y: absY, scale };
            };

            const sourceAbs = getAbsolutePosition(id);
            const targetAbs = getAbsolutePosition(targetId);

            const TL_x = (targetAbs.x - sourceAbs.x) / sourceAbs.scale;
            const TL_y = (targetAbs.y - sourceAbs.y) / sourceAbs.scale;
            const scaleRatio = targetAbs.scale / sourceAbs.scale;
            const W_t = targetWidth * scaleRatio;
            const H_t = targetHeight * scaleRatio;

            targetEdgeCenters = [
              { x: TL_x + W_t / 2, y: TL_y, normal: { x: 0, y: -1 } }, // Top
              { x: TL_x + W_t, y: TL_y + H_t / 2, normal: { x: 1, y: 0 } }, // Right
              { x: TL_x + W_t / 2, y: TL_y + H_t, normal: { x: 0, y: 1 } }, // Bottom
              { x: TL_x, y: TL_y + H_t / 2, normal: { x: -1, y: 0 } }, // Left
            ];
            
            // Find nearest edge center
            let nearest = targetEdgeCenters[0];
            let minDist = Math.hypot(startX - targetEdgeCenters[0].x, startY - targetEdgeCenters[0].y);
            for (let i = 1; i < targetEdgeCenters.length; i++) {
              const d = Math.hypot(startX - targetEdgeCenters[i].x, startY - targetEdgeCenters[i].y);
              if (d < minDist) {
                minDist = d;
                nearest = targetEdgeCenters[i];
              }
            }
            
            endX = nearest.x;
            endY = nearest.y;
            const endNormal = nearest.normal;

            // Calculate orthogonal control points
            const startNormal = getNormalFromAngle(port.angle);

            const curvature = Math.min(100, Math.max(50, minDist / 3));
            const cp1x = startX + startNormal.x * curvature;
            const cp1y = startY + startNormal.y * curvature;
            const cp2x = endX + endNormal.x * curvature;
            const cp2y = endY + endNormal.y * curvature;
            
            const isTargetSelected = getStore().selectedNodeIds.includes(targetId);
            
            let baseColor = editorSettings.linkColors.child;
            if (isSister) baseColor = editorSettings.linkColors.sister;
            if (isBuss) baseColor = editorSettings.linkColors.buss;
            if ((port.type as string) === 'route') baseColor = editorSettings.linkColors.route;

            // Buss links are always solid, bold, and fully opaque (they're arm extensions, not connections)
            let strokeColor = isBuss 
              ? baseColor 
              : (isTargetSelected ? baseColor : `${baseColor}60`);
              
            // In cluster mode, dim lines connecting to out-of-cluster nodes
            const isTargetOutsideCluster = editorSettings.clusterViewMode && clusterMemberIds && !clusterMemberIds.has(targetId);
            if (isOutsideCluster || isTargetOutsideCluster) {
              strokeColor = `${baseColor}20`; // VERY dim
            }
            
            const midX = 0.125 * startX + 0.375 * cp1x + 0.375 * cp2x + 0.125 * endX;
            const midY = 0.125 * startY + 0.375 * cp1y + 0.375 * cp2y + 0.125 * endY;

            let pathD = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
            if (editorSettings.linkStyle === 'straight') {
              pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
            } else if (editorSettings.linkStyle === 'step') {
              pathD = `M ${startX} ${startY} L ${startX + (endX - startX)/2} ${startY} L ${startX + (endX - startX)/2} ${endY} L ${endX} ${endY}`;
            }

            // Buss links are solid and bolder; sisters dashed; children use animation setting
            let bussStrokeWidth = isBuss ? editorSettings.linkThickness + 2 : (isTargetSelected ? editorSettings.linkThickness + 1.5 : editorSettings.linkThickness);
            let bussDashArray = isBuss ? '0' : (editorSettings.linkAnimation === 'flow-dots' ? "8 4" : (isSister ? "8 4" : "0"));
            let isAnimated = !isBuss && editorSettings.linkAnimation === 'flow-dots';

            if (isRoute) {
              const dx = endX - startX;
              const dy = endY - startY;
              const distance = Math.hypot(dx, dy);
              const cp1X = startX + dx * 0.2 + distance * 0.2;
              const cp1Y = startY + dy * 0.2 - distance * 0.2;
              pathD = `M ${startX} ${startY} Q ${cp1X} ${cp1Y} ${endX} ${endY}`;
              bussStrokeWidth = editorSettings.linkThickness;
              bussDashArray = "12 12";
              isAnimated = true;
            }

            return (
              <g key={`line-group-${port.id}`}>
                {!port.isPortal && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={bussStrokeWidth}
                    strokeDasharray={bussDashArray}
                    filter={isRoute ? "url(#tunnel-glow)" : undefined}
                    className={`transition-all duration-300 ${isAnimated ? 'animate-flow' : ''} ${isTargetSelected ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''} ${isRoute ? 'opacity-70 group-hover:opacity-100 group-hover:stroke-[5px]' : ''}`}
                  />
                )}
                {editorSettings.linkArrowHeads && !port.isPortal && (
                  <circle cx={endX} cy={endY} r={editorSettings.linkThickness + 1} fill={baseColor} />
                )}
                {/* Invisible thicker path for easier hovering and clicking */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="30"
                  className="cursor-pointer pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const activeSelect = getStore().selectedNodeIds[0];
                    const destId = activeSelect === port.targetNodeId ? id : port.targetNodeId;
                    teleportToNode(destId);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Set context menu using page coordinates
                    setLineContextMenu({ 
                      portId: port.id, 
                      x: e.clientX, 
                      y: e.clientY,
                      midX: midX,
                      midY: midY
                    });
                  }}
                />
                
                {/* Conditionally overwrite visuals for Portals */}
                {port.isPortal && (() => {
                  const portalStartX = startX + startNormal.x * 20;
                  const portalStartY = startY + startNormal.y * 20;
                  // endNormal goes into the node, so we want it to point out
                  const portalEndX = endX + endNormal.x * 20;
                  const portalEndY = endY + endNormal.y * 20;
                  
                  const isPortHovered = hoveredPortId === port.id;
                  return (
                    <g 
                      className="portal-overlay z-10 pointer-events-auto"
                      onMouseEnter={() => setHoveredPortId(port.id)}
                      onMouseLeave={() => setHoveredPortId(null)}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        const activeSelect = getStore().selectedNodeIds[0];
                        const destId = activeSelect === port.targetNodeId ? id : port.targetNodeId;
                        teleportToNode(destId);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLineContextMenu({ 
                          portId: port.id, 
                          x: e.clientX, 
                          y: e.clientY,
                          midX: midX,
                          midY: midY
                        });
                      }}
                    >
                      {/* Source Extension Line */}
                      <path d={`M ${startX} ${startY} L ${portalStartX} ${portalStartY}`} stroke={baseColor} strokeWidth="2" strokeDasharray="4 2" className="opacity-50" />
                      {/* Source Dot */}
                      <circle cx={portalStartX} cy={portalStartY} r={isPortHovered ? "10" : "8"} fill="#0d1117" stroke={baseColor} strokeWidth="2" className={`transition-all duration-300 ${isPortHovered ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''}`} />
                      <circle cx={portalStartX} cy={portalStartY} r={isPortHovered ? "6" : "4"} fill={baseColor} className="transition-all duration-300" />
                      
                      {/* Target Extension Line */}
                      <path d={`M ${endX} ${endY} L ${portalEndX} ${portalEndY}`} stroke={baseColor} strokeWidth="2" strokeDasharray="4 2" className="opacity-50" />
                      {/* Target Dot */}
                      <circle cx={portalEndX} cy={portalEndY} r={isPortHovered ? "10" : "8"} fill="#0d1117" stroke={baseColor} strokeWidth="2" className={`transition-all duration-300 ${isPortHovered ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''}`} />
                      <circle cx={portalEndX} cy={portalEndY} r={isPortHovered ? "6" : "4"} fill={baseColor} className="transition-all duration-300" />
                      
                      {/* Hitboxes for nice hovering tooltips */}
                      <circle cx={portalStartX} cy={portalStartY} r="16" fill="transparent" className="group cursor-help" />
                      <circle cx={portalEndX} cy={portalEndY} r="16" fill="transparent" className="group cursor-help" />
                      
                      {/* Optional Portal Tooltips via foreignObject so they draw over properly */}
                      <foreignObject x={portalStartX - 100} y={portalStartY - 40} width="200" height="40" className="pointer-events-none overflow-visible">
                        <div className="tooltip-container opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2">
                          <div className="bg-[#1e293b]/95 backdrop-blur-md px-2 py-1 rounded shadow-lg border border-white/10 text-white text-[10px] whitespace-nowrap">
                            Goto: {port.name} <span className="text-blue-400 font-mono ml-1">{port.id.substring(0, 2).toUpperCase()}</span>
                          </div>
                        </div>
                      </foreignObject>
                      <foreignObject x={portalEndX - 100} y={portalEndY - 40} width="200" height="40" className="pointer-events-none overflow-visible">
                        <div className="tooltip-container opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2">
                          <div className="bg-[#1e293b]/95 backdrop-blur-md px-2 py-1 rounded shadow-lg border border-white/10 text-white text-[10px] whitespace-nowrap">
                            Goto: {port.name} <span className="text-blue-400 font-mono ml-1">{port.id.substring(0, 2).toUpperCase()}</span>
                          </div>
                        </div>
                      </foreignObject>
                    </g>
                  );
                })()}
                {/* Line Label */}
                {editingLineId === port.id ? (
                  <foreignObject x={midX - 75} y={midY - 15} width="150" height="30" className="overflow-visible pointer-events-auto">
                    <input
                      autoFocus
                      className="w-full h-full bg-[#161b22] border border-blue-500/50 rounded text-xs text-center text-white outline-none shadow-lg"
                      defaultValue={port.linkLabel || ''}
                      onBlur={(e) => {
                        getStore().updatePort(id, port.id, { linkLabel: e.target.value });
                        setEditingLineId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          getStore().updatePort(id, port.id, { linkLabel: e.currentTarget.value });
                          setEditingLineId(null);
                        }
                      }}
                    />
                  </foreignObject>
                ) : port.linkLabel ? (
                  <g 
                    className="cursor-pointer pointer-events-auto"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingLineId(port.id);
                    }}
                  >
                    <rect 
                      x={midX - (port.linkLabel.length * 4) - 8} 
                      y={midY - 12} 
                      width={(port.linkLabel.length * 8) + 16} 
                      height="24" 
                      rx="4" 
                      fill="#161b22" 
                      stroke={strokeColor}
                      strokeWidth="1"
                    />
                    <text
                      x={midX}
                      y={midY + 4}
                      fill="white"
                      fontSize="12"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {port.linkLabel}
                    </text>
                  </g>
                ) : null}
                {/* Input Port Dot */}
                <circle 
                  cx={endX} 
                  cy={endY} 
                  r="4" 
                  fill="#F97316" 
                  className="transition-all duration-300 pointer-events-none"
                />
              </g>
            );
          })}
        </svg>
      )}



      {/* Line Context Menu via React Portal */}
      {lineContextMenu && typeof document !== 'undefined' && createPortal(
        <>
          {/* Invisible backdrop to capture clicks outside */}
          <div 
            className="fixed inset-0 z-[999]" 
            onContextMenu={(e) => { e.preventDefault(); setLineContextMenu(null); }}
            onPointerDown={(e) => { e.stopPropagation(); setLineContextMenu(null); }}
          />
          <div 
            className="fixed z-[1000] bg-[#161b22]/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl p-3 w-48 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-100"
            style={{ left: lineContextMenu.x, top: lineContextMenu.y }}
            onPointerDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <div className="flex flex-col gap-1 pb-2 border-b border-white/10">
              <span className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase">Link Properties</span>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[11px] text-neutral-300">Link Label</label>
              <input
                autoFocus
                className="w-full bg-[#0d1117] border border-blue-500/30 focus:border-blue-500/80 rounded px-2 py-1 text-xs text-white outline-none"
                placeholder="Name this connection..."
                defaultValue={node.ports.find(p => p.id === lineContextMenu.portId)?.linkLabel || ''}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    getStore().updatePort(id, lineContextMenu.portId, { linkLabel: e.currentTarget.value });
                    setLineContextMenu(null);
                  }
                }}
                onBlur={(e) => {
                  getStore().updatePort(id, lineContextMenu.portId, { linkLabel: e.target.value });
                }}
              />
            </div>

            <button
              className={`w-full py-1.5 px-2 rounded flex items-center justify-between text-xs transition-colors ${
                node.ports.find(p => p.id === lineContextMenu.portId)?.isPortal 
                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
                  : 'bg-white/5 text-neutral-300 hover:bg-white/10'
              }`}
              onClick={() => {
                const isCurrentlyPortal = node.ports.find(p => p.id === lineContextMenu.portId)?.isPortal;
                getStore().updatePort(id, lineContextMenu.portId, { isPortal: !isCurrentlyPortal });
                setLineContextMenu(null);
              }}
            >
              <span>Wireless Portal</span>
              <div className={`w-6 h-3.5 rounded-full relative transition-colors ${node.ports.find(p => p.id === lineContextMenu.portId)?.isPortal ? 'bg-blue-500' : 'bg-neutral-600'}`}>
                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${node.ports.find(p => p.id === lineContextMenu.portId)?.isPortal ? 'left-[10px]' : 'left-0.5'}`} />
              </div>
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Children Container - Scaled down by 0.5 */}
      {node.isExpanded && node.childrenIds.length > 0 && (
        <div className="absolute top-0 left-0" style={{ transform: 'scale(0.5)', transformOrigin: '0 0' }}>
          {Array.from(new Set(node.childrenIds)).map((childId) => (
            <Node key={childId} id={childId} renderPath={[...renderPath, id]} />
          ))}
        </div>
      )}
    </div>
  );
}
