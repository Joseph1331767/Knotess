'use client';

import { useEffect, useRef, useState, createContext, useContext, useMemo } from 'react';
import { useStore, getClusterMemberIds } from '@/lib/store';
import { Node } from './Node';
import { PlusCircle, ClipboardPaste, Crosshair, Link as LinkIcon, Group, Ungroup, Palette, Target } from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { AnimatePresence, motion } from 'motion/react';
import { ZoomControls } from './ZoomControls';
import { Minimap } from './Minimap';
import { isEditableTextTarget } from '@/lib/domUtils';
import { eventCoordinator } from '@/lib/eventCoordinator';
import { applyAlignment } from './AlignmentToolbar';

type PortPositionMap = Map<string, { x: number; y: number }>;
export const PortPositionContext = createContext<React.MutableRefObject<PortPositionMap> | null>(null);
export const ClusterContext = createContext<Set<string> | null>(null);

const GROUP_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  mode: 'intersect' | 'contain';
}

function ProxyOverlay({ clusterMemberIds }: { clusterMemberIds: Set<string> | null }) {
  const { nodes, camera, setCamera, editorSettings } = useStore();
  
  if (!clusterMemberIds || clusterMemberIds.size === 0 || !editorSettings.clusterViewMode) return null;
  
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

  const proxies = Array.from(clusterMemberIds).map(id => {
    const node = nodes[id];
    if (!node) return null;
    
    // Check if it's the root/active one we are zooming deeply into, typically we skip the active node itself 
    // unless it is magically off-screen.
    
    const absPos = getAbsolutePosition(id);
    const dWidth = node.nodeType === 'buss' ? 48 : 280;
    const dHeight = node.nodeType === 'buss' ? 48 : (node.height || 140);
    const worldX = absPos.x + (dWidth / 2) * absPos.scale;
    const worldY = absPos.y + (dHeight / 2) * absPos.scale;
    
    const screenX = worldX * camera.zoom + camera.x;
    const screenY = worldY * camera.zoom + camera.y;
    
    const pad = 40;
    if (typeof window === 'undefined') return null;
    
    const isOffScreen = screenX < pad || screenY < pad || screenX > window.innerWidth - pad || screenY > window.innerHeight - pad;
    if (!isOffScreen) return null;
    
    // Clamp to screen bounds
    const clampX = Math.max(pad, Math.min(window.innerWidth - pad, screenX));
    const clampY = Math.max(pad, Math.min(window.innerHeight - pad, screenY));
    
    // Rotation vector to point towards the off-screen actual position
    const dx = screenX - clampX;
    const dy = screenY - clampY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return (
      <motion.button
        key={`proxy-${id}`}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        onClick={(e) => {
          e.stopPropagation();
          setCamera((prev) => {
            let curr = node;
            let depth = 0;
            while(curr && curr.parentId) { depth++; curr = nodes[curr.parentId]; }
            const targetZoom = Math.pow(2, depth) * editorSettings.referenceZoom;
            const screenCenterX = window.innerWidth / 2;
            const screenCenterY = window.innerHeight / 2;
            return {
              x: screenCenterX - worldX * targetZoom,
              y: screenCenterY - worldY * targetZoom,
              zoom: targetZoom,
            };
          });
        }}
        className="fixed z-[150] flex items-center justify-center p-2 rounded-full bg-amber-500/20 border border-amber-400 hover:bg-amber-400/40 hover:scale-110 transition-all cursor-pointer backdrop-blur-md shadow-[0_0_15px_rgba(245,158,11,0.5)] group"
        style={{ left: clampX, top: clampY, transform: `translate(-50%, -50%)`, width: 44, height: 44 }}
        title={`Click to teleport to: ${node.title}`}
      >
        <div style={{ transform: `rotate(${angle}deg)` }} className="text-amber-300 transition-transform">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m14 5 7 7-7 7"/></svg>
        </div>
        
        {/* Tooltip visible on hover inside the general clamp area, anchored inside the screen to avoid overflow */}
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 border border-white/10 text-white text-xs px-2 py-1 rounded shadow-xl whitespace-nowrap pointer-events-none"
             style={{ 
               [clampX < window.innerWidth / 2 ? 'left' : 'right']: 50,
               [clampY < window.innerHeight / 2 ? 'top' : 'bottom']: '50%',
               transform: `translateY(-50%)`
             }}>
          {node.title}
        </div>
      </motion.button>
    );
  });

  return <AnimatePresence>{proxies}</AnimatePresence>;
}

