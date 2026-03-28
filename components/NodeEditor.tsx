'use client';

import { useStore, CanvasItem } from '@/lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Image as ImageIcon, Type, Link as LinkIcon, Video, Music, Maximize } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function NodeEditor() {
  const { activeNodeId, setActiveNode, nodes, addPage, updatePage, deletePage, addCanvasItem } = useStore();
  console.log('NodeEditor activeNodeId:', activeNodeId);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);

  const node = activeNodeId ? nodes[activeNodeId] : null;

  if (node && !activePageId && node.pages.length > 0) {
    setActivePageId(node.pages[0].id);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const zoomSensitivity = 0.002;
        const delta = -e.deltaY * zoomSensitivity;
        const newZoom = Math.min(Math.max(0.1, camera.zoom * Math.exp(delta)), 5);
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomRatio = newZoom / camera.zoom;
        const newX = mouseX - (mouseX - camera.x) * zoomRatio;
        const newY = mouseY - (mouseY - camera.y) * zoomRatio;
        
        setCamera({ x: newX, y: newY, zoom: newZoom });
      } else {
        // Pan
        setCamera(prev => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }));
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [camera]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || e.button === 2 || e.altKey) { // Middle click, right click, or alt+click to pan
      e.preventDefault();
      setIsPanning(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setCamera(prev => ({
        ...prev,
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  if (!node) return null;

  const activePage = node.pages.find((p) => p.id === activePageId);

  return (
    <AnimatePresence>
      {activeNodeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm">
          {/* Exterior Border Controls */}
          <button
            onClick={() => setActiveNode(null)}
            className="absolute top-4 right-4 sm:top-8 sm:right-8 p-3 bg-neutral-800/80 hover:bg-red-500/80 text-white rounded-full backdrop-blur-md transition-colors shadow-2xl border border-white/10 z-[60]"
            title="Exit to Node View"
          >
            <X className="w-6 h-6" />
          </button>

          <motion.div
            layoutId={`node-${activeNodeId}`}
            className="w-full h-full bg-[#0d1117] border border-white/[0.08] rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden relative ring-1 ring-white/[0.02]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="h-16 bg-[#161b22]/90 backdrop-blur-2xl border-b border-white/[0.08] flex items-center justify-between px-6 z-20 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent tracking-tight">{node.title}</h2>
                <div className="w-px h-6 bg-white/[0.08] mx-2" />
                <span className="text-neutral-400 text-sm max-w-md truncate font-medium">{node.description}</span>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Pages Sidebar */}
              <div className="w-64 bg-[#0d1117]/80 backdrop-blur-2xl border-r border-white/[0.08] flex flex-col z-20 shadow-[4px_0_20px_rgba(0,0,0,0.2)]">
                <div className="p-5 border-b border-white/[0.05] flex justify-between items-center bg-[#161b22]/50">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Pages</span>
                  <button
                    onClick={() => addPage(activeNodeId, `Page ${node.pages.length + 1}`)}
                    className="p-1.5 bg-white/[0.02] hover:bg-white/[0.08] rounded-md text-neutral-400 hover:text-white transition-colors border border-white/[0.05] shadow-inner"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  {node.pages.map((page) => (
                    <div
                      key={page.id}
                      className={`px-4 py-3 rounded-xl text-sm cursor-pointer flex justify-between items-center group transition-all duration-200 ${
                        activePageId === page.id ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200 border border-transparent'
                      }`}
                      onClick={() => {
                        setActivePageId(page.id);
                        setCamera({ x: 0, y: 0, zoom: 1 }); // Reset camera on page change
                      }}
                    >
                      <span className="truncate font-medium">{page.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(activeNodeId, page.id);
                          if (activePageId === page.id) setActivePageId(null);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-opacity p-1.5 rounded-md hover:bg-red-500/10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Infinite Canvas for Page */}
              <div 
                className="flex-1 relative bg-[#050505] overflow-hidden"
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onContextMenu={(e) => e.preventDefault()}
              >
                {/* Toolbar for Canvas */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#0d1117]/90 backdrop-blur-3xl border border-white/[0.08] rounded-2xl px-3 py-3 flex gap-2 z-30 shadow-[0_20px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.02]">
                  <button onClick={() => addCanvasItem(activeNodeId, activePageId!, { type: 'text', x: -camera.x / camera.zoom + 100, y: -camera.y / camera.zoom + 100, width: 300, height: 200, data: { text: 'New Note' } })} className="w-16 h-16 hover:bg-white/[0.06] rounded-xl text-neutral-400 hover:text-white transition-all duration-200 flex flex-col items-center justify-center gap-1.5 group" title="Add Text">
                    <Type className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Text</span>
                  </button>
                  <button onClick={() => addCanvasItem(activeNodeId, activePageId!, { type: 'image', x: -camera.x / camera.zoom + 150, y: -camera.y / camera.zoom + 150, width: 400, height: 300, data: { url: 'https://picsum.photos/seed/1/400/300' } })} className="w-16 h-16 hover:bg-white/[0.06] rounded-xl text-neutral-400 hover:text-white transition-all duration-200 flex flex-col items-center justify-center gap-1.5 group" title="Add Image">
                    <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Image</span>
                  </button>
                  <button onClick={() => addCanvasItem(activeNodeId, activePageId!, { type: 'iframe', x: -camera.x / camera.zoom + 200, y: -camera.y / camera.zoom + 200, width: 500, height: 400, data: { url: 'https://example.com' } })} className="w-16 h-16 hover:bg-white/[0.06] rounded-xl text-neutral-400 hover:text-white transition-all duration-200 flex flex-col items-center justify-center gap-1.5 group" title="Add Embed">
                    <LinkIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Embed</span>
                  </button>
                  <button onClick={() => addCanvasItem(activeNodeId, activePageId!, { type: 'video', x: -camera.x / camera.zoom + 250, y: -camera.y / camera.zoom + 250, width: 480, height: 270, data: { url: 'https://www.w3schools.com/html/mov_bbb.mp4' } })} className="w-16 h-16 hover:bg-white/[0.06] rounded-xl text-neutral-400 hover:text-white transition-all duration-200 flex flex-col items-center justify-center gap-1.5 group" title="Add Video">
                    <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Video</span>
                  </button>
                  <button onClick={() => addCanvasItem(activeNodeId, activePageId!, { type: 'audio', x: -camera.x / camera.zoom + 300, y: -camera.y / camera.zoom + 300, width: 320, height: 100, data: { url: 'https://www.w3schools.com/html/horse.mp3' } })} className="w-16 h-16 hover:bg-white/[0.06] rounded-xl text-neutral-400 hover:text-white transition-all duration-200 flex flex-col items-center justify-center gap-1.5 group" title="Add Audio">
                    <Music className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Audio</span>
                  </button>
                </div>

                {/* Canvas Content */}
                {activePage && (
                  <div 
                    className={`w-full h-full relative ${isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
                  >
                    {/* Grid */}
                    <div 
                      className="absolute inset-0 pointer-events-none" 
                      style={{ 
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
                        `
                      }} 
                    />
                    
                    {/* Items Container */}
                    <div 
                      className="absolute inset-0 transform-gpu"
                      style={{
                        transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
                        transformOrigin: '0 0'
                      }}
                    >
                      {activePage.items.map((item) => (
                        <CanvasItemComponent key={item.id} nodeId={activeNodeId} pageId={activePageId!} item={item} zoom={camera.zoom} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function CanvasItemComponent({ nodeId, pageId, item, zoom }: { nodeId: string; pageId: string; item: CanvasItem; zoom: number }) {
  const { updateCanvasItem, deleteCanvasItem } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });

  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [resizeDelta, setResizeDelta] = useState({ w: 0, h: 0 });

  const currentX = item.x + (isDragging ? dragDelta.x : 0);
  const currentY = item.y + (isDragging ? dragDelta.y : 0);
  const currentWidth = Math.max(150, item.width + (isResizing ? resizeDelta.w : 0));
  const currentHeight = Math.max(100, item.height + (isResizing ? resizeDelta.h : 0));

  const handleDragPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragDelta({ x: 0, y: 0 });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragPointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;
      setDragDelta({ x: dx, y: dy });
    }
  };

  const handleDragPointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      updateCanvasItem(nodeId, pageId, item.id, { x: currentX, y: currentY });
      setDragDelta({ x: 0, y: 0 });
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY });
    setResizeDelta({ w: 0, h: 0 });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (isResizing) {
      const dx = (e.clientX - resizeStart.x) / zoom;
      const dy = (e.clientY - resizeStart.y) / zoom;
      setResizeDelta({ w: dx, h: dy });
    }
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (isResizing) {
      setIsResizing(false);
      updateCanvasItem(nodeId, pageId, item.id, { width: currentWidth, height: currentHeight });
      setResizeDelta({ w: 0, h: 0 });
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      className={`absolute bg-[#0d1117]/90 backdrop-blur-3xl border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] group ring-1 ring-white/[0.02] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col ${isDragging ? 'z-50 scale-[1.02] border-blue-500/50 ring-blue-500/20' : 'z-10'}`}
      style={{
        left: currentX,
        top: currentY,
        width: currentWidth,
        height: currentHeight,
      }}
    >
      <div
        className="h-8 bg-gradient-to-b from-white/[0.08] to-transparent border-b border-white/[0.05] cursor-move flex justify-between items-center px-3 rounded-t-2xl shrink-0"
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={handleDragPointerUp}
      >
        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{item.type}</span>
        <button
          onClick={() => deleteCanvasItem(nodeId, pageId, item.id)}
          className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-opacity p-1 rounded-md hover:bg-red-500/20"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="w-full flex-1 overflow-hidden p-4 relative flex flex-col">
        {item.type === 'text' && (
          <textarea
            className="w-full h-full bg-transparent resize-none outline-none text-[15px] leading-relaxed text-neutral-200 placeholder:text-neutral-600 font-medium"
            value={item.data.text}
            placeholder="Type your notes here..."
            onChange={(e) => updateCanvasItem(nodeId, pageId, item.id, { data: { ...item.data, text: e.target.value } })}
          />
        )}
        {item.type === 'image' && (
          <div className="w-full h-full relative rounded-xl overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.data.url} alt="Canvas Image" loading="lazy" className="w-full h-full object-cover pointer-events-none" />
          </div>
        )}
        {item.type === 'iframe' && (
          <div className="w-full h-full relative rounded-xl overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] bg-white">
            {/* Overlay to prevent iframe from stealing pointer events during drag/resize */}
            {(isDragging || isResizing) && <div className="absolute inset-0 z-10 bg-black/5" />}
            <iframe src={item.data.url} className="w-full h-full border-none" />
          </div>
        )}
        {item.type === 'video' && (
          <div className="w-full h-full relative rounded-xl overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] bg-black flex items-center justify-center">
            <video src={item.data.url} controls className="w-full h-full object-contain" />
          </div>
        )}
        {item.type === 'audio' && (
          <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-white/[0.05] to-transparent rounded-xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] p-6 gap-4">
            <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center shadow-inner border border-white/[0.05]">
              <Music className="w-8 h-8 text-neutral-400" />
            </div>
            <audio src={item.data.url} controls className="w-full max-w-md filter drop-shadow-lg" />
          </div>
        )}
      </div>
      
      {/* Resize Handle */}
      <div 
        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-neutral-500">
          <path d="M8 10V8H10V10H8ZM4 10V8H6V10H4ZM0 10V8H2V10H0ZM8 6V4H10V6H8ZM8 2V0H10V2H8Z" fill="currentColor"/>
        </svg>
      </div>
    </div>
  );
}

