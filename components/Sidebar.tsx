'use client';

import { useStore } from '@/lib/store';
import { NodeTreePanel } from './NodeTreePanel';
import { FileExplorer } from './FileExplorer';
import { WorkspaceExplorer } from './WorkspaceExplorer';

export function Sidebar() {
  const { activeSidebarPanel } = useStore();

  if (!activeSidebarPanel) return null;

  return (
    <div className="w-64 bg-gradient-to-b from-[#0d1117] to-[#050505] backdrop-blur-2xl border-r border-white/[0.05] h-full z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)] overflow-hidden shrink-0 transition-all duration-300">
      {activeSidebarPanel === 'tree' && <NodeTreePanel />}
      {activeSidebarPanel === 'files' && <FileExplorer />}
      {activeSidebarPanel === 'workspaces' && <WorkspaceExplorer />}
    </div>
  );
}
