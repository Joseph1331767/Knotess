'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Folder, ChevronRight, ChevronDown, Search, FolderTree } from 'lucide-react';

export function NodeTreePanel() {
  const { nodes, selectedNodeIds, selectNode, updateNode, fileRegistry, currentFileId } = useStore();
  const [searchQuery, setSearchQuery] = useState('');

  const currentFile = fileRegistry.find(f => f.id === currentFileId);

  const searchVisited = new Set<string>();
  const matchCache = new Map<string, boolean>();

  const nodeMatchesSearch = (nodeId: string, query: string): boolean => {
    if (!query) return true;
    if (matchCache.has(nodeId)) return matchCache.get(nodeId)!;
    if (searchVisited.has(nodeId)) return false; // Break cycles
    searchVisited.add(nodeId);

    const node = nodes[nodeId];
    if (!node) return false;
    const lowerQuery = query.toLowerCase();

    let result = false;
    if (node.title.toLowerCase().includes(lowerQuery) || node.description.toLowerCase().includes(lowerQuery)) {
      result = true;
    } else {
      result = node.childrenIds.some((childId) => nodeMatchesSearch(childId, lowerQuery));
    }
    matchCache.set(nodeId, result);
    return result;
  };

  const renderVisited = new Set<string>();

  const renderTree = (nodeId: string, depth: number) => {
    if (renderVisited.has(nodeId)) return null;
    renderVisited.add(nodeId);

    const node = nodes[nodeId];
    if (!node) return null;

    if (searchQuery && !nodeMatchesSearch(nodeId, searchQuery)) return null;

    const isSelected = selectedNodeIds.includes(nodeId);
    const hasChildren = node.childrenIds.length > 0;

    return (
      <div key={nodeId} className="flex flex-col">
        <div
          className={`flex items-center py-2 px-3 cursor-pointer rounded-lg transition-colors duration-200 ${
            isSelected ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'hover:bg-white/[0.04] text-neutral-400 hover:text-neutral-200 border border-transparent'
          }`}
          style={{ marginLeft: `${depth * 12}px` }}
          onClick={() => selectNode(nodeId)}
        >
          <div 
            className="w-4 h-4 mr-1 flex items-center justify-center"
            onClick={(e) => {
              if (hasChildren) {
                e.stopPropagation();
                updateNode(nodeId, { isExpanded: !node.isExpanded });
              }
            }}
          >
            {hasChildren ? (
              node.isExpanded ? <ChevronDown className="w-3.5 h-3.5 opacity-70 hover:opacity-100" /> : <ChevronRight className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
            ) : (
              <div className="w-3.5 h-3.5" />
            )}
          </div>
          <Folder className={`w-4 h-4 mr-2 ${isSelected ? 'text-blue-400' : 'opacity-50'}`} />
          <span className="text-[13px] font-medium truncate">{node.title}</span>
        </div>
        {node.isExpanded && node.childrenIds.map((childId) => renderTree(childId, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-white/[0.05] flex items-center shadow-sm">
        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest break-all">
          NODES {currentFile ? `> ${currentFile.name}` : ''}
        </span>
      </div>
      <div className="px-3 py-2 border-b border-white/[0.05]">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 group-focus-within:text-blue-400 transition-colors" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {Object.values(nodes)
          .filter(node => node.parentId === null)
          .map(node => renderTree(node.id, 0))}
      </div>
    </div>
  );
}
