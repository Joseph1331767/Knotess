'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { FilePlus, File, MoreVertical, Edit2, Copy, Trash2, ArrowUpDown } from 'lucide-react';
import { duplicateFile, renameFile, deleteFile } from '@/lib/fileRegistry';

export function FileExplorer() {
  const { fileRegistry, currentFileId, switchFile, createNewFile } = useStore();
  const [sortOrder, setSortOrder] = useState<'date' | 'name'>('date');
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [contextMenuFileId, setContextMenuFileId] = useState<string | null>(null);

  const sortedFiles = [...fileRegistry].sort((a, b) => {
    if (sortOrder === 'name') {
      return a.name.localeCompare(b.name);
    }
    return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
  });

  const handleDuplicate = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await duplicateFile(id, `${name} (Copy)`);
    // After duplicating, trigger store refresh
    // We can do this efficiently by switching to the current file to reload the registry, Wait, duplicating just adds to DB. We need to sync registry to store.
    const freshReg = await navigator.locks.request('knotess-registry', async () => await import('@/lib/fileRegistry').then(m => m.listFiles()));
    useStore.setState({ fileRegistry: freshReg });
    setContextMenuFileId(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this file? This cannot be undone.')) {
      if (id === currentFileId) {
        useStore.getState().deleteCurrentFile();
      } else {
        await deleteFile(id);
        const freshReg = await import('@/lib/fileRegistry').then(m => m.listFiles());
        useStore.setState({ fileRegistry: freshReg });
      }
    }
    setContextMenuFileId(null);
  };

  const handleRename = async (id: string, newName: string) => {
    if (newName.trim() !== '') {
      await renameFile(id, newName.trim());
      const freshReg = await import('@/lib/fileRegistry').then(m => m.listFiles());
      useStore.setState({ fileRegistry: freshReg });
    }
    setEditingFileId(null);
    setContextMenuFileId(null);
  };

  return (
    <div className="flex flex-col h-full text-neutral-200">
      <div className="px-3 py-2 border-b border-white/[0.05] flex justify-between items-center shadow-sm">
        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest break-all">
          FILES
        </span>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setSortOrder(prev => prev === 'date' ? 'name' : 'date')} 
            className="p-1.5 hover:bg-white/[0.08] rounded-md transition-colors text-neutral-400 hover:text-white"
            title={`Sort by ${sortOrder === 'date' ? 'Name' : 'Date'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => createNewFile('Untitled Graph')} 
            className="p-1.5 hover:bg-white/[0.08] rounded-md transition-colors text-neutral-400 hover:text-white"
            title="New File"
          >
            <FilePlus className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2">
        {fileRegistry.length === 0 ? (
          <div className="p-4 text-center text-sm text-neutral-500">
            No files yet. Create one to get started.
          </div>
        ) : (
          <div className="flex flex-col space-y-0.5 px-2">
            {sortedFiles.map(file => {
              const isActive = file.id === currentFileId;
              const isEditing = editingFileId === file.id;
              const isContextMenuOpen = contextMenuFileId === file.id;

              return (
                <div 
                  key={file.id} 
                  className={`relative group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isActive 
                      ? 'bg-blue-500/10 border border-blue-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' 
                      : 'hover:bg-white/[0.04] border border-transparent'
                  }`}
                  onClick={() => {
                    if (!isEditing && !isContextMenuOpen) switchFile(file.id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!isEditing) setContextMenuFileId(file.id);
                  }}
                  onMouseLeave={() => setContextMenuFileId(null)}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <File className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-neutral-500 group-hover:text-neutral-400'}`} />
                    
                    {isEditing ? (
                      <input
                        autoFocus
                        defaultValue={file.name}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(file.id, e.currentTarget.value);
                          if (e.key === 'Escape') setEditingFileId(null);
                        }}
                        onBlur={(e) => handleRename(file.id, e.target.value)}
                        className="flex-1 bg-[#161b22] border border-blue-500/50 rounded px-1.5 py-0.5 text-sm text-white outline-none w-full"
                      />
                    ) : (
                      <div className="flex flex-col overflow-hidden">
                        <span className={`text-[13px] font-medium truncate ${isActive ? 'text-blue-100' : 'text-neutral-300'}`}>
                          {file.name}
                        </span>
                        <span className="text-[10px] text-neutral-500 truncate">
                          {new Date(file.modifiedAt).toLocaleDateString()} {new Date(file.modifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenuFileId(isContextMenuOpen ? null : file.id);
                      }}
                      className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                        isContextMenuOpen ? 'opacity-100 bg-white/[0.1]' : 'hover:bg-white/[0.1]'
                      }`}
                    >
                      <MoreVertical className="w-3.5 h-3.5 text-neutral-400" />
                    </button>
                  )}

                  {/* Context Menu Popup */}
                  {isContextMenuOpen && (
                    <div className="absolute right-2 top-10 w-36 bg-[#161b22] border border-white/[0.1] shadow-xl rounded-lg py-1 z-50 overflow-hidden">
                      <button 
                        onClick={(e) => { e.stopPropagation(); switchFile(file.id); setContextMenuFileId(null); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:bg-blue-500/20 hover:text-blue-100 flex items-center gap-2"
                      >
                        <File className="w-3 h-3" /> Open
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingFileId(file.id); setContextMenuFileId(null); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.08] hover:text-white flex items-center gap-2"
                      >
                        <Edit2 className="w-3 h-3" /> Rename
                      </button>
                      <button 
                        onClick={(e) => handleDuplicate(file.id, file.name, e)}
                        className="w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.08] hover:text-white flex items-center gap-2"
                      >
                        <Copy className="w-3 h-3" /> Duplicate
                      </button>
                      <div className="h-px bg-white/[0.05] my-1" />
                      <button 
                        onClick={(e) => handleDelete(file.id, e)}
                        className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300 flex items-center gap-2"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
