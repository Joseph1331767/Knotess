'use client';

import { useStore, CanvasItem, CanvasItemType, Asset, AssetType } from '@/lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Image as ImageIcon, Type, Link as LinkIcon, Video, Music, Code, Package, Upload, Search, Trash2, ExternalLink } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { getEmbedInfo, readFileAsBase64 } from '@/lib/embedUtils';

// ── URL Input Dialog ──────────────────────────────────────────────
function UrlInputDialog({ 
  title, placeholder, onSubmit, onCancel, showFileUpload = false 
}: { 
  title: string; placeholder: string; onSubmit: (url: string) => void; onCancel: () => void; showFileUpload?: boolean;
}) {
  const [url, setUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await readFileAsBase64(file);
    onSubmit(base64);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div 
        className="w-[440px] bg-[#161b22] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <input
          autoFocus
          className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-blue-500/50 placeholder:text-neutral-500"
          placeholder={placeholder}
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && url.trim()) onSubmit(url.trim()); if (e.key === 'Escape') onCancel(); }}
        />
        <div className="flex items-center gap-2">
          <button onClick={() => url.trim() && onSubmit(url.trim())} className="flex-1 px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl text-sm font-medium transition-colors border border-blue-500/20">
            Add
          </button>
          {showFileUpload && (
            <>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl text-sm font-medium transition-colors border border-white/10 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" /> Upload File
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </>
          )}
          <button onClick={onCancel} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-neutral-400 rounded-xl text-sm transition-colors border border-white/10">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Asset Explorer Panel ──────────────────────────────────────────
