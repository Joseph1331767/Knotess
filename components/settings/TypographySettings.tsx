import { useStore, DEFAULT_EDITOR_SETTINGS } from '@/lib/store';
import { SettingRow, SettingSelect, SettingSlider } from './controls';
import { RotateCcw } from 'lucide-react';

export function TypographySettings() {
  const { editorSettings, updateEditorSettings } = useStore();

  const resetSection = () => {
    updateEditorSettings({
      fontFamily: DEFAULT_EDITOR_SETTINGS.fontFamily,
      fontSizeScale: DEFAULT_EDITOR_SETTINGS.fontSizeScale,
      lineHeight: DEFAULT_EDITOR_SETTINGS.lineHeight,
      letterSpacing: DEFAULT_EDITOR_SETTINGS.letterSpacing,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <SettingRow label="Font Family">
        <SettingSelect 
          value={editorSettings.fontFamily} 
          onChange={(v) => updateEditorSettings({ fontFamily: v })}
          options={[
            { label: 'Inter', value: 'Inter, sans-serif' },
            { label: 'Roboto', value: 'Roboto, sans-serif' },
            { label: 'Outfit', value: 'Outfit, sans-serif' },
            { label: 'Fira Code', value: '"Fira Code", monospace' },
            { label: 'System', value: 'system-ui, sans-serif' },
          ]}
        />
      </SettingRow>
      <SettingRow label="Font Size Scale">
        <SettingSlider 
          min={0.5} max={2.0} step={0.1} value={editorSettings.fontSizeScale} 
          onChange={(v) => updateEditorSettings({ fontSizeScale: v })}
          format={(v) => `${v.toFixed(1)}x`}
        />
      </SettingRow>
      <SettingRow label="Line Height">
        <SettingSlider 
          min={1.0} max={2.5} step={0.1} value={editorSettings.lineHeight} 
          onChange={(v) => updateEditorSettings({ lineHeight: v })}
          format={(v) => v.toFixed(1)}
        />
      </SettingRow>
      <SettingRow label="Letter Spacing">
        <SettingSlider 
          min={-2} max={5} step={0.5} value={editorSettings.letterSpacing} 
          onChange={(v) => updateEditorSettings({ letterSpacing: v })}
          format={(v) => `${v}px`}
        />
      </SettingRow>

      <button onClick={resetSection} className="mt-2 w-full py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-xs text-neutral-300 rounded transition-colors flex items-center justify-center gap-1.5">
        <RotateCcw className="w-3 h-3" /> Reset Section
      </button>
    </div>
  );
}
