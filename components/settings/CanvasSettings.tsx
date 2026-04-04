import { useStore, DEFAULT_EDITOR_SETTINGS } from '@/lib/store';
import { SettingRow, SettingSelect, SettingToggle, SettingColorBox } from './controls';
import { RotateCcw } from 'lucide-react';

export function CanvasSettings() {
  const { editorSettings, updateEditorSettings } = useStore();

  const resetSection = () => {
    updateEditorSettings({
      backgroundPattern: DEFAULT_EDITOR_SETTINGS.backgroundPattern,
      backgroundColor: DEFAULT_EDITOR_SETTINGS.backgroundColor,
      minimapVisible: DEFAULT_EDITOR_SETTINGS.minimapVisible,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <SettingRow label="Background Pattern">
        <SettingSelect 
          value={editorSettings.backgroundPattern} 
          onChange={(v) => updateEditorSettings({ backgroundPattern: v as any })}
          options={[
            { label: 'Dots', value: 'dots' },
            { label: 'Grid', value: 'grid' },
            { label: 'None', value: 'none' },
          ]}
        />
      </SettingRow>
      <SettingRow label="Background Color">
        <SettingColorBox 
          value={editorSettings.backgroundColor} 
          onChange={(v) => updateEditorSettings({ backgroundColor: v })}
        />
      </SettingRow>
      <SettingRow label="Show Minimap">
        <SettingToggle 
          value={editorSettings.minimapVisible} 
          onChange={(v) => updateEditorSettings({ minimapVisible: v })}
        />
      </SettingRow>

      <button onClick={resetSection} className="mt-2 w-full py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-xs text-neutral-300 rounded transition-colors flex items-center justify-center gap-1.5">
        <RotateCcw className="w-3 h-3" /> Reset Section
      </button>
    </div>
  );
}