function AssetExplorer({ 
  onInsert, onClose 
}: { 
  onInsert: (asset: Asset) => void; onClose: () => void; 
}) {
  const { assets, deleteAsset, updateAsset } = useStore();
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<AssetType | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const tabs: { key: AssetType | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'image', label: 'Images' },
    { key: 'video', label: 'Videos' },
    { key: 'audio', label: 'Audio' },
    { key: 'text', label: 'Text' },
    { key: 'html', label: 'HTML' },
    { key: 'iframe', label: 'Embeds' },
  ];

  const filtered = assets.filter(a => {
    if (activeTab !== 'all' && a.type !== activeTab) return false;
    if (filter && !a.name.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const startRename = (asset: Asset) => {
    setEditingId(asset.id);
    setEditName(asset.name);
  };

  const finishRename = (id: string) => {
    if (editName.trim()) updateAsset(id, { name: editName.trim() });
    setEditingId(null);
  };

  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-[#0d1117]/95 backdrop-blur-2xl border-l border-white/[0.08] z-40 flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.5)]">
      <div className="p-4 border-b border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold text-white">Asset Library</span>
          <span className="text-[10px] text-neutral-500 bg-white/5 px-1.5 py-0.5 rounded-md">{assets.length}</span>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-4 h-4 text-neutral-400" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-white/[0.05]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
          <input
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-blue-500/40 placeholder:text-neutral-600"
            placeholder="Search assets..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-white/[0.05] overflow-x-auto">
        {tabs.map(t => (
          <button 
            key={t.key} 
            onClick={() => setActiveTab(t.key)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${activeTab === t.key ? 'bg-blue-500/20 text-blue-400' : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Asset List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-neutral-600 text-sm">
            {assets.length === 0 ? 'No assets yet. Save canvas items as assets!' : 'No matching assets.'}
          </div>
        )}
        {filtered.map(asset => (
          <div 
            key={asset.id} 
            className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl p-3 cursor-pointer group transition-all"
            onClick={() => onInsert(asset)}
          >
            <div className="flex items-center justify-between gap-2">
              {editingId === asset.id ? (
                <input 
                  autoFocus 
                  className="flex-1 bg-transparent text-white text-sm outline-none border-b border-blue-500/50"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={() => finishRename(asset.id)}
                  onKeyDown={e => { if (e.key === 'Enter') finishRename(asset.id); }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="text-sm font-medium text-neutral-200 truncate">{asset.name}</span>
              )}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => {e.stopPropagation(); startRename(asset);}} className="p-1 hover:bg-white/10 rounded text-neutral-500 hover:text-white transition-colors" title="Rename">
                  <Type className="w-3 h-3" />
                </button>
                <button onClick={(e) => {e.stopPropagation(); deleteAsset(asset.id);}} className="p-1 hover:bg-red-500/20 rounded text-neutral-500 hover:text-red-400 transition-colors" title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 bg-white/5 px-1.5 py-0.5 rounded">{asset.type}</span>
              {asset.data.url && !asset.data.url.startsWith('data:') && (
                <span className="text-[10px] text-neutral-600 truncate flex-1">{asset.data.url}</span>
              )}
              {asset.data.url?.startsWith('data:') && (
                <span className="text-[10px] text-neutral-600">Local file</span>
              )}
            </div>
            {/* Thumbnail preview for images */}
            {asset.type === 'image' && asset.data.url && (
              <div className="mt-2 h-16 rounded-lg overflow-hidden bg-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.data.url} alt={asset.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Smart Media Renderer ──────────────────────────────────────────
function SmartMediaRenderer({ item, isDragging, isResizing }: { item: CanvasItem; isDragging: boolean; isResizing: boolean }) {
  const assets = useStore(s => s.assets);
  
  // Resolve asset data if linked
  let renderData = item.data;
  if (item.assetId) {
    const asset = assets.find(a => a.id === item.assetId);
    if (asset) renderData = asset.data;
    else return <div className="w-full h-full flex items-center justify-center text-neutral-500 text-sm">Asset not found</div>;
  }

  switch (item.type) {
    case 'text':
      return null; // Text is handled separately (editable textarea)

    case 'image':
      return (
        <div className="w-full h-full relative rounded-xl overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={renderData.url} alt="Canvas Image" loading="lazy" className="w-full h-full object-cover pointer-events-none" />
        </div>
      );

    case 'video': {
      const embed = getEmbedInfo(renderData.url || '');
      if (embed.type === 'youtube' || embed.type === 'vimeo') {
        return (
          <div className="w-full h-full relative rounded-xl overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] bg-black">
            {(isDragging || isResizing) && <div className="absolute inset-0 z-10 bg-black/20" />}
            <iframe src={embed.embedUrl} className="w-full h-full border-none" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        );
      }
      return (
        <div className="w-full h-full relative rounded-xl overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] bg-black flex items-center justify-center">
          <video src={renderData.url} controls className="w-full h-full object-contain" />
        </div>
      );
    }

    case 'audio':
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-white/[0.05] to-transparent rounded-xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] p-6 gap-4">
          <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center shadow-inner border border-white/[0.05]">
            <Music className="w-8 h-8 text-neutral-400" />
          </div>
          <audio src={renderData.url} controls className="w-full max-w-md filter drop-shadow-lg" />
        </div>
      );

    case 'iframe':
      return (
        <div className="w-full h-full relative rounded-xl overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] bg-white">
          {(isDragging || isResizing) && <div className="absolute inset-0 z-10 bg-black/5" />}
          <iframe src={renderData.url} className="w-full h-full border-none" />
        </div>
      );

    case 'html':
      return (
        <div className="w-full h-full flex flex-col gap-2 overflow-hidden">
          <div className="flex-1 rounded-xl overflow-auto shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] bg-white/5 p-3">
            <div dangerouslySetInnerHTML={{ __html: renderData.html || '<p style="color:#666">Empty HTML block</p>' }} />
          </div>
        </div>
      );

    default:
      return <div className="w-full h-full flex items-center justify-center text-neutral-500 text-sm">Unknown type: {item.type}</div>;
  }
}

// ── Canvas Item Component ─────────────────────────────────────────
function CanvasItemComponent({ 
  nodeId, pageId, item, zoom, onSaveAsAsset 
}: { 
  nodeId: string; pageId: string; item: CanvasItem; zoom: number; onSaveAsAsset: (item: CanvasItem) => void;
}) {
  const { updateCanvasItem, deleteCanvasItem } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [resizeDelta, setResizeDelta] = useState({ w: 0, h: 0 });
  const [isEditingHtml, setIsEditingHtml] = useState(false);

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

  const isMoving = isDragging || isResizing;

  return (
    <div
      className={`absolute rounded-2xl border shadow-[0_8px_32px_rgba(0,0,0,0.5)] group ring-1 ring-white/[0.02] flex flex-col ${
        isMoving 
          ? 'z-50 border-blue-500/50 ring-blue-500/20 bg-[#0d1117]/80' 
          : 'z-10 border-white/[0.08] bg-[#0d1117]/90 backdrop-blur-3xl transition-shadow duration-200 hover:shadow-[0_20px_60px_rgba(0,0,0,0.8)]'
      }`}
      style={{
        left: item.x,
        top: item.y,
        width: isResizing ? currentWidth : item.width,
        height: isResizing ? currentHeight : item.height,
        transform: isDragging ? `translate(${dragDelta.x}px, ${dragDelta.y}px)` : undefined,
        willChange: isMoving ? 'transform' : undefined,
      }}
    >
      {/* Header Bar */}
      <div
        className="h-8 bg-gradient-to-b from-white/[0.08] to-transparent border-b border-white/[0.05] cursor-move flex justify-between items-center px-3 rounded-t-2xl shrink-0"
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={handleDragPointerUp}
      >
        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.2em]">
          {item.type}{item.assetId ? ' ⦿' : ''}
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={() => onSaveAsAsset(item)}
            className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-blue-400 transition-opacity p-1 rounded-md hover:bg-blue-500/20"
            title="Save as Asset"
          >
            <Package className="w-3 h-3" />
          </button>
          {item.type === 'html' && (
            <button
              onClick={() => setIsEditingHtml(!isEditingHtml)}
              className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-green-400 transition-opacity p-1 rounded-md hover:bg-green-500/20"
              title={isEditingHtml ? 'Preview' : 'Edit HTML'}
            >
              <Code className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => deleteCanvasItem(nodeId, pageId, item.id)}
            className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-opacity p-1 rounded-md hover:bg-red-500/20"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="w-full flex-1 overflow-hidden p-4 relative flex flex-col">
        {item.type === 'text' && (
          <textarea
            className="w-full h-full bg-transparent resize-none outline-none text-[15px] leading-relaxed text-neutral-200 placeholder:text-neutral-600 font-medium"
            value={item.data.text}
            placeholder="Type your notes here..."
            onChange={(e) => updateCanvasItem(nodeId, pageId, item.id, { data: { ...item.data, text: e.target.value } })}
          />
        )}
        {item.type === 'html' && isEditingHtml && (
          <textarea
            className="w-full h-full bg-[#0a0a0a] border border-white/10 rounded-lg resize-none outline-none text-[13px] leading-relaxed text-green-400 font-mono p-3 placeholder:text-neutral-600"
            value={item.data.html || ''}
            placeholder="<div>Your HTML here...</div>"
            onChange={(e) => updateCanvasItem(nodeId, pageId, item.id, { data: { ...item.data, html: e.target.value } })}
          />
        )}
        {(item.type !== 'text' && !(item.type === 'html' && isEditingHtml)) && (
          <SmartMediaRenderer item={item} isDragging={isDragging} isResizing={isResizing} />
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

// ── Main Node Editor ──────────────────────────────────────────────
export function NodeEditor() {
  const { activeNodeId, setActiveNode, nodes, addPage, deletePage, addCanvasItem, addAsset, assets } = useStore();
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const cameraRef = useRef(camera);

  // Dialogs
  const [urlDialog, setUrlDialog] = useState<{ type: CanvasItemType; title: string; placeholder: string; showUpload?: boolean } | null>(null);
  const [showAssetExplorer, setShowAssetExplorer] = useState(false);

  useEffect(() => { cameraRef.current = camera; }, [camera]);

  const node = activeNodeId ? nodes[activeNodeId] : null;

  // Wheel zoom/pan
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
    if (e.button === 1 || e.button === 2 || e.altKey) {
      e.preventDefault();
      setIsPanning(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) setCamera(prev => ({ ...prev, x: prev.x + e.movementX, y: prev.y + e.movementY }));
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) { setIsPanning(false); (e.target as HTMLElement).releasePointerCapture(e.pointerId); }
  };

  // Handle paste for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!activeNodeId || !activePage) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          const base64 = await readFileAsBase64(file);
          addCanvasItem(activeNodeId, activePage.id, {
            type: 'image',
            x: -camera.x / camera.zoom + 200,
            y: -camera.y / camera.zoom + 200,
            width: 400, height: 300,
            data: { url: base64 },
          });
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeNodeId, camera, addCanvasItem]);

  const handleUrlSubmit = useCallback((type: CanvasItemType, url: string) => {
    if (!activeNodeId || !effectivePageId) return;
    const baseX = -camera.x / camera.zoom + 200;
    const baseY = -camera.y / camera.zoom + 200;

    const dataMap: Record<string, any> = {
      image: { url },
      video: { url },
      audio: { url },
      iframe: { url },
      html: { html: '<div style="padding:16px;color:#ccc;font-family:sans-serif"><h2>Hello World</h2><p>Edit this HTML block.</p></div>' },
    };

    const sizeMap: Record<string, { w: number; h: number }> = {
      image: { w: 400, h: 300 },
      video: { w: 560, h: 315 },
      audio: { w: 320, h: 120 },
      iframe: { w: 500, h: 400 },
      html: { w: 400, h: 300 },
    };

    const size = sizeMap[type] || { w: 300, h: 200 };
    addCanvasItem(activeNodeId, effectivePageId, {
      type,
      x: baseX, y: baseY,
      width: size.w, height: size.h,
      data: dataMap[type] || { url },
    });
    setUrlDialog(null);
  }, [activeNodeId, camera, addCanvasItem]);

  const handleSaveAsAsset = useCallback((item: CanvasItem) => {
    const nameBase = item.type.charAt(0).toUpperCase() + item.type.slice(1);
    const name = `${nameBase} Asset ${new Date().toLocaleTimeString()}`;
    addAsset({ name, type: item.type as AssetType, data: { ...item.data } });
  }, [addAsset]);

  const handleInsertFromLibrary = useCallback((asset: Asset) => {
    if (!activeNodeId || !effectivePageId) return;
    const baseX = -camera.x / camera.zoom + 200;
    const baseY = -camera.y / camera.zoom + 200;

    const sizeMap: Record<string, { w: number; h: number }> = {
      image: { w: 400, h: 300 },
      video: { w: 560, h: 315 },
      audio: { w: 320, h: 120 },
      iframe: { w: 500, h: 400 },
      html: { w: 400, h: 300 },
      text: { w: 300, h: 200 },
    };

    const size = sizeMap[asset.type] || { w: 300, h: 200 };
    addCanvasItem(activeNodeId, effectivePageId, {
      type: asset.type as CanvasItemType,
      x: baseX, y: baseY,
      width: size.w, height: size.h,
      data: { ...asset.data },
      assetId: asset.id,
    });
    setShowAssetExplorer(false);
  }, [activeNodeId, camera, addCanvasItem]);

  if (!node) return null;

  const activePage = node.pages.find((p) => p.id === activePageId) || (node.pages.length > 0 ? node.pages[0] : null);
  const effectivePageId = activePage?.id || null;

  // ── Toolbar button definitions ──────────────────────────
  const toolbarButtons = [
    { 
      icon: Type, label: 'Text', 
      onClick: () => { if (activeNodeId && effectivePageId) addCanvasItem(activeNodeId, effectivePageId, { type: 'text', x: -camera.x / camera.zoom + 100, y: -camera.y / camera.zoom + 100, width: 300, height: 200, data: { text: '' } }); }
    },
    { 
      icon: ImageIcon, label: 'Image', 
      onClick: () => setUrlDialog({ type: 'image', title: 'Add Image', placeholder: 'Paste image URL or upload a file...', showUpload: true })
    },
    { 
      icon: LinkIcon, label: 'Embed', 
      onClick: () => setUrlDialog({ type: 'iframe', title: 'Add Embed', placeholder: 'Paste any URL to embed...' })
    },
    { 
      icon: Video, label: 'Video', 
      onClick: () => setUrlDialog({ type: 'video', title: 'Add Video', placeholder: 'YouTube, Vimeo, or direct video URL...' })
    },
    { 
      icon: Music, label: 'Audio', 
      onClick: () => setUrlDialog({ type: 'audio', title: 'Add Audio', placeholder: 'Paste audio URL (mp3, wav, etc.)...' })
    },
    { 
      icon: Code, label: 'HTML', 
      onClick: () => handleUrlSubmit('html', '')
    },
    { 
      icon: Package, label: 'Library', 
      onClick: () => setShowAssetExplorer(!showAssetExplorer),
      active: showAssetExplorer,
    },
  ];

  return (
    <AnimatePresence>
      {activeNodeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm">
          {/* Close */}
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
                    title="Add Page"
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
                        effectivePageId === page.id ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200 border border-transparent'
                      }`}
                      onClick={() => { setActivePageId(page.id); setCamera({ x: 0, y: 0, zoom: 1 }); }}
                    >
                      <span className="truncate font-medium">{page.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this page?')) {
                            deletePage(activeNodeId, page.id);
                            if (activePageId === page.id) setActivePageId(null);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-opacity p-1.5 rounded-md hover:bg-red-500/10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Infinite Canvas */}
              <div
                className="flex-1 relative bg-[#050505] overflow-hidden"
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onContextMenu={(e) => e.preventDefault()}
              >
                {/* Toolbar */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#0d1117]/90 backdrop-blur-3xl border border-white/[0.08] rounded-2xl px-3 py-3 flex gap-2 z-30 shadow-[0_20px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.02]">
                  {toolbarButtons.map(btn => (
                    <button
                      key={btn.label}
                      onClick={btn.onClick}
                      className={`w-16 h-16 hover:bg-white/[0.06] rounded-xl text-neutral-400 hover:text-white transition-all duration-200 flex flex-col items-center justify-center gap-1.5 group ${btn.active ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : ''}`}
                      title={`Add ${btn.label}`}
                    >
                      <btn.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-bold uppercase tracking-widest">{btn.label}</span>
                    </button>
                  ))}
                </div>

                {/* Canvas Content */}
                {activePage && (
                  <div className={`w-full h-full relative ${isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}>
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
                        backgroundSize: `${100 * camera.zoom}px ${100 * camera.zoom}px, ${100 * camera.zoom}px ${100 * camera.zoom}px, ${20 * camera.zoom}px ${20 * camera.zoom}px, ${20 * camera.zoom}px ${20 * camera.zoom}px`,
                        backgroundPosition: `${camera.x}px ${camera.y}px, ${camera.x}px ${camera.y}px, ${camera.x}px ${camera.y}px, ${camera.x}px ${camera.y}px`
                      }}
                    />

                    {/* Items Container */}
                    <div
                      className="absolute inset-0 transform-gpu"
                      style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`, transformOrigin: '0 0' }}
                    >
                      {activePage.items.map((item) => (
                        <CanvasItemComponent 
                          key={item.id} 
                          nodeId={activeNodeId} 
                          pageId={effectivePageId!} 
                          item={item} 
                          zoom={camera.zoom} 
                          onSaveAsAsset={handleSaveAsAsset}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Asset Explorer overlay */}
                {showAssetExplorer && (
                  <AssetExplorer onInsert={handleInsertFromLibrary} onClose={() => setShowAssetExplorer(false)} />
                )}
              </div>
            </div>
          </motion.div>

          {/* URL Input Dialog */}
          {urlDialog && (
            <UrlInputDialog
              title={urlDialog.title}
              placeholder={urlDialog.placeholder}
              showFileUpload={urlDialog.showUpload}
              onSubmit={(url) => handleUrlSubmit(urlDialog.type, url)}
              onCancel={() => setUrlDialog(null)}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
