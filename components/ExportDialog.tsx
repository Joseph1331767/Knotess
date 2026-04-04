'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { X, ImageIcon, Code, Download, Loader2 } from 'lucide-react';
import { renderGraphToImage } from '@/lib/imageExport';

interface ExportDialogProps {
  onClose: () => void;
}

export function ExportDialog({ onClose }: ExportDialogProps) {
  const [activeTab, setActiveTab] = useState<'image' | 'viewer'>('image');
  
  // Image states
  const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [quality, setQuality] = useState(0.92);
  const [isExporting, setIsExporting] = useState(false);

  const { nodes, rootNodeId, editorSettings, assets } = useStore();

  const handleExportImage = async () => {
    setIsExporting(true);
    try {
      const container = document.querySelector('.editor-canvas') as HTMLElement;
      if (!container) throw new Error("Canvas container not found");
      
      const blob = await renderGraphToImage({
        format,
        quality,
        canvasContainer: container
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `knotess-export-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to export image.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateViewer = async () => {
    setIsExporting(true);
    try {
      // Fetch the standalone viewer html
      const res = await fetch('/viewer.html');
      let html = await res.text();

      // Inject the serialized state by replacing the placeholder
      const stateDump = { nodes, rootNodeId, editorSettings, assets };
      const placeholder = '<script id="graph-data" type="application/json">{}</script>';
      const payload = `<script id="graph-data" type="application/json">${JSON.stringify(stateDump)}</script>`;
      
      if (html.includes(placeholder)) {
        html = html.replace(placeholder, payload);
      } else {
        // Fallback if the placeholder is slightly different
        const regex = /<script id="graph-data" type="application\/json">[\s\S]*?<\/script>/;
        html = html.replace(regex, payload);
      }

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `knotess-viewer-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to generate HTML viewer. Make sure the viewer has been built.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="bg-[#161b22] border border-white/[0.1] shadow-2xl rounded-xl w-[480px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.1] bg-white/[0.02]">
          <h2 className="text-sm font-semibold text-neutral-200">Export Graph</h2>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white hover:bg-white/[0.1] rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Export Format</label>
            <div className="flex flex-col gap-3 mt-2">
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${activeTab === 'image' && format === 'jpeg' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]'}`}>
                <input 
                  type="radio" 
                  name="format" 
                  value="jpeg" 
                  checked={activeTab === 'image' && format === 'jpeg'} 
                  onChange={() => { setActiveTab('image'); setFormat('jpeg'); }} 
                  className="accent-blue-500 w-4 h-4"
                /> 
                <div>
                  <div className="text-sm font-medium text-neutral-200">JPEG Image</div>
                  <div className="text-xs text-neutral-500">Standard flat image of the current view</div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${activeTab === 'image' && format === 'png' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]'}`}>
                <input 
                  type="radio" 
                  name="format" 
                  value="png" 
                  checked={activeTab === 'image' && format === 'png'} 
                  onChange={() => { setActiveTab('image'); setFormat('png'); }} 
                  className="accent-blue-500 w-4 h-4"
                /> 
                <div>
                  <div className="text-sm font-medium text-neutral-200">PNG Image</div>
                  <div className="text-xs text-neutral-500">Lossless flat image of the current view</div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${activeTab === 'viewer' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]'}`}>
                <input 
                  type="radio" 
                  name="format" 
                  value="viewer" 
                  checked={activeTab === 'viewer'} 
                  onChange={() => setActiveTab('viewer')} 
                  className="accent-blue-500 w-4 h-4"
                /> 
                <div>
                  <div className="text-sm font-medium text-blue-400 flex items-center gap-2">
                    <Code className="w-4 h-4" /> Single-File HTML Viewer
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">Generates a fully bundled, interactive .html file containing your entire graph and assets. Perfect for sharing.</div>
                </div>
              </label>
            </div>
          </div>

          {activeTab === 'image' && format === 'jpeg' && (
            <div className="flex flex-col gap-2 p-4 bg-white/[0.02] rounded-lg border border-white/[0.05]">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-neutral-300">JPEG Quality</label>
                <span className="text-xs font-mono text-neutral-400 bg-black/50 px-2 py-0.5 rounded">{Math.round(quality * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="100" 
                value={quality * 100} 
                onChange={(e) => setQuality(Number(e.target.value) / 100)} 
                className="w-full accent-blue-500"
              />
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button 
              onClick={onClose}
              disabled={isExporting}
              className="flex-1 py-3 bg-white/[0.05] hover:bg-white/[0.1] text-white rounded-lg font-semibold text-sm transition-all border border-white/[0.1] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button 
              onClick={activeTab === 'viewer' ? handleGenerateViewer : handleExportImage}
              disabled={isExporting}
              className="flex-[2] flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-400/20"
            >
              {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              {isExporting ? 'Generating Export...' : activeTab === 'viewer' ? 'Download HTML Project' : 'Download Image'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
