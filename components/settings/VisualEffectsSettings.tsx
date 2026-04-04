import { useStore, DEFAULT_EDITOR_SETTINGS } from '@/lib/store';
import { SettingRow, SettingSlider, SettingToggle, SettingNumber } from './controls';
import { RotateCcw } from 'lucide-react';

export function VisualEffectsSettings() {
  const { editorSettings, updateEditorSettings } = useStore();

  const resetSection = () => {
    updateEditorSettings({
      gridVisible: DEFAULT_EDITOR_SETTINGS.gridVisible,
      gridOpacity: DEFAULT_EDITOR_SETTINGS.gridOpacity,
      gridSize: DEFAULT_EDITOR_SETTINGS.gridSize,
      nodeBlur: DEFAULT_EDITOR_SETTINGS.nodeBlur,
      nodeBorderRadius: DEFAULT_EDITOR_SETTINGS.nodeBorderRadius,
      nodeShadowIntensity: DEFAULT_EDITOR_SETTINGS.nodeShadowIntensity,
      glowEffects: DEFAULT_EDITOR_SETTINGS.glowEffects,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <SettingRow label="Grid Visible">
        <SettingToggle 
          value={editorSettings.gridVisible} 
          onChange={(v) => updateEditorSettings({ gridVisible: v })}
        />
      </SettingRow>
      <SettingRow label="Grid Opacity">
        <SettingSlider 
          min={0} max={1} step={0.01} value={editorSettings.gridOpacity} 
          onChange={(v) => updateEditorSettings({ gridOpacity: v })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      </SettingRow>
      <SettingRow label="Grid Size">
        <SettingNumber 
          min={10} max={200} value={editorSettings.gridSize} 
          onChange={(v) => updateEditorSettings({ gridSize: v })}
        />
      </SettingRow>
      
      <div className="h-px w-full bg-white/[0.05] my-1" />

      <SettingRow label="Node Blur">
        <SettingSlider 
          min={0} max={20} step={1} value={editorSettings.nodeBlur} 
          onChange={(v) => updateEditorSettings({ nodeBlur: v })}
          format={(v) => `${v}px`}
        />
      </SettingRow>
      <SettingRow label="Node Border Radius">
        <SettingSlider 
          min={0} max={24} step={1} value={editorSettings.nodeBorderRadius} 
          onChange={(v) => updateEditorSettings({ nodeBorderRadius: v })}
          format={(v) => `${v}px`}
        />
      </SettingRow>
      <SettingRow label="Node Shadow Intensity">
        <SettingSlider 
          min={0} max={1} step={0.05} value={editorSettings.nodeShadowIntensity} 
          onChange={(v) => updateEditorSettings({ nodeShadowIntensity: v })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      </SettingRow>
      <SettingRow label="Glow Effects">
        <SettingToggle 
          value={editorSettings.glowEffects} 
          onChange={(v) => updateEditorSettings({ glowEffects: v })}
        />
      </SettingRow>

      <button onClick={resetSection} className="mt-2 w-full py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-xs text-neutral-300 rounded transition-colors flex items-center justify-center gap-1.5">
        <RotateCcw className="w-3 h-3" /> Reset Section
      </button>
    </div>
  );
}
