'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { Node } from './Node';
import { PlusCircle, ClipboardPaste, Crosshair, Link as LinkIcon } from 'lucide-react';

export function Canvas() {
  const { init, rootNodeId, nodes, camera, setCamera, clearSelection, linkingSourceId, linkingSourcePortId } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSensitivity = 0.002;
      const delta = -e.deltaY * zoomSensitivity;
      const newZoom = Math.min(Math.max(camera.zoom * Math.exp(delta), 0.0001), 1000);

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleChange = newZoom / camera.zoom;
      
      setCamera({
        x: mouseX - (mouseX - camera.x) * scaleChange,
        y: mouseY - (mouseY - camera.y) * scaleChange,
        zoom: newZoom,
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [camera, setCamera]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).id === 'canvas-bg') {
      if (e.button === 0) { // Only drag on left click
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
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
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
    e.preventDefault();
    if (e.target === containerRef.current || (e.target as HTMLElement).id === 'canvas-bg') {
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-hidden relative bg-[#050505] ${linkingSourceId ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
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
          backgroundColor: '#050505',
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(to right, rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: `
            ${100 * camera.zoom}px ${100 * camera.zoom}px,
            ${100 * camera.zoom}px ${100 * camera.zoom}px,
            ${20 * camera.zoom}px ${20 * camera.zoom}px,
            ${20 * camera.zoom}px ${20 * camera.zoom}px
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
        {Object.values(nodes).filter(node => node.parentId === null).map(node => (
          <Node key={node.id} id={node.id} />
        ))}
      </div>

      {linkingSourceId && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-blue-600/90 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-[0_4px_20px_rgba(59,130,246,0.5)] flex items-center gap-2 border border-blue-400/50 animate-in fade-in slide-in-from-top-4">
          <LinkIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Select a node to link to, or click canvas to cancel.</span>
        </div>
      )}

      {contextMenu && (
        <div 
          className="fixed z-50 bg-[#161b22]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] py-1.5 min-w-[160px] overflow-hidden"
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
            const sourceNode = nodes[linkingSourcePortId.nodeId];
            const sourcePort = sourceNode.ports.find(p => p.id === linkingSourcePortId.portId);
            if (!sourceNode || !sourcePort) return null;

            // Calculate source port position in screen space
            // This is tricky because Node.tsx calculates its own scale
            // Let's assume we can get it from the DOM
            const portEl = document.querySelector(`[data-node-id="${sourceNode.id}"] [data-port-id="${sourcePort.id}"]`);
            if (!portEl) return null;
            const rect = portEl.getBoundingClientRect();
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + rect.height / 2;

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
    </div>
  );
}