export function Canvas() {
  const { init, rootNodeId, nodes, camera, setCamera, clearSelection, selectedNodeIds, selectMultipleNodes, linkingSourceId, linkingSourcePortId, routeConnectSource, setRouteConnectSource, groupNodes, ungroupNodes, editorSettings } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [groupColorPicker, setGroupColorPicker] = useState(false);

  const cameraRef = useRef(camera);
  const portPositionsRef = useRef<PortPositionMap>(new Map());

  const clusterMemberIds = useMemo(() => {
    if (!editorSettings.clusterViewMode) return null;
    return getClusterMemberIds(nodes, selectedNodeIds[0] || null);
  }, [editorSettings.clusterViewMode, nodes, selectedNodeIds]);

  useKeyboardShortcuts();

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = cameraRef.current;
      const zoomSensitivity = 0.002;
      const delta = -e.deltaY * zoomSensitivity;
      const newZoom = Math.min(Math.max(cam.zoom * Math.exp(delta), 0.0001), 1000);

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleChange = newZoom / cam.zoom;

      setCamera({
        x: mouseX - (mouseX - cam.x) * scaleChange,
        y: mouseY - (mouseY - cam.y) * scaleChange,
        zoom: newZoom,
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [setCamera]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).id === 'canvas-bg') {
      if (routeConnectSource) {
        setRouteConnectSource(null);
        eventCoordinator.releaseMode('route-connect');
        return;
      }

      // Ctrl+drag = bounding box selection
      if (e.ctrlKey || e.metaKey) {
        if (!eventCoordinator.requestMode('box-select')) return;
        e.preventDefault();
        const mode = e.button === 2 ? 'contain' : 'intersect';
        setSelectionBox({
          startX: e.clientX,
          startY: e.clientY,
          endX: e.clientX,
          endY: e.clientY,
          mode,
        });
        setContextMenu(null);
        return;
      }

      if (e.button === 0) { // Only drag on left click
        if (!eventCoordinator.requestMode('drag')) return;
        setIsDragging(true);
        setLastPos({ x: e.clientX, y: e.clientY });
        clearSelection();
        setContextMenu(null);
      }
    } else {
      setContextMenu(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });

    if (selectionBox) {
      setSelectionBox(prev => prev ? { ...prev, endX: e.clientX, endY: e.clientY } : null);
      return;
    }

    if (isDragging) {
      const dx = e.clientX - lastPos.x;
      const dy = e.clientY - lastPos.y;
      setCamera({
        x: camera.x + dx,
        y: camera.y + dy,
        zoom: camera.zoom,
      });
      setLastPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (selectionBox) {
      eventCoordinator.releaseMode('box-select');
      // Calculate which nodes are inside the selection box
      const box = {
        left: Math.min(selectionBox.startX, selectionBox.endX),
        top: Math.min(selectionBox.startY, selectionBox.endY),
        right: Math.max(selectionBox.startX, selectionBox.endX),
        bottom: Math.max(selectionBox.startY, selectionBox.endY),
      };

      const matchedIds: string[] = [];
      // Find all node DOM elements and check their screen positions
      const nodeElements = document.querySelectorAll('[data-node-id]');
      nodeElements.forEach(el => {
        const nodeId = el.getAttribute('data-node-id');
        if (!nodeId || !nodes[nodeId]) return;

        const rect = el.getBoundingClientRect();

        if (selectionBox.mode === 'intersect') {
          // Touching: node rect overlaps with selection box
          if (rect.right >= box.left && rect.left <= box.right &&
            rect.bottom >= box.top && rect.top <= box.bottom) {
            matchedIds.push(nodeId);
          }
        } else {
          // Contained: node rect fully inside selection box
          if (rect.left >= box.left && rect.right <= box.right &&
            rect.top >= box.top && rect.bottom <= box.bottom) {
            matchedIds.push(nodeId);
          }
        }
      });

      if (matchedIds.length > 0) {
        selectMultipleNodes(matchedIds);
      }
      setSelectionBox(null);
      return;
    }

    if (isDragging) {
      eventCoordinator.releaseMode('drag');
      setIsDragging(false);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!eventCoordinator.isIdle()) return;
    if (e.target === containerRef.current || (e.target as HTMLElement).id === 'canvas-bg') {
      setCamera((prev) => {
        const targetZoom = Math.max(prev.zoom * 0.5, 0.0001);
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;

        const worldX = (screenCenterX - prev.x) / prev.zoom;
        const worldY = (screenCenterY - prev.y) / prev.zoom;

        return {
          x: screenCenterX - worldX * targetZoom,
          y: screenCenterY - worldY * targetZoom,
          zoom: targetZoom,
        };
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isEditableTextTarget(e.target as EventTarget)) return;
    e.preventDefault();
    if (e.target === containerRef.current || (e.target as HTMLElement).id === 'canvas-bg') {
      setContextMenu({ x: e.clientX, y: e.clientY });
      setGroupColorPicker(false);
    }
  };

  // Check if selected nodes share a group
  const selectedGroupId = selectedNodeIds.length > 0
    ? nodes[selectedNodeIds[0]]?.groupId
    : null;
  const allSelectedInSameGroup = selectedGroupId && selectedNodeIds.every(
    id => nodes[id]?.groupId === selectedGroupId
  );

  // Get selection box rect for rendering
  const selBoxRect = selectionBox ? {
    left: Math.min(selectionBox.startX, selectionBox.endX),
    top: Math.min(selectionBox.startY, selectionBox.endY),
    width: Math.abs(selectionBox.endX - selectionBox.startX),
    height: Math.abs(selectionBox.endY - selectionBox.startY),
  } : null;

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-hidden relative bg-[#050505] ${selectionBox ? 'cursor-crosshair' : linkingSourceId ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onClick={() => setContextMenu(null)}
    >
      <div
        id="canvas-bg"
        className="absolute inset-0"
        style={{
          backgroundColor: editorSettings.backgroundColor,
          backgroundImage: !editorSettings.gridVisible || editorSettings.backgroundPattern === 'none' ? 'none' : editorSettings.backgroundPattern === 'dots' ? `
            radial-gradient(rgba(255,255,255,${editorSettings.gridOpacity}) 1px, transparent 1px)
          ` : `
            linear-gradient(to right, rgba(255,255,255,${editorSettings.gridOpacity}) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,${editorSettings.gridOpacity}) 1px, transparent 1px),
            linear-gradient(to right, rgba(255,255,255,${editorSettings.gridOpacity * 0.4}) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,${editorSettings.gridOpacity * 0.4}) 1px, transparent 1px)
          `,
          backgroundSize: !editorSettings.gridVisible || editorSettings.backgroundPattern === 'none' ? 'auto' : editorSettings.backgroundPattern === 'dots' ? `
            ${editorSettings.gridSize * camera.zoom}px ${editorSettings.gridSize * camera.zoom}px
          ` : `
            ${editorSettings.gridSize * 5 * camera.zoom}px ${editorSettings.gridSize * 5 * camera.zoom}px,
            ${editorSettings.gridSize * 5 * camera.zoom}px ${editorSettings.gridSize * 5 * camera.zoom}px,
            ${editorSettings.gridSize * camera.zoom}px ${editorSettings.gridSize * camera.zoom}px,
            ${editorSettings.gridSize * camera.zoom}px ${editorSettings.gridSize * camera.zoom}px
          `,
          backgroundPosition: `
            ${camera.x}px ${camera.y}px,
            ${camera.x}px ${camera.y}px,
            ${camera.x}px ${camera.y}px,
            ${camera.x}px ${camera.y}px
          `,
        }}
      />

      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
        }}
      >
        <PortPositionContext.Provider value={portPositionsRef}>
          <ClusterContext.Provider value={clusterMemberIds}>
            {Object.values(nodes).filter(node => node.parentId === null).map(node => (
              <Node key={node.id} id={node.id} renderPath={[]} />
            ))}
          </ClusterContext.Provider>
        </PortPositionContext.Provider>
      </div>

      {/* Selection Box Overlay */}
      {selBoxRect && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: selBoxRect.left,
            top: selBoxRect.top,
            width: selBoxRect.width,
            height: selBoxRect.height,
            border: selectionBox?.mode === 'contain'
              ? '2px solid rgba(34, 197, 94, 0.7)'
              : '2px dashed rgba(59, 130, 246, 0.7)',
            backgroundColor: selectionBox?.mode === 'contain'
              ? 'rgba(34, 197, 94, 0.08)'
              : 'rgba(59, 130, 246, 0.08)',
            borderRadius: '4px',
          }}
        />
      )}

      {/* Group Bounding Box + Scale Handles */}
      {selectedNodeIds.length >= 2 && !selectionBox && (() => {
        const selNodes = selectedNodeIds.map(id => nodes[id]).filter(Boolean);
        if (selNodes.length < 2) return null;
        const nodeW = 280;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of selNodes) {
          const w = n.nodeType === 'buss' ? 130 : nodeW;
          const h = n.height || (n.nodeType === 'buss' ? 130 : 140);
          // Find the screen position by walking up the parent chain
          let worldX = n.x, worldY = n.y, worldW = w, worldH = h;
          let scale = 1;
          let current = n;
          while (current.parentId && nodes[current.parentId]) {
            const parent = nodes[current.parentId];
            scale *= 0.5;
            worldX = parent.x + current.x * scale + (parent.nodeType === 'buss' ? 65 : 140);
            worldY = parent.y + current.y * scale + (parent.height || 140) * 0.5;
            worldW = w * scale;
            worldH = h * scale;
            current = parent;
          }
          // Only root-level nodes are easy to compute
          // For simplicity, use the flat x/y which works for root-level nodes
          const screenX = n.x * camera.zoom + camera.x;
          const screenY = n.y * camera.zoom + camera.y;
          const screenW = (n.nodeType === 'buss' ? 130 : nodeW) * camera.zoom;
          const screenH = (n.height || (n.nodeType === 'buss' ? 130 : 140)) * camera.zoom;

          if (n.parentId) continue; // TODO: handle nested nodes accurately

          minX = Math.min(minX, screenX);
          minY = Math.min(minY, screenY);
          maxX = Math.max(maxX, screenX + screenW);
          maxY = Math.max(maxY, screenY + screenH);
        }
        if (!isFinite(minX)) return null;
        const pad = 8;
        const boxLeft = minX - pad;
        const boxTop = minY - pad;
        const boxWidth = maxX - minX + pad * 2;
        const boxHeight = maxY - minY + pad * 2;

        const handleSize = 8;
        const corners = [
          { x: boxLeft, y: boxTop, cursor: 'nwse-resize' },
          { x: boxLeft + boxWidth, y: boxTop, cursor: 'nesw-resize' },
          { x: boxLeft, y: boxTop + boxHeight, cursor: 'nesw-resize' },
          { x: boxLeft + boxWidth, y: boxTop + boxHeight, cursor: 'nwse-resize' },
        ];

        const handleScaleDrag = (e: React.PointerEvent, cornerIdx: number) => {
          e.stopPropagation();
          e.preventDefault();
          if (!eventCoordinator.requestMode('group-scale')) return;

          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const startDist = Math.hypot(corners[cornerIdx].x - cx, corners[cornerIdx].y - cy);
          const origPositions = selectedNodeIds.reduce((acc, nid) => {
            const nd = nodes[nid];
            if (nd) acc[nid] = { x: nd.x, y: nd.y };
            return acc;
          }, {} as Record<string, { x: number; y: number }>);

          const centroidWorldX = Object.values(origPositions).reduce((s, p) => s + p.x, 0) / Object.values(origPositions).length;
          const centroidWorldY = Object.values(origPositions).reduce((s, p) => s + p.y, 0) / Object.values(origPositions).length;

          const onMove = (me: PointerEvent) => {
            const newDist = Math.hypot(me.clientX - cx, me.clientY - cy);
            const factor = Math.max(0.1, newDist / startDist);
            for (const [nid, orig] of Object.entries(origPositions)) {
              const nx = centroidWorldX + (orig.x - centroidWorldX) * factor;
              const ny = centroidWorldY + (orig.y - centroidWorldY) * factor;
              useStore.getState().updateNode(nid, { x: nx, y: ny });
            }
          };
          const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            eventCoordinator.releaseMode('group-scale');
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
        };

        return (
          <>
            <div
              className="fixed pointer-events-none z-40"
              style={{
                left: boxLeft, top: boxTop, width: boxWidth, height: boxHeight,
                border: '1.5px dashed rgba(99, 102, 241, 0.5)',
                borderRadius: '6px',
              }}
            />
            {corners.map((c, i) => (
              <div
                key={i}
                className="fixed z-50 bg-indigo-500 border-2 border-white/60 rounded-full hover:scale-125 transition-transform"
                style={{
                  left: c.x - handleSize / 2, top: c.y - handleSize / 2,
                  width: handleSize, height: handleSize,
                  cursor: c.cursor,
                }}
                onPointerDown={(e) => handleScaleDrag(e, i)}
              />
            ))}
          </>
        );
      })()}

      {linkingSourceId && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-blue-600/90 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-[0_4px_20px_rgba(59,130,246,0.5)] flex items-center gap-2 border border-blue-400/50 animate-in fade-in slide-in-from-top-4">
          <LinkIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Select a node to link to, or click canvas to cancel.</span>
        </div>
      )}

      {routeConnectSource && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-cyan-600/90 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-[0_4px_20px_rgba(6,182,212,0.5)] flex items-center gap-2 border border-cyan-400/50 animate-in fade-in slide-in-from-top-4">
          <LinkIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Select target node to route connection, or click canvas to cancel.</span>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-50 bg-[#161b22]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] py-1.5 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-blue-500/20 hover:text-blue-400 flex items-center gap-2 transition-colors"
            onClick={() => {
              const worldX = (contextMenu.x - camera.x) / camera.zoom;
              const worldY = (contextMenu.y - camera.y) / camera.zoom;
              const parentId = useStore.getState().selectedNodeIds[0] || useStore.getState().rootNodeId;
              useStore.getState().addNode(parentId, worldX, worldY);
              setContextMenu(null);
            }}
          >
            <PlusCircle className="w-4 h-4" /> Add Node Here
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-white/[0.08] hover:text-white flex items-center gap-2 transition-colors"
            onClick={() => {
              const worldX = (contextMenu.x - camera.x) / camera.zoom;
              const worldY = (contextMenu.y - camera.y) / camera.zoom;
              useStore.getState().paste(useStore.getState().selectedNodeIds[0] || useStore.getState().rootNodeId, worldX, worldY);
              setContextMenu(null);
            }}
          >
            <ClipboardPaste className="w-4 h-4" /> Paste Here
          </button>

          {/* Group / Ungroup */}
          {selectedNodeIds.length >= 2 && (
            <>
              <div className="h-px bg-white/[0.05] my-1.5 mx-2" />
              {groupColorPicker ? (
                <div className="px-3 py-2">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Pick Group Color</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {GROUP_COLORS.map(color => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded-lg border-2 border-white/10 hover:border-white/40 transition-colors hover:scale-110"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          groupNodes(selectedNodeIds, color);
                          setGroupColorPicker(false);
                          setContextMenu(null);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-purple-500/20 hover:text-purple-400 flex items-center gap-2 transition-colors"
                  onClick={() => setGroupColorPicker(true)}
                >
                  <Group className="w-4 h-4" /> Make Group
                </button>
              )}
            </>
          )}
          {allSelectedInSameGroup && selectedGroupId && (
            <>
              <button
                className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-red-500/20 hover:text-red-400 flex items-center gap-2 transition-colors"
                onClick={() => {
                  ungroupNodes(selectedGroupId);
                  setContextMenu(null);
                }}
              >
                <Ungroup className="w-4 h-4" /> Ungroup
              </button>
            </>
          )}

          {/* Alignment options when 2+ nodes selected */}
          {selectedNodeIds.length >= 2 && (
            <>
              <div className="h-px bg-white/[0.05] my-1.5 mx-2" />
              <p className="px-4 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Align</p>
              <div className="grid grid-cols-4 gap-0 px-1">
                {[
                  { op: 'left', label: 'L' },
                  { op: 'centerH', label: 'CH' },
                  { op: 'right', label: 'R' },
                  { op: 'distributeH', label: 'DH' },
                  { op: 'top', label: 'T' },
                  { op: 'centerV', label: 'CV' },
                  { op: 'bottom', label: 'B' },
                  { op: 'distributeV', label: 'DV' },
                ].map(({ op, label }) => (
                  <button
                    key={op}
                    className="px-2 py-1.5 text-[11px] text-neutral-400 hover:bg-white/[0.08] hover:text-white rounded transition-colors text-center"
                    onClick={() => {
                      applyAlignment(op, selectedNodeIds[0], selectedNodeIds.slice(1));
                      setContextMenu(null);
                    }}
                    title={op}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="h-px bg-white/[0.05] my-1.5 mx-2" />
          <button
            className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-white/[0.08] hover:text-white flex items-center gap-2 transition-colors"
            onClick={() => {
              setCamera({ x: window.innerWidth / 2, y: window.innerHeight / 2, zoom: 1 });
              setContextMenu(null);
            }}
          >
            <Crosshair className="w-4 h-4" /> Center View
          </button>
        </div>
      )}
      {/* Linking Line */}
      {linkingSourcePortId && (
        <svg className="fixed inset-0 pointer-events-none z-[100]">
          {(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _ = portPositionsRef.current; // access for tracking
            const currentPositions = portPositionsRef.current;
            const sourceNode = nodes[linkingSourcePortId.nodeId];
            if (!sourceNode) return null;
            const sourcePort = sourceNode.ports.find(p => p.id === linkingSourcePortId.portId);
            if (!sourcePort) return null;

            const portKey = `${linkingSourcePortId.nodeId}:${linkingSourcePortId.portId}`;
            const portPos = currentPositions.get(portKey);
            if (!portPos) return null;
            const startX = portPos.x;
            const startY = portPos.y;

            return (
              <line
                x1={startX}
                y1={startY}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            );
          })()}
        </svg>
      )}

      {routeConnectSource && (
        <svg className="fixed inset-0 pointer-events-none z-[100]">
          {(() => {
            if (typeof document === 'undefined') return null;
            const sourceNode = nodes[routeConnectSource.nodeId];
            if (!sourceNode) return null;

            // To get the absolute pixel location on canvas, 
            // since we do a direct clientX/Y visual line from node to mouse.
            // Wait, we need to locate the node center in view coordinates!
            const nodeEl = document.querySelector(`[data-node-id="${sourceNode.id}"]`) as HTMLElement;
            if (!nodeEl) return null;
            const rect = nodeEl.getBoundingClientRect();
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + Math.max(rect.height, 1) / 2;

            return (
              <line
                x1={startX}
                y1={startY}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#06b6d4"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            );
          })()}
        </svg>
      )}
      
      <ProxyOverlay clusterMemberIds={clusterMemberIds} />

      <Minimap />
      <ZoomControls />
    </div>
  );
}
