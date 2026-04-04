'use client';

import { useStore } from '@/lib/store';
import { FolderTree, Files, Boxes, Settings } from 'lucide-react';

export function ActivityBar() {
  const { activeSidebarPanel, setActiveSidebarPanel, isSettingsOpen, setIsSettingsOpen } = useStore();

  const handlePanelClick = (panel: 'tree' | 'files' | 'workspaces') => {
    if (activeSidebarPanel === panel) {
      setActiveSidebarPanel(null); // Collapse
    } else {
      setActiveSidebarPanel(panel);
    }
  };

  const getButtonClass = (panel: 'tree' | 'files' | 'workspaces') => {
    const isActive = activeSidebarPanel === panel;
    return `relative flex items-center justify-center w-12 h-12 transition-colors duration-200 group ${
      isActive ? 'text-white bg-white/[0.05]' : 'text-neutral-500 hover:text-neutral-300'
    }`;
  };

  const ActiveIndicator = ({ isActive }: { isActive: boolean }) => (
    isActive ? <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-blue-500 rounded-r-md transition-all duration-300" /> : null
  );

  return (
    <div className="w-12 h-full bg-[#050505] border-r border-white/[0.05] flex flex-col items-center py-4 z-30 shrink-0">
      
      {/* Top Icons */}
      <div className="flex flex-col flex-1 w-full gap-2 relative">
        <button 
          onClick={() => handlePanelClick('tree')}
          className={getButtonClass('tree')}
          title="Node Tree"
        >
          <ActiveIndicator isActive={activeSidebarPanel === 'tree'} />
          <FolderTree className="w-5 h-5" />
        </button>

        <button 
          onClick={() => handlePanelClick('files')}
          className={getButtonClass('files')}
          title="File Explorer"
        >
          <ActiveIndicator isActive={activeSidebarPanel === 'files'} />
          <Files className="w-5 h-5" />
        </button>

        <button 
          onClick={() => handlePanelClick('workspaces')}
          className={getButtonClass('workspaces')}
          title="Workspace Explorer"
        >
          <ActiveIndicator isActive={activeSidebarPanel === 'workspaces'} />
          <Boxes className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Icons */}
      <div className="flex flex-col w-full gap-2">
        <button 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className={`relative flex items-center justify-center w-12 h-12 transition-colors duration-200 ${
            isSettingsOpen ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
          }`}
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}
