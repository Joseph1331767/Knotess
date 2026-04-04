import { useStore, DEFAULT_EDITOR_SETTINGS } from '@/lib/store';
import { SettingRow, SettingSelect, SettingSlider, SettingNumber } from './controls';
import { RotateCcw } from 'lucide-react';

export function MechanicsSettings() {
  const { editorSettings, updateEditorSettings } = useStore();

  const resetSection = () => {
    updateEditorSettings({
      snapGridSize: DEFAULT_EDITOR_SETTINGS.snapGridSize,
      zoomSpeed: DEFAULT_EDITOR_SETTINGS.zoomSpeed,
      doubleClickBehavior: DEFAULT_EDITOR_SETTINGS.doubleClickBehavior,
      portSnapAngle: DEFAULT_EDITOR_SETTINGS.portSnapAngle,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <SettingRow label="Snap Grid Size">
        <SettingNumber 
          min={5} max={100} value={editorSettings.snapGridSize} 
          onChange={(v) => updateEditorSettings({ snapGridSize: v })}
        />
      </SettingRow>
      <SettingRow label="Zoom Speed">
        <SettingSlider 
          min={0.5} max={3.0} step={0.1} value={editorSettings.zoomSpeed} 
          onChange={(v) => updateEditorSettings({ zoomSpeed: v })}
          format={(v) => `${v.toFixed(1)}x`}
        />
      </SettingRow>
      <SettingRow label="Double-click Behavior">
        <SettingSelect 
          value={editorSettings.doubleClickBehavior} 
          onChange={(v) => updateEditorSettings({ doubleClickBehavior: v as any })}
          options={[
            { label: 'Zoom to Node', value: 'zoom' },
            { label: 'Edit Mode', value: 'edit' },
            { label: 'Both', value: 'both' },
          ]}
        />
      </SettingRow>
      <SettingRow label="Port Snap Angle">
        <SettingNumber 
          min={1} max={90} value={editorSettings.portSnapAngle} 
          onChange={(v) => updateEditorSettings({ portSnapAngle: v })}
        />
      </SettingRow>

      <button onClick={resetSection} className="mt-2 w-full py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-xs text-neutral-300 rounded transition-colors flex items-center justify-center gap-1.5">
        <RotateCcw className="w-3 h-3" /> Reset Section
      </button>
    </div>
  );
}
