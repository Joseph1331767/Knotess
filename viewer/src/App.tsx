import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ViewerCanvas } from './ViewerCanvas';
import { ViewerNodeEditor } from './ViewerNodeEditor';
import { Download } from 'lucide-react';

export function App({ data }: { data: any }) {
  const { nodes = {}, editorSettings = {}, assets = [] } = data || {};
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Center camera on graph bounding box on mount ──
  useEffect(() => {
    const nodeValues = Object.values(nodes) as any[];
    if (nodeValues.length > 0) {
      // Only consider root-level nodes for initial centering
      const roots = nodeValues.filter(n => n.parentId === null);
      if (roots.length === 0) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      roots.forEach(n => {
        const w = n.nodeType === 'buss' ? 130 : 280;
        const h = n.nodeType === 'buss' ? 130 : (n.height || 140);
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + w);
        maxY = Math.max(maxY, n.y + h);
      });
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      setCamera({
        x: window.innerWidth / 2 - centerX,
        y: window.innerHeight / 2 - centerY,
        zoom: 1
      });
    }
  }, [nodes]);

  // ── Non-passive wheel listener for zoom (must be added manually) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const zoomFactor = -e.deltaY * 0.002;
      setCamera(c => {
        let newZoom = c.zoom * Math.exp(zoomFactor);
        newZoom = Math.max(0.0001, Math.min(1000, newZoom));

        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newX = mouseX - (mouseX - c.x) * (newZoom / c.zoom);
        const newY = mouseY - (mouseY - c.y) * (newZoom / c.zoom);

        return { x: newX, y: newY, zoom: newZoom };
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // ── Pan via pointer drag ──
  const pointerStartPos = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Don't start pan if clicking a node button (collapse/expand)
    if (e.target instanceof Element && e.target.closest('button')) return;
    setIsDragging(true);
    didDrag.current = false;
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    // Track whether we've dragged far enough to count as a pan
    const totalDist = Math.hypot(e.clientX - pointerStartPos.current.x, e.clientY - pointerStartPos.current.y);
    if (totalDist > 5) didDrag.current = true;

    setCamera(c => ({ ...c, x: c.x + dx, y: c.y + dy }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    // Only handle double click on empty space (not nodes)
    const elementAtCursor = document.elementFromPoint(e.clientX, e.clientY);
    const clickedNode = elementAtCursor?.closest('[id^="node-"]');
    
    if (!clickedNode) {
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
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className="w-screen h-screen overflow-hidden bg-neutral-950 text-neutral-100 relative"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        style={{ touchAction: 'none', cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {/* Export JPEG button */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => alert('Export to JPEG coming soon!')}
            className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-white rounded-lg border border-white/[0.1] backdrop-blur-md transition-colors shadow-lg cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export JPEG</span>
          </button>
        </div>

        {/* Zoom indicator */}
        <div className="absolute bottom-4 right-4 z-50 text-xs text-neutral-500 bg-black/30 backdrop-blur-md border border-white/[0.05] px-3 py-1.5 rounded-lg">
          {Math.round(camera.zoom * 100)}%
        </div>

        {/* Transformed canvas layer */}
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`
          }}
        >
          <ViewerCanvas nodes={nodes} editorSettings={editorSettings} setActiveNodeId={setActiveNodeId} camera={camera} setCamera={setCamera} />
        </div>
      </div>
      {activeNodeId && (
        <ViewerNodeEditor nodes={nodes} activeNodeId={activeNodeId} setActiveNodeId={setActiveNodeId} assets={assets} />
      )}
    </>
  );
}
