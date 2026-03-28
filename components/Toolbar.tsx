'use client';

import { useStore } from '@/lib/store';
import { Undo, Redo, Scissors, Copy, ClipboardPaste, PlusCircle, Save, Download, Upload, Crosshair, Plus, FilePlus, RefreshCw, Magnet } from 'lucide-react';

export function Toolbar() {
  const { undo, redo, cut, copy, paste, addNode, save, selectedNodeIds, nodes, rootNodeId, setCamera, clear, isSnapEnabled, toggleSnap } = useStore();

  const handleNew = async () => {
    console.log('New Project button clicked');
    try {
      await clear();
      console.log('Project cleared successfully');
    } catch (err) {
      console.error('Failed to clear project:', err);
    }
  };

  const handleResetApp = async () => {
    console.log('Reset App button clicked');
    try {
      await import('idb-keyval').then(mod => mod.clear());
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset app:', err);
    }
  };

  const handleAddNode = () => {
    const parentId = selectedNodeIds.length > 0 ? selectedNodeIds[0] : null;
    addNode(parentId, 200, 200);
  };

  const handleCenterView = () => {
    setCamera({ x: window.innerWidth / 2, y: window.innerHeight / 2, zoom: 1 });
  };

  const handleExport = () => {
    const data = JSON.stringify({ nodes, rootNodeId }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'node-graph-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            if (data.nodes && data.rootNodeId) {
              useStore.setState({ nodes: data.nodes, rootNodeId: data.rootNodeId, past: [], future: [], selectedNodeIds: [] });
              save();
            }
          } catch (err) {
            console.error('Failed to import file', err);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="h-14 bg-[#0d1117]/90 backdrop-blur-2xl border-b border-white/[0.05] flex items-center px-6 gap-2 z-10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative">
      <div className="flex items-center gap-1 bg-white/[0.02] p-1 rounded-lg border border-white/[0.05] shadow-inner">
        <button onClick={handleNew} className="px-3 py-2 hover:bg-white/[0.08] rounded-lg text-neutral-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium" title="New Project">
          <FilePlus className="w-4 h-4" />
          <span>New</span>
        </button>
        <div className="w-px h-4 bg-white/[0.05] mx-1" />
        <button onClick={undo} className="p-2 hover:bg-white/[0.08] rounded-md text-neutral-400 hover:text-white transition-colors" title="Undo">
          <Undo className="w-4 h-4" />
        </button>
        <button onClick={redo} className="p-2 hover:bg-white/[0.08] rounded-md text-neutral-400 hover:text-white transition-colors" title="Redo">
          <Redo className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-center gap-1 bg-white/[0.02] p-1 rounded-lg border border-white/[0.05] shadow-inner ml-2">
        <button onClick={cut} className="p-2 hover:bg-white/[0.08] rounded-md text-neutral-400 hover:text-white transition-colors" title="Cut">
          <Scissors className="w-4 h-4" />
        </button>
        <button onClick={copy} className="p-2 hover:bg-white/[0.08] rounded-md text-neutral-400 hover:text-white transition-colors" title="Copy">
          <Copy className="w-4 h-4" />
        </button>
        <button onClick={() => paste(selectedNodeIds[0] || null, 100, 100)} className="p-2 hover:bg-white/[0.08] rounded-md text-neutral-400 hover:text-white transition-colors" title="Paste">
          <ClipboardPaste className="w-4 h-4" />
        </button>
      </div>
      
      <div className="w-px h-6 bg-white/[0.05] mx-2" />
      
      <button onClick={handleAddNode} className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded-lg transition-colors flex items-center gap-2 font-medium text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" title="Add Node">
        <PlusCircle className="w-4 h-4" />
        <span>Add Node</span>
      </button>

      <button onClick={handleCenterView} className="px-3 py-2 hover:bg-white/[0.08] rounded-lg text-neutral-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium" title="Center View">
        <Crosshair className="w-4 h-4" />
        <span>Center</span>
      </button>

      <button 
        onClick={toggleSnap} 
        className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border ${
          isSnapEnabled 
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' 
            : 'hover:bg-white/[0.08] text-neutral-400 hover:text-white border-transparent'
        }`} 
        title="Toggle Snap to Grid"
      >
        <Magnet className={`w-4 h-4 ${isSnapEnabled ? 'animate-pulse' : ''}`} />
        <span>Snap</span>
      </button>
      
      <div className="flex-1" />
      
      <div className="flex items-center gap-2">
        <button onClick={handleResetApp} className="px-3 py-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 text-sm font-medium border border-red-500/20" title="Reset App (Nuclear Option)">
          <RefreshCw className="w-4 h-4" />
          <span>Reset App</span>
        </button>
        <div className="w-px h-4 bg-white/[0.05] mx-1" />
        <button onClick={handleImport} className="px-3 py-2 hover:bg-white/[0.08] rounded-lg text-neutral-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium" title="Import">
          <Upload className="w-4 h-4" />
          <span>Import</span>
        </button>
        <button onClick={handleExport} className="px-3 py-2 hover:bg-white/[0.08] rounded-lg text-neutral-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium" title="Export">
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
        <div className="w-px h-4 bg-white/[0.05] mx-1" />
        <button onClick={save} className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/[0.05]" title="Save">
          <Save className="w-4 h-4" />
          <span>Save</span>
        </button>
      </div>
    </div>
  );
}
