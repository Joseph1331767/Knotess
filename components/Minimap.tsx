'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useStore } from '@/lib/store';

export function Minimap() {
  const { nodes, camera, setCamera, editorSettings, selectedNodeIds, selectNode } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [windowSize, setWindowSize] = useState({ w: 1000, h: 800 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  useEffect(() => {
    setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!editorSettings.minimapVisible) return null;

  // Calculate absolute positions of all nodes
  const nodeAbsPositions = useMemo(() => {
    const positions: Record<string, { id: string, x: number, y: number, w: number, h: number, color: string, type: string }> = {};
    Object.values(nodes).forEach(n => {
      let worldX = n.x;
      let worldY = n.y;
      const baseW = n.nodeType === 'buss' ? 48 : 280; // buss is 48 according to store BUSS_NODE_SIZE config
      const baseH = n.height || (n.nodeType === 'buss' ? 48 : 140);
      let worldW = baseW;
      let worldH = baseH;
      let scale = 1;
      let walkId = n.parentId;
      let current = n;
      const visited = new Set<string>();
      
      while (walkId && nodes[walkId]) {
        if (visited.has(walkId)) break;
        visited.add(walkId);
        const parent = nodes[walkId];
        scale *= 0.5;
        // Need to correctly accumulate worldX/worldY
        // children are scale(0.5) inside the parent, originating from top-left (0, 0)
        worldX = parent.x + worldX * 0.5;
        worldY = parent.y + worldY * 0.5;
        worldW = baseW * scale;
        worldH = baseH * scale;

        walkId = parent.parentId;
      }
      
      positions[n.id] = { 
        id: n.id,
        x: worldX, 
        y: worldY, 
        w: worldW, 
        h: worldH,
        color: n.groupColor || editorSettings.colorNodeBg,
        type: n.nodeType || 'default'
      };
    });
    return positions;
  }, [nodes, editorSettings.colorNodeBg]);

  const mapW = 240;
  const mapH = 160;

  // 1 zoom layer out = 2x viewport width footprint.
  // We guarantee the minimap tracks the camera precisely but spans 2x the coordinate breadth!
  const mapZoom = (mapW * camera.zoom) / (windowSize.w * 2);

  const screenCenterX = windowSize.w / 2;
  const screenCenterY = windowSize.h / 2;
  const worldCenterX = (screenCenterX - camera.x) / camera.zoom;
  const worldCenterY = (screenCenterY - camera.y) / camera.zoom;

  const minX = worldCenterX - (mapW / 2) / mapZoom;
  const minY = worldCenterY - (mapH / 2) / mapZoom;
  const graphWidth = mapW / mapZoom;
  const graphHeight = mapH / mapZoom;

  const viewportWidth = windowSize.w / camera.zoom;
  const viewportHeight = windowSize.h / camera.zoom;
  const viewportX = (0 - camera.x) / camera.zoom;
  const viewportY = (0 - camera.y) / camera.zoom;

  // Interaction handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    (e.target as Element).setPointerCapture(e.pointerId);
    
    // Jump to coordinate strictly on initial down
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mapX = (e.clientX - rect.left) / rect.width;
      const mapY = (e.clientY - rect.top) / rect.height;
      const targetWorldX = minX + mapX * graphWidth;
      const targetWorldY = minY + mapY * graphHeight;
      const screenCenterX = windowSize.w / 2;
      const screenCenterY = windowSize.h / 2;
      setCamera({
        x: screenCenterX - targetWorldX * camera.zoom,
        y: screenCenterY - targetWorldY * camera.zoom,
        zoom: camera.zoom
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!isDragging && e.type !== 'pointerdown') return;
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    
    // Pan based on proportional dragging inside the minimap
    const mapX = (e.clientX - rect.left) / rect.width;
    const mapY = (e.clientY - rect.top) / rect.height;

    const targetWorldX = minX + mapX * graphWidth;
    const targetWorldY = minY + mapY * graphHeight;

    const screenCenterX = windowSize.w / 2;
    const screenCenterY = windowSize.h / 2;
    
    setCamera({
      x: screenCenterX - targetWorldX * camera.zoom,
      y: screenCenterY - targetWorldY * camera.zoom,
      zoom: camera.zoom
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(false);
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <div 
      className="absolute bottom-6 left-6 z-30 bg-[#050505]/60 backdrop-blur-3xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.04] flex items-center justify-center p-3 animate-in fade-in zoom-in-95 duration-200"
    >
      <div 
        ref={containerRef}
        className="relative cursor-crosshair rounded-lg overflow-hidden border border-white/[0.05] bg-[#0a0d14]/80 shadow-inner"
        style={{ width: mapW, height: mapH }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Abstract structural grid for the HUD effect */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.1]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
            backgroundSize: `${Math.max(mapW / 10, 4)}px ${Math.max(mapH / 10, 4)}px`,
            backgroundPosition: `${-minX * mapZoom}px ${-minY * mapZoom}px`
          }}
        />

        {/* Draw abstract nodes */}
        {Object.values(nodeAbsPositions).map((n, i) => {
          const leftP = ((n.x - minX) / graphWidth) * 100;
          const topP = ((n.y - minY) / graphHeight) * 100;
          const widthP = (n.w / graphWidth) * 100;
          const heightP = (n.h / graphHeight) * 100;

          // Compute highlighting colors based on selectedNodeIds
          const targetNodeId = selectedNodeIds[0];
          let highlightColor = null;
          let isTarget = false;

          if (targetNodeId) {
            if (n.id === targetNodeId) {
              isTarget = true;
              highlightColor = '#ffffff'; // White for target
            } else {
              const targetNode = nodes[targetNodeId];
              const thisNode = nodes[n.id];
              if (targetNode && thisNode) {
                // Outgoing from target to this
                const portOut = targetNode.ports.find((p: any) => p.targetNodeId === n.id);
                if (portOut) highlightColor = (editorSettings.linkColors as any)[portOut.type || 'child'];
                
                // Outgoing from this to target
                const portIn = thisNode.ports.find((p: any) => p.targetNodeId === targetNodeId);
                if (portIn && !highlightColor) highlightColor = (editorSettings.linkColors as any)[portIn.type || 'child'];
                
                // Tunnel links
                if (!highlightColor && targetNode.tunnelLinks.includes(n.id)) highlightColor = editorSettings.linkColors.tunnel;
                if (!highlightColor && thisNode.tunnelLinks.includes(targetNodeId)) highlightColor = editorSettings.linkColors.tunnel;

                // Parent chain linkage
                if (!highlightColor) {
                  let walkIdStr = targetNode.parentId;
                  while (walkIdStr && nodes[walkIdStr]) {
                    if (walkIdStr === n.id) {
                      highlightColor = editorSettings.linkColors.child;
                      break;
                    }
                    walkIdStr = nodes[walkIdStr].parentId;
                  }
                }
              }
            }
          }

          const baseColor = n.color !== editorSettings.colorNodeBg ? n.color : '#8b5cf6';
          const finalColor = highlightColor || baseColor;
          const isHighlighted = !!highlightColor;
          // Dim non-highlighted nodes if there's a target
          const opacity = targetNodeId ? (isHighlighted ? 1 : 0.25) : 0.8;

          return (
            <div
              key={n.id}
              className={`absolute cursor-pointer transition-all duration-200 ${isHighlighted ? 'z-10' : 'z-0'}`}
              style={{
                left: `${leftP}%`,
                top: `${topP}%`,
                width: `${Math.max(widthP, 1)}%`,
                height: `${Math.max(heightP, 1)}%`,
                backgroundColor: finalColor,
                boxShadow: isHighlighted ? `0 0 12px ${finalColor}` : '0 0 4px rgba(255,255,255,0.1)',
                borderRadius: n.type === 'buss' ? '50%' : '2px',
                opacity,
              }}
              onPointerEnter={() => setHoveredNodeId(n.id)}
              onPointerLeave={() => setHoveredNodeId(null)}
              onPointerDown={(e) => {
                e.stopPropagation();
                selectNode(n.id);
                const screenCenterX = windowSize.w / 2;
                const screenCenterY = windowSize.h / 2;
                setCamera({
                  x: screenCenterX - (n.x + n.w/2) * camera.zoom,
                  y: screenCenterY - (n.y + n.h/2) * camera.zoom,
                  zoom: camera.zoom
                });
              }}
            />
          );
        })}

        {/* Draw viewport reticle */}
        <div 
          className="absolute border border-[#38bdf8] bg-[#38bdf8]/10 pointer-events-none transition-all duration-[50ms] shadow-[0_0_15px_rgba(56,189,248,0.25)] box-border"
          style={{
            left: `${((viewportX - minX) / graphWidth) * 100}%`,
            top: `${((viewportY - minY) / graphHeight) * 100}%`,
            width: `${(viewportWidth / graphWidth) * 100}%`,
            height: `${(viewportHeight / graphHeight) * 100}%`,
            borderRadius: '4px'
          }}
        >
          {/* Corner crosshairs for a sci-fi HUD feel */}
          <div className="absolute -top-[1px] -left-[1px] w-1.5 h-1.5 border-t-2 border-l-2 border-[#38bdf8]" />
          <div className="absolute -top-[1px] -right-[1px] w-1.5 h-1.5 border-t-2 border-r-2 border-[#38bdf8]" />
          <div className="absolute -bottom-[1px] -left-[1px] w-1.5 h-1.5 border-b-2 border-l-2 border-[#38bdf8]" />
          <div className="absolute -bottom-[1px] -right-[1px] w-1.5 h-1.5 border-b-2 border-r-2 border-[#38bdf8]" />
        </div>

        {/* Hover Tooltip */}
        {hoveredNodeId && nodes[hoveredNodeId] && (
          <div className="absolute z-50 pointer-events-none px-2 py-1 bg-[#1e293b]/90 backdrop-blur-md text-white text-[10px] rounded border border-white/[0.1] shadow-lg whitespace-nowrap -translate-y-full -translate-x-1/2 -mt-1"
               style={{
                 left: `${((nodeAbsPositions[hoveredNodeId].x + nodeAbsPositions[hoveredNodeId].w/2 - minX) / graphWidth) * 100}%`,
                 top: `${((nodeAbsPositions[hoveredNodeId].y - minY) / graphHeight) * 100}%`
               }}>
            {nodes[hoveredNodeId].title === '' ? 'Untitled' : nodes[hoveredNodeId].title}
          </div>
        )}
      </div>
    </div>
  );
}
