'use client';

import { useStore } from '@/lib/store';
import { Folder, Settings, ChevronRight, ChevronDown } from 'lucide-react';

export function Sidebar() {
  console.log('Sidebar rendered');
  const { nodes, rootNodeId, selectNode, selectedNodeIds, updateNode } = useStore();

  const renderTree = (nodeId: string, depth: number) => {
    const node = nodes[nodeId];
    if (!node) return null;

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
    <div className="w-72 bg-gradient-to-b from-[#0d1117] to-[#050505] backdrop-blur-2xl border-r border-white/[0.05] flex flex-col h-full z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)] relative">
      <div className="p-5 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.02] shadow-sm">
        <h2 className="font-bold text-[11px] tracking-[0.2em] uppercase text-neutral-400">Explorer</h2>
        <button className="p-1.5 hover:bg-white/[0.08] rounded-md text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-white/[0.05] shadow-inner" onClick={() => console.log('Settings clicked')}>
          <Settings className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {Object.values(nodes)
          .filter(node => node.parentId === null)
          .map(node => renderTree(node.id, 0))}
      </div>
    </div>
  );
}
