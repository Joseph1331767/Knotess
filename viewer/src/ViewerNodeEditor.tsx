import React, { useState, useRef, useEffect } from 'react';
import { X, Music } from 'lucide-react';

// Inline embed detection (same logic as editor, duplicated for portability)
function getEmbedInfo(url: string) {
  if (!url) return { type: 'iframe', embedUrl: '' };
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (ytMatch) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0` };
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) return { type: 'direct-video', embedUrl: url };
  if (/\.(mp3|wav|ogg|flac|aac|m4a)(\?.*)?$/i.test(url)) return { type: 'direct-audio', embedUrl: url };
  return { type: 'iframe', embedUrl: url };
}

export function ViewerNodeEditor({ nodes, activeNodeId, setActiveNodeId, assets = [] }: any) {
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const cameraRef = useRef(camera);

  useEffect(() => { cameraRef.current = camera; }, [camera]);

  const node = activeNodeId ? nodes[activeNodeId] : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = cameraRef.current;
      if (e.ctrlKey || e.metaKey) {
        const zoomSensitivity = 0.002;
        const delta = -e.deltaY * zoomSensitivity;
        const newZoom = Math.min(Math.max(0.1, cam.zoom * Math.exp(delta)), 5);
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoomRatio = newZoom / cam.zoom;
        const newX = mouseX - (mouseX - cam.x) * zoomRatio;
        const newY = mouseY - (mouseY - cam.y) * zoomRatio;
        setCamera({ x: newX, y: newY, zoom: newZoom });
      } else {
        setCamera(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [setCamera]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || e.button === 2 || e.altKey || e.button === 0) {
      e.preventDefault();
      setIsPanning(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) setCamera(prev => ({ ...prev, x: prev.x + e.movementX, y: prev.y + e.movementY }));
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) { setIsPanning(false); try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {} }
  };

  if (!node) return null;

  const activePage = node.pages?.find((p: any) => p.id === activePageId) || (node.pages?.length > 0 ? node.pages[0] : null);
  const effectivePageId = activePage?.id || null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm">
      <button
        onClick={() => setActiveNodeId(null)}
        className="absolute top-4 right-4 sm:top-8 sm:right-8 p-3 bg-neutral-800/80 hover:bg-neutral-700 text-white rounded-full backdrop-blur-md transition-colors shadow-2xl border border-white/10 z-[110]"
        title="Exit to Node View"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="w-full h-full bg-[#0d1117] border border-white/[0.08] rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden relative ring-1 ring-white/[0.02]">
        <div className="h-16 bg-[#161b22]/90 backdrop-blur-2xl border-b border-white/[0.08] flex items-center justify-between px-6 z-20 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent tracking-tight">{node.title}</h2>
            <div className="w-px h-6 bg-white/[0.08] mx-2" />
            <span className="text-neutral-400 text-sm max-w-md truncate font-medium">{node.description}</span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 bg-[#0d1117]/80 backdrop-blur-2xl border-r border-white/[0.08] flex flex-col z-20 shadow-[4px_0_20px_rgba(0,0,0,0.2)]">
            <div className="p-5 border-b border-white/[0.05] flex justify-between items-center bg-[#161b22]/50">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Pages</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {(node.pages || []).map((page: any) => (
                <div
                  key={page.id}
                  className={`px-4 py-3 rounded-xl text-sm cursor-pointer flex justify-between items-center group transition-all duration-200 ${
                    effectivePageId === page.id ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200 border border-transparent'
                  }`}
                  onClick={() => { setActivePageId(page.id); setCamera({ x: 0, y: 0, zoom: 1 }); }}
                >
                  <span className="truncate font-medium">{page.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="flex-1 relative bg-[#050505] overflow-hidden"
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            {activePage && (
              <div className={`w-full h-full relative ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}>
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px),
                      linear-gradient(to right, rgba(255,255,255,0.015) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(255,255,255,0.015) 1px, transparent 1px)
                    `,
                    backgroundSize: `${100 * camera.zoom}px ${100 * camera.zoom}px, ${100 * camera.zoom}px ${100 * camera.zoom}px, ${20 * camera.zoom}px ${20 * camera.zoom}px, ${20 * camera.zoom}px ${20 * camera.zoom}px`,
                    backgroundPosition: `${camera.x}px ${camera.y}px, ${camera.x}px ${camera.y}px, ${camera.x}px ${camera.y}px, ${camera.x}px ${camera.y}px`
                  }}
                />
                <div
                  className="absolute inset-0 transform-gpu"
                  style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`, transformOrigin: '0 0' }}
                >
                  {activePage.items.map((item: any) => (
                    <ViewerCanvasItem key={item.id} item={item} assets={assets} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewerCanvasItem({ item, assets = [] }: { item: any; assets?: any[] }) {
  // Resolve asset-linked data
  let renderData = item.data;
  if (item.assetId && assets.length > 0) {
    const asset = assets.find((a: any) => a.id === item.assetId);
    if (asset) renderData = asset.data;
  }

  return (
    <div
      className="absolute bg-[#0d1117]/90 backdrop-blur-3xl border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.02] flex flex-col z-10"
      style={{ left: item.x, top: item.y, width: item.width, height: item.height }}
    >
      <div className="h-8 bg-gradient-to-b from-white/[0.08] to-transparent border-b border-white/[0.05] flex items-center px-3 rounded-t-2xl shrink-0">
        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{item.type}</span>
      </div>
      <div className="w-full flex-1 overflow-hidden p-4 relative flex flex-col">
        {item.type === 'text' && (
          <div className="w-full h-full text-[15px] leading-relaxed text-neutral-200 font-medium whitespace-pre-wrap overflow-auto">
            {renderData.text}
          </div>
        )}
        {item.type === 'image' && (
          <div className="w-full h-full relative rounded-xl overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
            <img src={renderData.url} alt="Canvas Image" loading="lazy" className="w-full h-full object-cover pointer-events-none" />
          </div>
        )}
        {item.type === 'video' && (() => {
          const embed = getEmbedInfo(renderData.url || '');
          if (embed.type === 'youtube' || embed.type === 'vimeo') {
            return (
              <div className="w-full h-full relative rounded-xl overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] bg-black">
                <iframe src={embed.embedUrl} className="w-full h-full border-none" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            );
          }
          return (
            <div className="w-full h-full relative rounded-xl overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] bg-black flex items-center justify-center">
              <video src={renderData.url} controls className="w-full h-full object-contain" />
            </div>
          );
        })()}
        {item.type === 'iframe' && (
          <div className="w-full h-full relative rounded-xl overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] bg-white">
            <iframe src={renderData.url} className="w-full h-full border-none pointer-events-auto" />
          </div>
        )}
        {item.type === 'audio' && (
          <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-white/[0.05] to-transparent rounded-xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] p-6 gap-4">
            <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center shadow-inner border border-white/[0.05]">
              <Music className="w-8 h-8 text-neutral-400" />
            </div>
            <audio src={renderData.url} controls className="w-full max-w-md filter drop-shadow-lg" />
          </div>
        )}
        {item.type === 'html' && (
          <div className="w-full h-full rounded-xl overflow-auto shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] bg-white/5 p-3">
            <div dangerouslySetInnerHTML={{ __html: renderData.html || '' }} />
          </div>
        )}
      </div>
    </div>
  );
}
