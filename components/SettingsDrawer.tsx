'use client';

import { useStore } from '@/lib/store';
import { X, RotateCcw } from 'lucide-react';
import { ConnectionLinksSettings } from './settings/ConnectionLinksSettings';
import { ColorThemeSettings } from './settings/ColorThemeSettings';
import { TypographySettings } from './settings/TypographySettings';
import { VisualEffectsSettings } from './settings/VisualEffectsSettings';
import { MechanicsSettings } from './settings/MechanicsSettings';
import { CanvasSettings } from './settings/CanvasSettings';
import { PerformanceSettings } from './settings/PerformanceSettings';
import { useState } from 'react';

function Accordion({ title, children }: { title: string, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.05]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-5 py-3.5 text-sm font-semibold text-neutral-300 hover:text-white hover:bg-white/[0.02] flex justify-between items-center transition-colors focus:outline-none"
      >
        {title}
        <span className={`text-neutral-500 text-[10px] transform transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-5 pb-5 pt-1">
          {children}
        </div>
      </div>
    </div>
  );
}

export function SettingsDrawer() {
  const { isSettingsOpen, setIsSettingsOpen, resetEditorSettings, fileRegistry, currentFileId, setFileSettingOverride, clearAllFileSettingOverrides } = useStore();
  const currentFile = fileRegistry.find(f => f.id === currentFileId);
  const hasOverrides = currentFile?.settingsOverrides && Object.keys(currentFile.settingsOverrides).length > 0;

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[380px] z-50 
        bg-[#0d1117]/85 backdrop-blur-xl border-l border-white/[0.08]
        shadow-[-20px_0_60px_rgba(0,0,0,0.6)] flex flex-col
        transform transition-transform duration-300 ease-out
        ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
    >
      <div className="h-14 border-b border-white/[0.08] flex items-center justify-between px-5 shrink-0 bg-white/[0.02]">
        <h2 className="font-bold text-sm tracking-widest uppercase text-neutral-200">Settings</h2>
        <div className="flex items-center gap-3">
          {hasOverrides && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">File Overrides Active</span>
              <button 
                onClick={() => {
                  if (currentFileId) {
                    clearAllFileSettingOverrides(currentFileId);
                  }
                }}
                title="Clear file overrides"
                className="p-1 hover:bg-white/[0.1] rounded text-neutral-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}
          <button 
            onClick={() => setIsSettingsOpen(false)}
            className="p-1.5 hover:bg-white/[0.1] rounded-md text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-white/[0.05] shadow-inner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin' }}>
        <Accordion title="Color & Themes">
          <ColorThemeSettings />
        </Accordion>
        <Accordion title="Canvas">
          <CanvasSettings />
        </Accordion>
        <Accordion title="Connection Links">
          <ConnectionLinksSettings />
        </Accordion>
        <Accordion title="Visual Effects">
          <VisualEffectsSettings />
        </Accordion>
        <Accordion title="Typography">
          <TypographySettings />
        </Accordion>
        <Accordion title="Mechanics">
          <MechanicsSettings />
        </Accordion>
        <Accordion title="Performance & LOD">
          <PerformanceSettings />
        </Accordion>
      </div>

      <div className="p-5 border-t border-white/[0.08] shrink-0 bg-white/[0.02]">
        <button 
          onClick={() => {
            if(window.confirm('Reset all settings to default values?')) {
              resetEditorSettings();
            }
          }}
          className="w-full py-2.5 bg-[#1a0f0f] hover:bg-[#301010] text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset All to Defaults
        </button>
      </div>
    </div>
  );
}
