'use client';

import { useStore } from '@/lib/store';
import { Plus, Minus, Maximize, Eye } from 'lucide-react';
import { useState } from 'react';

export function ZoomControls() {
  const { camera, setCamera } = useStore();
  const editorSettings = useStore(s => s.editorSettings);
  const updateEditorSettings = useStore(s => s.updateEditorSettings);
  const [showSlider, setShowSlider] = useState(false);

  const zoomIn = () => {
    const newZoom = Math.min(camera.zoom * 1.3, 1000);
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    const scaleChange = newZoom / camera.zoom;
    setCamera({
      x: screenCenterX - (screenCenterX - camera.x) * scaleChange,
      y: screenCenterY - (screenCenterY - camera.y) * scaleChange,
      zoom: newZoom,
    });
  };

  const zoomOut = () => {
    const newZoom = Math.max(camera.zoom / 1.3, 0.0001);
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    const scaleChange = newZoom / camera.zoom;
    setCamera({
      x: screenCenterX - (screenCenterX - camera.x) * scaleChange,
      y: screenCenterY - (screenCenterY - camera.y) * scaleChange,
      zoom: newZoom,
    });
  };

  const fitToView = () => {
    setCamera({ x: window.innerWidth / 2, y: window.innerHeight / 2, zoom: 1 });
  };

  const zoomPercent = Math.round(camera.zoom * 100);
  const refZoom = editorSettings.referenceZoom ?? 1.0;

  return (
    <div className="absolute bottom-6 right-6 z-30 flex flex-col items-end gap-2">
      {/* Reference Zoom Slider (expandable) */}
      {showSlider && (
        <div className="bg-[#0d1117]/90 backdrop-blur-2xl border border-white/[0.08] rounded-xl px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.02] flex flex-col gap-1.5 min-w-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Detail Level</span>
            <span className="text-[11px] font-mono text-neutral-400">{Math.round(refZoom * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.3"
            max="3.0"
            step="0.05"
            value={refZoom}
            onChange={(e) => updateEditorSettings({ referenceZoom: parseFloat(e.target.value) })}
            className="w-full h-1 appearance-none bg-white/[0.08] rounded-full cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(59,130,246,0.5)]"
          />
          <div className="flex justify-between text-[9px] text-neutral-600">
            <span>Overview</span>
            <span>Detail</span>
          </div>
        </div>
      )}

      {/* Main zoom bar */}
      <div className="bg-[#0d1117]/90 backdrop-blur-2xl border border-white/[0.08] rounded-xl px-2 py-1.5 flex items-center gap-1 shadow-[0_8px_32px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.02]">
        <button
          onClick={zoomOut}
          className="p-1.5 hover:bg-white/[0.08] rounded-lg text-neutral-400 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-mono text-neutral-400 min-w-[40px] text-center select-none">
          {zoomPercent}%
        </span>
        <button
          onClick={zoomIn}
          className="p-1.5 hover:bg-white/[0.08] rounded-lg text-neutral-400 hover:text-white transition-colors"
          title="Zoom In"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-white/[0.08] mx-0.5" />
        <button
          onClick={() => setShowSlider(!showSlider)}
          className={`p-1.5 hover:bg-white/[0.08] rounded-lg transition-colors ${showSlider ? 'text-blue-400' : 'text-neutral-400 hover:text-white'}`}
          title="Detail Level — Controls how zoomed-in you are when clicking nodes"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-white/[0.08] mx-0.5" />
        <button
          onClick={fitToView}
          className="p-1.5 hover:bg-white/[0.08] rounded-lg text-neutral-400 hover:text-white transition-colors"
          title="Fit to View"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
