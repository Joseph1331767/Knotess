import { useState, useRef, useEffect } from 'react';

const BUSS_NODE_SIZE = 48;

/**
 * ViewerNode — read-only clone of the editor's Node component.
 * Renders recursively with the exact same DOM nesting, scaling,
 * and SVG connection-line logic as the editor.
 */

interface ViewerNodeProps {
  id: string;
  nodes: Record<string, any>;
  editorSettings: any;
  renderPath?: string[];
  setActiveNodeId: (id: string | null) => void;
  camera: any;
  setCamera: any;
}

export function ViewerNode({ id, nodes, editorSettings, renderPath = [], setActiveNodeId, camera, setCamera }: ViewerNodeProps) {
  const node = nodes[id];
  const [isExpanded, setIsExpanded] = useState<boolean>(node?.isExpanded !== false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [nodeHeight, setNodeHeight] = useState(node?.height || 140);

  useEffect(() => {
    if (!nodeRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = Math.max(Math.round(entry.contentRect.height), 60);
        setNodeHeight(h);
      }
    });
    obs.observe(nodeRef.current);
    return () => obs.disconnect();
  }, []);

  if (!node) return null;
  if (renderPath.includes(id)) return null; // circular guard

  const nodeWidth = node.nodeType === 'buss' ? BUSS_NODE_SIZE : 280;
  const isBussNode = node.nodeType === 'buss';

  // ── Perimeter point (identical to editor) ──
  const getPointOnPerimeter = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    if (isBussNode) {
      const radius = nodeWidth / 2;
      return { x: radius + cos * radius, y: radius + sin * radius };
    }

    const halfW = nodeWidth / 2;
    const halfH = Math.max(nodeHeight, 1) / 2;
    const scale = Math.min(
      cos !== 0 ? Math.abs(halfW / cos) : Infinity,
      sin !== 0 ? Math.abs(halfH / sin) : Infinity
    );
    return { x: cos * scale + halfW, y: sin * scale + halfH };
  };

  // ── Normal from angle (identical to editor) ──
  const getNormalFromAngle = (angle: number) => {
    if (isBussNode) {
      const rad = (angle * Math.PI) / 180;
      return { x: Math.cos(rad), y: Math.sin(rad) };
    }
    const normAngle = ((angle % 360) + 360) % 360;
    if (normAngle >= 315 || normAngle < 45) return { x: 1, y: 0 };
    if (normAngle >= 45 && normAngle < 135) return { x: 0, y: 1 };
    if (normAngle >= 135 && normAngle < 225) return { x: -1, y: 0 };
    return { x: 0, y: -1 };
  };

  // ── Absolute position (identical to editor) ──
  const getAbsolutePosition = (nodeId: string) => {
    const current = nodes[nodeId];
    if (!current) return { x: 0, y: 0, scale: 1 };
    const path: any[] = [];
    let curr: any = current;
    const vis = new Set<string>();
    while (curr) {
      if (vis.has(curr.id)) break;
      vis.add(curr.id);
      path.unshift(curr);
      curr = curr.parentId ? nodes[curr.parentId] : null;
    }
    let absX = 0, absY = 0, scale = 1;
    for (let i = 0; i < path.length; i++) {
      absX += path[i].x * scale;
      absY += path[i].y * scale;
      if (i < path.length - 1) scale *= 0.5;
    }
    return { x: absX, y: absY, scale };
  };

  // ── Connection lines SVG (port-based, identical to editor lines 960-1161) ──
  const renderPortLines = () => {
    const ports = node.ports || [];
    if (!isExpanded) return null;
    if (ports.length === 0 && (!node.childrenIds || node.childrenIds.length === 0)) return null;

    // Only render ports that have a target
    const validPorts = ports.filter((p: any) => p.targetNodeId && nodes[p.targetNodeId] && p.type !== 'route');
    if (validPorts.length === 0) return null;

    return (
      <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none" style={{ zIndex: 0 }}>
        <defs>
          <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
        </defs>
        {validPorts.map((port: any) => {
          const targetId = port.targetNodeId;
          const target = nodes[targetId];
          if (!target) return null;

          const isSister = port.type === 'sister';
          const isBuss = port.type === 'buss';

          const pos = getPointOnPerimeter(port.angle);
          const startX = pos.x;
          const startY = pos.y;

          const targetWidth = target.nodeType === 'buss' ? 130 : 280;
          const targetHeight = target.nodeType === 'buss' ? 130 : (target.height || 140);

          const sourceAbs = getAbsolutePosition(id);
          const targetAbs = getAbsolutePosition(targetId);

          const TL_x = (targetAbs.x - sourceAbs.x) / sourceAbs.scale;
          const TL_y = (targetAbs.y - sourceAbs.y) / sourceAbs.scale;
          const scaleRatio = targetAbs.scale / sourceAbs.scale;
          const W_t = targetWidth * scaleRatio;
          const H_t = targetHeight * scaleRatio;

          const targetEdgeCenters = [
            { x: TL_x + W_t / 2, y: TL_y, normal: { x: 0, y: -1 } },
            { x: TL_x + W_t, y: TL_y + H_t / 2, normal: { x: 1, y: 0 } },
            { x: TL_x + W_t / 2, y: TL_y + H_t, normal: { x: 0, y: 1 } },
            { x: TL_x, y: TL_y + H_t / 2, normal: { x: -1, y: 0 } },
          ];

          let nearest = targetEdgeCenters[0];
          let minDist = Math.hypot(startX - nearest.x, startY - nearest.y);
          for (let i = 1; i < targetEdgeCenters.length; i++) {
            const d = Math.hypot(startX - targetEdgeCenters[i].x, startY - targetEdgeCenters[i].y);
            if (d < minDist) { minDist = d; nearest = targetEdgeCenters[i]; }
          }

          const endX = nearest.x;
          const endY = nearest.y;
          const endNormal = nearest.normal;
          const startNormal = getNormalFromAngle(port.angle);

          const curvature = Math.min(100, Math.max(50, minDist / 3));
          const cp1x = startX + startNormal.x * curvature;
          const cp1y = startY + startNormal.y * curvature;
          const cp2x = endX + endNormal.x * curvature;
          const cp2y = endY + endNormal.y * curvature;

          let baseColor = editorSettings?.linkColors?.child || '#3b82f6';
          if (isSister) baseColor = editorSettings?.linkColors?.sister || '#8b5cf6';
          if (isBuss) baseColor = editorSettings?.linkColors?.buss || '#f59e0b';

          const strokeColor = `${baseColor}60`;

          const midX = 0.125 * startX + 0.375 * cp1x + 0.375 * cp2x + 0.125 * endX;
          const midY = 0.125 * startY + 0.375 * cp1y + 0.375 * cp2y + 0.125 * endY;

          let pathD = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
          if (editorSettings?.linkStyle === 'straight') {
            pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
          } else if (editorSettings?.linkStyle === 'step') {
            pathD = `M ${startX} ${startY} L ${startX + (endX - startX)/2} ${startY} L ${startX + (endX - startX)/2} ${endY} L ${endX} ${endY}`;
          }

          return (
            <g key={`line-group-${port.id}`}>
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={editorSettings?.linkThickness || 2}
                strokeDasharray={editorSettings?.linkAnimation === 'flow-dots' ? "8 4" : (isSister ? "8 4" : "0")}
                className={`transition-all duration-300 ${editorSettings?.linkAnimation === 'flow-dots' ? 'animate-flow' : ''}`}
              />
              {editorSettings?.linkArrowHeads && (
                <circle cx={endX} cy={endY} r={(editorSettings?.linkThickness || 2) + 1} fill={baseColor} />
              )}
              {/* Link Label */}
              {port.linkLabel && (
                <g>
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
                  <text x={midX} y={midY + 4} fill="white" fontSize="12" textAnchor="middle">
                    {port.linkLabel}
                  </text>
                </g>
              )}
              {/* Input Port Dot (orange) */}
              <circle cx={endX} cy={endY} r="4" fill="#F97316" className="transition-all duration-300" />
            </g>
          );
        })}
      </svg>
    );
  };

  // ── Tunnel links SVG (identical to editor lines 1165-1311) ──
  const renderTunnelLinks = () => {
    const tunnelLinks = node.tunnelLinks || [];
    if (tunnelLinks.length === 0) return null;

    return (
      <>
        <style>{`
          @keyframes flow {
            to { stroke-dashoffset: -40; }
          }
          .animate-flow {
            animation: flow 1s linear infinite;
          }
        `}</style>
        <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none" style={{ zIndex: 0 }}>
          <defs>
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
          {Array.from(new Set(tunnelLinks as string[])).map((targetId: string) => {
            const target = nodes[targetId];
            if (!target) return null;

            const sourceAbs = getAbsolutePosition(id);
            const targetAbs = getAbsolutePosition(targetId);

            const targetWidth = target.nodeType === 'buss' ? BUSS_NODE_SIZE : 280;
            const targetHeight = target.nodeType === 'buss' ? BUSS_NODE_SIZE : (target.height || 140);

            const targetCenterAbsX = targetAbs.x + (targetWidth / 2) * targetAbs.scale;
            const targetCenterAbsY = targetAbs.y + (targetHeight / 2) * targetAbs.scale;

            const endX = (targetCenterAbsX - sourceAbs.x) / sourceAbs.scale;
            const endY = (targetCenterAbsY - sourceAbs.y) / sourceAbs.scale;

            const startX = nodeWidth / 2;
            const startY = nodeHeight / 2;

            const dx = endX - startX;
            const dy = endY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const cp1X = startX + dx * 0.2 + distance * 0.2;
            const cp1Y = startY + dy * 0.2 - distance * 0.2;

            return (
              <g key={`tunnel-${targetId}`} className="group">
                <path
                  d={`M ${startX} ${startY} Q ${cp1X} ${cp1Y} ${endX} ${endY}`}
                  fill="none"
                  stroke={editorSettings?.linkColors?.tunnel || '#8b5cf6'}
                  strokeWidth={editorSettings?.linkThickness || 2}
                  strokeDasharray="12 12"
                  filter="url(#tunnel-glow)"
                  className="transition-all duration-300 animate-flow opacity-70"
                />
                <text
                  x={startX + dx * 0.5}
                  y={startY + dy * 0.5 - 20}
                  fill="white"
                  className="opacity-0 group-hover:opacity-100 text-sm font-bold pointer-events-none transition-opacity duration-300"
                  textAnchor="middle"
                >
                  Tunnel to: {target.title}
                </text>
              </g>
            );
          })}
        </svg>
      </>
    );
  };

  // ── Port dots (visual only, no interaction) ──
  const renderPorts = () => {
    const ports = node.ports || [];
    if (ports.length === 0) return null;
    return ports.map((port: any) => {
      const pos = getPointOnPerimeter(port.angle);
      return (
        <div
          key={port.id}
          className="absolute z-30 pointer-events-none"
          style={{
            left: pos.x,
            top: pos.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className={`w-4 h-4 rounded-full border-2 border-[#0d1117] shadow-lg ${
            port.type === 'sister' ? 'bg-purple-600' : 'bg-blue-600'
          }`} />
        </div>
      );
    });
  };

  // ── Collapse/expand button (viewer allows toggle) ──
  const renderCollapseButton = () => {
    if (!node.childrenIds || node.childrenIds.length === 0) return null;
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#161b22] border border-white/[0.15] rounded-full flex items-center justify-center shadow-lg hover:bg-[#21262d] hover:border-white/[0.25] z-20 transition-all"
        title={isExpanded ? "Collapse Children" : "Expand Children"}
      >
        <div className={`w-2 h-2 border-b-2 border-r-2 border-neutral-400 transform transition-transform ${isExpanded ? 'rotate-45 -translate-y-0.5' : '-rotate-45 translate-y-0.5'}`} />
      </button>
    );
  };

  // ── Drag interception for click detection (mimics Editor) ──
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;

    const handlePointerMove = () => {
      // Just track movement if needed, we don't actually drag nodes in viewer
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      const dist = Math.hypot(upEvent.clientX - startX, upEvent.clientY - startY);
      if (dist < 5) {
        // Calculate target zoom (similar to editor)
        let depth = 0;
        let walkIdStr = node.parentId;
        const clickVisited = new Set<string>();
        while (walkIdStr && nodes[walkIdStr]) {
          if (clickVisited.has(walkIdStr)) break;
          clickVisited.add(walkIdStr);
          depth++;
          walkIdStr = nodes[walkIdStr].parentId;
        }

        let worldX = node.x + (isBussNode ? BUSS_NODE_SIZE / 2 : 280 / 2);
        let worldY = node.y + (node.height || (isBussNode ? BUSS_NODE_SIZE : 140)) / 2;
        let scale = 1;
        
        walkIdStr = node.parentId;
        const posVisited = new Set<string>();
        while (walkIdStr && nodes[walkIdStr]) {
          if (posVisited.has(walkIdStr)) break;
          posVisited.add(walkIdStr);
          const parent = nodes[walkIdStr];
          scale *= 0.5;
          worldX = parent.x + worldX * 0.5;
          // Editor offsets center for non-root, but here we just use the scale
          worldY = parent.y + worldY * 0.5;
          walkIdStr = parent.parentId;
        }

        const targetZoom = Math.pow(2, depth) * (editorSettings?.referenceZoom || 1);
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;

        setCamera({
          x: screenCenterX - worldX * targetZoom,
          y: screenCenterY - worldY * targetZoom,
          zoom: targetZoom,
        });
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      className="absolute"
      style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
    >
      {/* Node Content — mirrors editor's motion.div exactly */}
      <div
        ref={nodeRef}
        id={`node-${id}`}
        className={`${isBussNode ? 'flex items-center justify-center text-center border-blue-500/40 border-2' : 'w-[280px] p-5 border'} cursor-pointer relative z-20 transition-all duration-300 ${
          isBussNode ? 'hover:border-blue-400/60' : 'hover:border-white/[0.15]'
        }`}
        onPointerDown={handlePointerDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setActiveNodeId(id);
        }}
        style={{
          ...(isBussNode ? { width: BUSS_NODE_SIZE, height: BUSS_NODE_SIZE } : {}),
          borderRadius: isBussNode ? '9999px' : `${editorSettings?.nodeBorderRadius || 12}px`,
          backdropFilter: `blur(${editorSettings?.nodeBlur || 16}px)`,
          backgroundColor: `${editorSettings?.colorNodeBg || '#0d1117'}e6`,
          borderColor: node.groupColor ? `${node.groupColor}60` : undefined,
          boxShadow: node.groupColor
            ? `0 0 0 3px ${node.groupColor}40, 0 0 20px ${node.groupColor}20`
            : editorSettings?.glowEffects
              ? `0 ${10 * (editorSettings?.nodeShadowIntensity || 1)}px ${40 * (editorSettings?.nodeShadowIntensity || 1)}px rgba(0,0,0,${0.5 * (editorSettings?.nodeShadowIntensity || 1)})`
              : 'none',
        }}
      >
        {/* Group color indicator dot */}
        {node.groupColor && (
          <div
            className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full border-2 border-[#0d1117] z-30 shadow-lg"
            style={{ backgroundColor: node.groupColor }}
          />
        )}

        {/* Inner Grid / Polish — same as editor */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ borderRadius: isBussNode ? '9999px' : `${editorSettings?.nodeBorderRadius || 12}px` }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:12px_12px]" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent" />
          <div
            className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
            style={{ borderRadius: isBussNode ? '9999px' : `${editorSettings?.nodeBorderRadius || 12}px` }}
          />
        </div>

        {/* Text Content */}
        <div className="node-text-content w-full h-full flex flex-col relative z-10">
          <div className={`flex flex-col gap-2 relative z-10 ${isBussNode ? 'items-center w-full px-2' : ''}`}>
            <div className={`flex ${isBussNode ? 'justify-center w-full' : 'justify-between items-start'}`}>
              <h3
                className={`${isBussNode ? 'text-[10px] text-center break-words w-full leading-none' : 'text-xl'} font-bold truncate text-white tracking-tight`}
                style={{ color: editorSettings?.colorText || '#ffffff' }}
                title={isBussNode ? node.title : undefined}
              >
                {isBussNode ? (node.title?.[0] || '•').toUpperCase() : node.title}
              </h3>
            </div>
            {!isBussNode && (
              <p className="node-description text-sm text-neutral-400 line-clamp-3 leading-relaxed">
                {node.description || 'No description provided.'}
              </p>
            )}
          </div>
        </div>

        {/* Port dots */}
        {renderPorts()}

        {/* Collapse/Expand Button */}
        {renderCollapseButton()}
      </div>

      {/* Connection Lines (port-based) */}
      {renderPortLines()}

      {/* Tunnel Links */}
      {renderTunnelLinks()}

      {/* Children Container — Scaled down by 0.5, identical to editor */}
      {isExpanded && node.childrenIds && node.childrenIds.length > 0 && (
        <div className="absolute top-0 left-0" style={{ transform: 'scale(0.5)', transformOrigin: '0 0' }}>
          {Array.from(new Set(node.childrenIds as string[])).map((childId: string) => (
            <ViewerNode
              key={childId}
              id={childId}
              nodes={nodes}
              editorSettings={editorSettings}
              renderPath={[...renderPath, id]}
              setActiveNodeId={setActiveNodeId}
              camera={camera}
              setCamera={setCamera}
            />
          ))}
        </div>
      )}
    </div>
  );
}
