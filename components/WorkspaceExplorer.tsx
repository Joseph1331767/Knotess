'use client';

import { useState, useEffect } from 'react';
import { useStore, Workspace } from '@/lib/store';
import { FolderPlus, FolderOpen, FolderClosed, MoreVertical, Edit2, Trash2, File as FileIcon, X } from 'lucide-react';
import { createWorkspace, listWorkspaces, renameWorkspace, deleteWorkspace, addFileToWorkspace, removeFileFromWorkspace } from '@/lib/fileRegistry';

export function WorkspaceExplorer() {
  const { fileRegistry, currentFileId, switchFile } = useStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
  
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<{ type: 'workspace' | 'file'; id: string; workspaceId?: string } | null>(null);

  const loadWorkspaces = async () => {
    const data = await listWorkspaces();
    setWorkspaces(data);
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const handleCreateWorkspace = async () => {
    await createWorkspace('New Workspace');
    await loadWorkspaces();
  };

  const handleRenameWorkspace = async (id: string, newName: string) => {
    if (newName.trim() !== '') {
      await renameWorkspace(id, newName.trim());
      await loadWorkspaces();
    }
    setEditingWorkspaceId(null);
    setContextMenuTarget(null);
  };

  const handleDeleteWorkspace = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this workspace? (Files inside will not be deleted)')) {
      await deleteWorkspace(id);
      await loadWorkspaces();
    }
    setContextMenuTarget(null);
  };

  const handleAddCurrentFileToWorkspace = async (workspaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentFileId) {
      await addFileToWorkspace(workspaceId, currentFileId);
      await loadWorkspaces();
      if (!expandedWorkspaces.has(workspaceId)) {
        toggleWorkspace(workspaceId);
      }
    }
    setContextMenuTarget(null);
  };

  const handleRemoveFileFromWorkspace = async (workspaceId: string, fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeFileFromWorkspace(workspaceId, fileId);
    await loadWorkspaces();
    setContextMenuTarget(null);
  };

  const toggleWorkspace = (workspaceId: string) => {
    setExpandedWorkspaces(prev => {
      const next = new Set(prev);
      if (next.has(workspaceId)) next.delete(workspaceId);
      else next.add(workspaceId);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full text-neutral-200">
      <div className="px-3 py-2 border-b border-white/[0.05] flex justify-between items-center shadow-sm">
        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest break-all">
          WORKSPACES
        </span>
        <button 
          onClick={handleCreateWorkspace} 
          className="p-1.5 hover:bg-white/[0.08] rounded-md transition-colors text-neutral-400 hover:text-white"
          title="New Workspace"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {workspaces.length === 0 ? (
          <div className="p-4 text-center text-sm text-neutral-500">
            No workspaces yet. Create one to organize files.
          </div>
        ) : (
          <div className="flex flex-col px-2">
            {workspaces.map(workspace => {
              const isExpanded = expandedWorkspaces.has(workspace.id);
              const isEditing = editingWorkspaceId === workspace.id;
              const isContextMenuOpen = contextMenuTarget?.type === 'workspace' && contextMenuTarget.id === workspace.id;

              return (
                <div key={workspace.id} className="flex flex-col mb-1">
                  {/* Workspace Header */}
                  <div 
                    className="relative group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/[0.04] transition-colors"
                    onClick={() => {
                      if (!isEditing && !isContextMenuOpen) toggleWorkspace(workspace.id);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenuTarget({ type: 'workspace', id: workspace.id });
                    }}
                    onMouseLeave={() => setContextMenuTarget(null)}
                  >
                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                      {isExpanded ? <FolderOpen className="w-4 h-4 text-neutral-400" /> : <FolderClosed className="w-4 h-4 text-neutral-400" />}
                      
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={workspace.name}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameWorkspace(workspace.id, e.currentTarget.value);
                            if (e.key === 'Escape') setEditingWorkspaceId(null);
                          }}
                          onBlur={(e) => handleRenameWorkspace(workspace.id, e.target.value)}
                          className="flex-1 bg-[#161b22] border border-blue-500/50 rounded px-1.5 py-0.5 text-sm text-white outline-none w-full"
                        />
                      ) : (
                        <span className="text-[13px] font-medium text-neutral-300 truncate">
                          {workspace.name}
                        </span>
                      )}
                      
                      {!isEditing && <span className="text-[10px] text-neutral-500 ml-1">({workspace.fileIds.length})</span>}
                    </div>

                    {!isEditing && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenuTarget(isContextMenuOpen ? null : { type: 'workspace', id: workspace.id });
                        }}
                        className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                          isContextMenuOpen ? 'opacity-100 bg-white/[0.1]' : 'hover:bg-white/[0.1]'
                        }`}
                      >
                        <MoreVertical className="w-3 h-3 text-neutral-400" />
                      </button>
                    )}

                    {/* Workspace Context Menu */}
                    {isContextMenuOpen && (
                      <div className="absolute left-8 top-8 w-44 bg-[#161b22] border border-white/[0.1] shadow-xl rounded-lg py-1 z-50">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingWorkspaceId(workspace.id); setContextMenuTarget(null); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.08] flex items-center gap-2"
                        >
                          <Edit2 className="w-3 h-3" /> Rename
                        </button>
                        <button 
                          onClick={(e) => handleAddCurrentFileToWorkspace(workspace.id, e)}
                          disabled={!currentFileId || workspace.fileIds.includes(currentFileId)}
                          className="w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.08] disabled:opacity-50 flex items-center gap-2"
                        >
                          <FolderPlus className="w-3 h-3" /> Add Current File
                        </button>
                        <div className="h-px bg-white/[0.05] my-1" />
                        <button 
                          onClick={(e) => handleDeleteWorkspace(workspace.id, e)}
                          className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 flex items-center gap-2"
                        >
                          <Trash2 className="w-3 h-3" /> Delete Workspace
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Workspace Files */}
                  {isExpanded && (
                    <div className="flex flex-col ml-5 border-l border-white/[0.05] pl-2 mt-1 space-y-0.5">
                      {workspace.fileIds.map(fileId => {
                        const file = fileRegistry.find(f => f.id === fileId);
                        if (!file) return null; // File might have been deleted

                        const isFileActive = file.id === currentFileId;
                        const isFileMenuOpen = contextMenuTarget?.type === 'file' && contextMenuTarget.id === file.id && contextMenuTarget.workspaceId === workspace.id;

                        return (
                          <div 
                            key={file.id} 
                            className={`relative group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                              isFileActive ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-white/[0.04] text-neutral-400'
                            }`}
                            onClick={() => switchFile(file.id)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenuTarget({ type: 'file', id: file.id, workspaceId: workspace.id });
                            }}
                            onMouseLeave={() => setContextMenuTarget(null)}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileIcon className="w-3 h-3 opacity-70" />
                              <span className="text-xs truncate">{file.name}</span>
                            </div>

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setContextMenuTarget(isFileMenuOpen ? null : { type: 'file', id: file.id, workspaceId: workspace.id });
                              }}
                              className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                                isFileMenuOpen ? 'opacity-100 bg-white/[0.1]' : 'hover:bg-white/[0.1]'
                              }`}
                            >
                              <MoreVertical className="w-3 h-3" />
                            </button>

                            {/* File Context Menu */}
                            {isFileMenuOpen && (
                              <div className="absolute right-2 top-6 w-36 bg-[#161b22] border border-white/[0.1] shadow-xl rounded-lg py-1 z-50">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); switchFile(file.id); setContextMenuTarget(null); }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:bg-blue-500/20 flex items-center gap-2"
                                >
                                  <FileIcon className="w-3 h-3" /> Open File
                                </button>
                                <button 
                                  onClick={(e) => handleRemoveFileFromWorkspace(workspace.id, file.id, e)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 flex items-center gap-2"
                                >
                                  <X className="w-3 h-3" /> Remove from Workspace
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {workspace.fileIds.length === 0 && (
                        <div className="px-2 py-1 text-[10px] text-neutral-500 italic">
                          No files
                        </div>
                      )}
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
