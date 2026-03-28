'use client';

import { useStore } from '@/lib/store';
import { motion } from 'motion/react';
import { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Maximize2, Link as LinkIcon, X, Check } from 'lucide-react';

export function Node({ id }: { id: string }) {
  console.log('Node rendered', id);
  const { 
    nodes, 
    selectedNodeIds, 
    selectedPortIds,
    selectNode, 
    updateNode, 
    addNode, 
    deleteNode, 
    setActiveNode, 
    setCamera, 
    linkingSourceId, 
    setLinkingSourceId, 
    linkingSourcePortId,
    setLinkingSourcePortId,
    addNodeWithPort, 
    updatePort, 
    deletePort, 
    selectPorts,
    movePortsToNode,
    linkNodesViaPort,
    isSnapEnabled 
  } = useStore();
  const node = nodes[id];
  const isSelected = selectedNodeIds.includes(id);
  const [isEditing, setIsEditing] = useState(false);
  const [isDraggingPort, setIsDraggingPort] = useState(false);
  const [nodeMode, setNodeMode] = useState<'child' | 'sister' | 'buss'>('child');
  const [dragAngle, setDragAngle] = useState(0);
  const [editingPortId, setEditingPortId] = useState<string | null>(null);
  const [hoveredPortId, setHoveredPortId] = useState<string | null>(null);
  const [nodeHeight, setNodeHeight] = useState(140);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const dragAngleRef = useRef(0);
  const nodeRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (nodeRef.current && node) {
      if (node.nodeType === 'buss') {
        setNodeHeight(130);
        if (node.height !== 130) {
          updateNode(id, { height: 130 });
        }
      } else {
        const snapValue = 20;
        let h = nodeRef.current.offsetHeight;
        // Round height to nearest snap value to be resonant
        h = Math.round(h / snapValue) * snapValue;
        
        setNodeHeight(h);
        if (node.height !== h) {
          updateNode(id, { height: h });
        }
      }
    }
  }, [node, id, updateNode, isEditing]);

  if (!node) return null;

  const nodeWidth = node.nodeType === 'buss' ? 130 : 280; // Resonant with 20px snap (14 * 20)

  const getPointOnPerimeter = (angle: number) => {
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
    
    // Normalized vector
    const dx = cos;
    const dy = sin;
    
    // Scale to reach the edge
    const scale = Math.min(
      dx !== 0 ? Math.abs(halfW / dx) : Infinity,
      dy !== 0 ? Math.abs(halfH / dy) : Infinity
    );
    
    return { x: dx * scale + halfW, y: dy * scale + halfH };
  };

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
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingPort(true);
    
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
    };

    const handleUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      setIsDraggingPort(false);

      // Calculate position for new child
      // We want it to be some distance away from the port
      const rad = (dragAngleRef.current * Math.PI) / 180;
      const dist = nodeMode === 'sister' ? 400 : (nodeMode === 'buss' ? 200 : 800); // Sisters are at same scale, children are scaled 0.5x
      
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

      addNodeWithPort(id, childX, childY, dragAngleRef.current, 'New Port', nodeMode);
      setNodeMode('child'); // Reset after use
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    selectNode(id, e.shiftKey);

    if (nodeRef.current && !isEditing) {
      // Start dragging
      const startX = e.clientX;
      const startY = e.clientY;
      const initialNodeX = node.x;
      const initialNodeY = node.y;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        let current = nodes[id];
        let depth = 0;
        while (current && current.parentId) {
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

        updateNode(id, { x: newX, y: newY });
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);

        // If it was a click (no significant movement), zoom to node
        const dist = Math.hypot(upEvent.clientX - startX, upEvent.clientY - startY);
        if (dist < 5) {
          let current = nodes[id];
          let depth = 0;
          while (current && current.parentId) {
            depth++;
            current = nodes[current.parentId];
          }
          
          const rect = nodeRef.current!.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          
          setCamera((prev) => {
            // Target zoom so this node appears at scale 1 (or slightly smaller to see children)
            // Since node is scaled by 0.5^depth, we need zoom = 2^depth
            // Let's use 2^depth * 0.8 to give some padding
            const targetZoom = Math.pow(2, depth) * 0.8;
            const screenCenterX = window.innerWidth / 2;
            const screenCenterY = window.innerHeight / 2;
            
            const worldX = (centerX - prev.x) / prev.zoom;
            const worldY = (centerY - prev.y) / prev.zoom;

            return {
              x: screenCenterX - worldX * targetZoom,
              y: screenCenterY - worldY * targetZoom,
              zoom: targetZoom,
            };
          });
        }
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeRef.current && !isEditing) {
      setActiveNode(id);
    }
  };

  const handleOpenEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveNode(id);
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    addNode(id, 600, 0);
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
        className={`${node.nodeType === 'buss' ? 'w-[130px] h-[130px] rounded-full flex items-center justify-center text-center border-blue-500/40 border-2' : 'w-[280px] p-5 rounded-2xl border'} backdrop-blur-2xl shadow-2xl cursor-pointer relative z-20 transition-all duration-300 ${
          isSelected 
            ? 'border-blue-500/60 bg-[#161b22]/90 shadow-[0_0_40px_rgba(59,130,246,0.2)] ring-1 ring-blue-500/50' 
            : (node.nodeType === 'buss' ? 'bg-[#0d1117]/90 hover:border-blue-400/60 hover:bg-[#161b22]/90' : 'border-white/[0.08] bg-[#0d1117]/90 hover:border-white/[0.15] hover:bg-[#161b22]/90')
        }`}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
      >
        {/* Inner Grid / AAA Polish */}
        <div className={`absolute inset-0 ${node.nodeType === 'buss' ? 'rounded-full' : 'rounded-2xl'} overflow-hidden pointer-events-none`}>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:12px_12px]" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent" />
          <div className={`absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] ${node.nodeType === 'buss' ? 'rounded-full' : 'rounded-2xl'}`} />
        </div>

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
              className={`bg-transparent border-b border-blue-500/50 outline-none font-bold text-white placeholder:text-neutral-600 ${node.nodeType === 'buss' ? 'text-sm text-center w-full' : 'text-xl'}`}
              value={node.title}
              placeholder="Node Title"
              onChange={(e) => updateNode(id, { title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
            />
            {node.nodeType !== 'buss' && (
              <textarea
                className="bg-transparent border-b border-neutral-700 outline-none text-sm text-neutral-300 resize-none placeholder:text-neutral-600"
                value={node.description}
                placeholder="Node Description"
                onChange={(e) => updateNode(id, { description: e.target.value })}
                rows={3}
              />
            )}
          </div>
        ) : (
          <div className={`flex flex-col gap-2 relative z-10 ${node.nodeType === 'buss' ? 'items-center w-full px-2' : ''}`}>
            <div className={`flex ${node.nodeType === 'buss' ? 'justify-center w-full' : 'justify-between items-start'}`}>
              <h3 className={`${node.nodeType === 'buss' ? 'text-sm text-center break-words w-full' : 'text-xl'} font-bold truncate text-white tracking-tight`}>{node.title}</h3>
              {isSelected && node.nodeType !== 'buss' && (
                <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/[0.05] backdrop-blur-md shadow-inner">
                  <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1.5 hover:bg-white/[0.1] rounded-md text-neutral-400 hover:text-white transition-colors" title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { 
                    e.stopPropagation(); 
                    setLinkingSourceId(id);
                  }} className={`p-1.5 rounded-md transition-colors ${linkingSourceId === id ? 'bg-blue-600 text-white' : 'hover:bg-blue-500/20 text-blue-400 hover:text-blue-300'}`} title={linkingSourceId === id ? "Click another node to link" : "Add Tunnel Link"}>
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteNode(id); }} className="p-1.5 hover:bg-red-500/20 rounded-md text-red-400 hover:text-red-300 transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            {node.nodeType !== 'buss' && (
              <p className="text-sm text-neutral-400 line-clamp-3 leading-relaxed">{node.description || 'No description provided.'}</p>
            )}
            {isSelected && node.nodeType === 'buss' && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-1 bg-black/40 p-1 rounded-lg border border-white/[0.05] backdrop-blur-md shadow-inner">
                <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1.5 hover:bg-white/[0.1] rounded-md text-neutral-400 hover:text-white transition-colors" title="Edit">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNode(id); }} className="p-1.5 hover:bg-red-500/20 rounded-md text-red-400 hover:text-red-300 transition-colors" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add Child Button / Port Creator */}
        {isSelected && (
          <div 
            className="absolute z-20"
            style={{
              left: isDraggingPort ? getPointOnPerimeter(dragAngle).x : 'auto',
              top: isDraggingPort ? getPointOnPerimeter(dragAngle).y : '50%',
              right: isDraggingPort ? 'auto' : -20,
              transform: isDraggingPort ? 'translate(-50%, -50%)' : 'translateY(-50%)',
            }}
          >
            <button
              onPointerDown={(e) => {
                if (e.button === 2) {
                  e.preventDefault();
                  e.stopPropagation();
                  setNodeMode(prev => prev === 'child' ? 'sister' : prev === 'sister' ? 'buss' : 'child');
                  return;
                }
                if (e.button === 0) {
                  handlePortDragStart(e);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                if (!isDraggingPort && e.button === 0) {
                  e.stopPropagation();
                  // For simple click, we don't have an angle, but we can default to 0 or something
                  const dist = nodeMode === 'sister' ? 300 : (nodeMode === 'buss' ? 150 : 600);
                  let newX, newY;
                  if (nodeMode === 'sister' || nodeMode === 'buss') {
                    newX = node.x + dist;
                    newY = node.y;
                  } else if (node.nodeType === 'buss' && nodeMode === 'child') {
                    const mainNode = nodes[node.mainNodeId || node.parentId || ''];
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
                  addNodeWithPort(id, newX, newY, 0, 'New Port', nodeMode);
                  setNodeMode('child');
                }
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 border border-blue-400/50 ${
                isDraggingPort 
                  ? (nodeMode === 'sister' ? 'bg-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.6)]' : nodeMode === 'buss' ? 'bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.6)]' : 'bg-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.6)]')
                  : (nodeMode === 'sister' ? 'bg-purple-600 shadow-[0_0_20px_rgba(168,85,247,0.5)]' : nodeMode === 'buss' ? 'bg-green-600 shadow-[0_0_20px_rgba(34,197,94,0.5)]' : 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:bg-blue-400')
              }`}
              title={nodeMode === 'sister' ? "Sister Node Mode" : nodeMode === 'buss' ? "Buss Node Mode" : "Drag to create Port, Right-click to cycle modes"}
            >
              <Plus className="w-5 h-5 text-white drop-shadow-md" />
            </button>
          </div>
        )}

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
                selectPorts(id, sameLocationPorts.map(p => p.id));
              }}
              onContextMenu={(e) => {
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
                  setLinkingSourcePortId({ nodeId: id, portId: port.id });
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
                      updatePort(id, pid, { angle });
                    });
                  } else {
                    updatePort(id, port.id, { angle });
                  }
                };

                const handleUp = (upEvent: PointerEvent) => {
                  window.removeEventListener('pointermove', handleMove);
                  window.removeEventListener('pointerup', handleUp);
                  
                  if (isRightClick) {
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
                      
                      linkNodesViaPort(id, targetNodeId, port.angle, type);
                    }
                    setLinkingSourcePortId(null);
                    return;
                  }

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
                      
                      movePortsToNode(portIdsToMove, id, targetNodeId, angleOffset);
                    }
                  }
                };

                window.addEventListener('pointermove', handleMove);
                window.addEventListener('pointerup', handleUp);
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
                        onChange={(e) => updatePort(id, port.id, { name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingPortId(null)}
                      />
                      <div className="flex flex-wrap gap-1">
                        {['true', 'false', 'success', 'error', 'input', 'output'].map(name => (
                          <button
                            key={name}
                            onClick={() => {
                              updatePort(id, port.id, { name });
                              setEditingPortId(null);
                            }}
                            className="text-[10px] bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded text-neutral-400 hover:text-white transition-colors"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between mt-1">
                        <button onClick={() => deletePort(id, port.id)} className="text-[10px] text-red-400 hover:text-red-300">Delete</button>
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
            className="absolute -top-4 -right-4 w-10 h-10 bg-[#161b22] border border-white/[0.15] rounded-full flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.5)] hover:bg-[#21262d] hover:border-white/[0.25] z-20 transition-all hover:scale-110 hover:shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
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
              updateNode(id, { isExpanded: !node.isExpanded });
            }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#161b22] border border-white/[0.15] rounded-full flex items-center justify-center shadow-lg hover:bg-[#21262d] hover:border-white/[0.25] z-20 transition-all"
            title={node.isExpanded ? "Collapse Children" : "Expand Children"}
          >
            <div className={`w-2 h-2 border-b-2 border-r-2 border-neutral-400 transform transition-transform ${node.isExpanded ? 'rotate-45 -translate-y-0.5' : '-rotate-45 translate-y-0.5'}`} />
          </button>
        )}
      </motion.div>

      {/* Connection Lines to Children and Sisters */}
      {(node.isExpanded && (node.childrenIds.length > 0 || (node.sisterIds && node.sisterIds.length > 0))) && (
        <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-0">
          <defs>
            <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
            </linearGradient>
          </defs>
          {(node.ports || []).map((port) => {
            const targetId = port.targetNodeId;
            const target = nodes[targetId];
            if (!target) return null;

            const isSister = port.type === 'sister';
            const isBuss = port.type === 'buss';
            const isSameScale = isSister || isBuss;
            
            let startX, startY;
            const pos = getPointOnPerimeter(port.angle);
            startX = pos.x;
            startY = pos.y;

            const targetWidth = target.nodeType === 'buss' ? 130 : 280;
            const targetHeight = target.nodeType === 'buss' ? 130 : (target.height || 140);
            let endX, endY;
            let targetEdgeCenters: { x: number, y: number, normal: { x: number, y: number } }[] = [];
            
            const getAbsolutePosition = (nodeId: string) => {
              let current = nodes[nodeId];
              if (!current) return { x: 0, y: 0, scale: 1 };
              
              let path = [];
              let curr: any = current;
              while (curr) {
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
            
            const isTargetSelected = selectedNodeIds.includes(targetId);
            const strokeColor = isTargetSelected 
              ? (isSister ? "rgba(168,85,247,0.8)" : "rgba(59,130,246,0.8)")
              : (isSister ? "rgba(168,85,247,0.4)" : `url(#grad-${id})`);
            
            const midX = 0.125 * startX + 0.375 * cp1x + 0.375 * cp2x + 0.125 * endX;
            const midY = 0.125 * startY + 0.375 * cp1y + 0.375 * cp2y + 0.125 * endY;

            return (
              <g key={`line-group-${port.id}`}>
                <path
                  d={`M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isTargetSelected ? "4" : "3"}
                  strokeDasharray={isSister ? "8 4" : "0"}
                  className={`transition-all duration-300 ${isTargetSelected ? (isSister ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]') : ''}`}
                />
                {/* Invisible thicker path for easier hovering and clicking */}
                <path
                  d={`M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="30"
                  className="cursor-pointer pointer-events-auto"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingLineId(port.id);
                  }}
                />
                {/* Line Label */}
                {editingLineId === port.id ? (
                  <foreignObject x={midX - 75} y={midY - 15} width="150" height="30" className="overflow-visible pointer-events-auto">
                    <input
                      autoFocus
                      className="w-full h-full bg-[#161b22] border border-blue-500/50 rounded text-xs text-center text-white outline-none shadow-lg"
                      defaultValue={port.linkLabel || ''}
                      onBlur={(e) => {
                        updatePort(id, port.id, { linkLabel: e.target.value });
                        setEditingLineId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updatePort(id, port.id, { linkLabel: e.currentTarget.value });
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

      {/* Tunnel Links - Swooping Lines */}
      {node.tunnelLinks.length > 0 && (
        <>
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
          <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-0">
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
            {Array.from(new Set(node.tunnelLinks)).map((targetId, index) => {
              const target = nodes[targetId];
              if (!target) return null;
              
              const getAbsolutePosition = (nodeId: string) => {
                let current = nodes[nodeId];
                if (!current) return { x: 0, y: 0, scale: 1 };
                
                let path = [];
                let curr: any = current;
                while (curr) {
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

              const targetWidth = target.nodeType === 'buss' ? 130 : 280;
              const targetHeight = target.nodeType === 'buss' ? 130 : (target.height || 140);

              const targetCenterAbsX = targetAbs.x + (targetWidth / 2) * targetAbs.scale;
              const targetCenterAbsY = targetAbs.y + (targetHeight / 2) * targetAbs.scale;

              const endX = (targetCenterAbsX - sourceAbs.x) / sourceAbs.scale;
              const endY = (targetCenterAbsY - sourceAbs.y) / sourceAbs.scale;

              const startX = nodeWidth / 2; // Center of node
              const startY = nodeHeight / 2;
              
              // Control points for a nice curve
              const dx = endX - startX;
              const dy = endY - startY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              const cp1X = startX + dx * 0.2 + distance * 0.2;
              const cp1Y = startY + dy * 0.2 - distance * 0.2;

              return (
                <g 
                  key={`tunnel-${targetId}`} 
                  className="pointer-events-auto cursor-pointer group"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    selectNode(targetId);
                    
                    const targetEl = document.getElementById(`node-${targetId}`);
                    if (targetEl) {
                      const rect = targetEl.getBoundingClientRect();
                      const centerX = rect.left + rect.width / 2;
                      const centerY = rect.top + rect.height / 2;
                      
                      setCamera((prev) => {
                        const targetZoom = prev.zoom * 1.5;
                        const screenCenterX = window.innerWidth / 2;
                        const screenCenterY = window.innerHeight / 2;
                        
                        const worldX = (centerX - prev.x) / prev.zoom;
                        const worldY = (centerY - prev.y) / prev.zoom;

                        return {
                          x: screenCenterX - worldX * targetZoom,
                          y: screenCenterY - worldY * targetZoom,
                          zoom: targetZoom,
                        };
                      });
                    }
                  }}
                >
                  <path
                    d={`M ${startX} ${startY} Q ${cp1X} ${cp1Y} ${endX} ${endY}`}
                    fill="none"
                    stroke="url(#tunnel-grad)"
                    strokeWidth="3"
                    strokeDasharray="12 12"
                    filter="url(#tunnel-glow)"
                    className="transition-all duration-300 group-hover:stroke-purple-400 group-hover:stroke-[5px] animate-flow opacity-70 group-hover:opacity-100"
                  />
                  {/* Invisible thicker path for easier hovering */}
                  <path
                    d={`M ${startX} ${startY} Q ${cp1X} ${cp1Y} ${endX} ${endY}`}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="40"
                  />
                  <text 
                    x={startX + dx * 0.5} 
                    y={startY + dy * 0.5 - 20} 
                    fill="white" 
                    className="opacity-0 group-hover:opacity-100 text-sm font-bold pointer-events-none transition-opacity duration-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    textAnchor="middle"
                  >
                    Tunnel to: {target.title}
                  </text>
                </g>
              );
            })}
          </svg>
        </>
      )}

      {/* Children Container - Scaled down by 0.5 */}
      {node.isExpanded && node.childrenIds.length > 0 && (
        <div className="absolute top-0 left-0" style={{ transform: 'scale(0.5)', transformOrigin: '0 0' }}>
          {Array.from(new Set(node.childrenIds)).map((childId) => (
            <Node key={childId} id={childId} />
          ))}
        </div>
      )}
    </div>
  );
}
