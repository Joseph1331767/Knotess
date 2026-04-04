import { useStore, DEFAULT_EDITOR_SETTINGS } from '@/lib/store';
import { SettingRow, SettingSelect, SettingColorBox } from './controls';
import { RotateCcw } from 'lucide-react';

const THEME_PRESETS: Record<string, Partial<typeof DEFAULT_EDITOR_SETTINGS>> = {
  midnight: {
    colorPrimary: '#3b82f6', colorSecondary: '#8b5cf6', colorTertiary: '#10b981', colorBackground: '#0d1117', colorNodeBg: '#1e293b', colorText: '#f8fafc', colorAccent: '#38bdf8'
  },
  ocean: {
    colorPrimary: '#0369a1', colorSecondary: '#0284c7', colorTertiary: '#0ea5e9', colorBackground: '#0c1222', colorNodeBg: '#152b47', colorText: '#e0f2fe', colorAccent: '#7dd3fc'
  },
  forest: {
    colorPrimary: '#166534', colorSecondary: '#15803d', colorTertiary: '#22c55e', colorBackground: '#0a1a0a', colorNodeBg: '#14301a', colorText: '#dcfce7', colorAccent: '#86efac'
  },
  ember: {
    colorPrimary: '#c2410c', colorSecondary: '#ea580c', colorTertiary: '#f97316', colorBackground: '#1a0a05', colorNodeBg: '#361608', colorText: '#ffedd5', colorAccent: '#fdba74'
  },
};

export function ColorThemeSettings() {
  const { editorSettings, updateEditorSettings } = useStore();

  const resetSection = () => {
    updateEditorSettings({
      colorPrimary: DEFAULT_EDITOR_SETTINGS.colorPrimary,
      colorSecondary: DEFAULT_EDITOR_SETTINGS.colorSecondary,
      colorTertiary: DEFAULT_EDITOR_SETTINGS.colorTertiary,
      colorBackground: DEFAULT_EDITOR_SETTINGS.colorBackground,
      colorNodeBg: DEFAULT_EDITOR_SETTINGS.colorNodeBg,
      colorText: DEFAULT_EDITOR_SETTINGS.colorText,
      colorAccent: DEFAULT_EDITOR_SETTINGS.colorAccent,
      themePreset: DEFAULT_EDITOR_SETTINGS.themePreset,
    });
  };

  const handlePresetChange = (preset: string) => {
    if (THEME_PRESETS[preset]) {
      updateEditorSettings({ ...THEME_PRESETS[preset], themePreset: preset });
    } else {
      updateEditorSettings({ themePreset: preset });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <SettingRow label="Theme Preset">
        <SettingSelect 
          value={editorSettings.themePreset} 
          onChange={handlePresetChange}
          options={[
            { label: 'Midnight', value: 'midnight' },
            { label: 'Ocean', value: 'ocean' },
            { label: 'Forest', value: 'forest' },
            { label: 'Ember', value: 'ember' },
            { label: 'Custom', value: 'custom' },
          ]}
        />
      </SettingRow>

      <div className="h-px w-full bg-white/[0.05] my-1" />

      <SettingRow label="Primary">
        <SettingColorBox value={editorSettings.colorPrimary} onChange={(v) => updateEditorSettings({ colorPrimary: v, themePreset: 'custom' })} />
      </SettingRow>
      <SettingRow label="Secondary">
        <SettingColorBox value={editorSettings.colorSecondary} onChange={(v) => updateEditorSettings({ colorSecondary: v, themePreset: 'custom' })} />
      </SettingRow>
      <SettingRow label="Tertiary">
        <SettingColorBox value={editorSettings.colorTertiary} onChange={(v) => updateEditorSettings({ colorTertiary: v, themePreset: 'custom' })} />
      </SettingRow>
      <SettingRow label="App Background">
        <SettingColorBox value={editorSettings.colorBackground} onChange={(v) => updateEditorSettings({ colorBackground: v, themePreset: 'custom' })} />
      </SettingRow>
      <SettingRow label="Node Background">
        <SettingColorBox value={editorSettings.colorNodeBg} onChange={(v) => updateEditorSettings({ colorNodeBg: v, themePreset: 'custom' })} />
      </SettingRow>
      <SettingRow label="Text Color">
        <SettingColorBox value={editorSettings.colorText} onChange={(v) => updateEditorSettings({ colorText: v, themePreset: 'custom' })} />
      </SettingRow>
      <SettingRow label="Accent">
        <SettingColorBox value={editorSettings.colorAccent} onChange={(v) => updateEditorSettings({ colorAccent: v, themePreset: 'custom' })} />
      </SettingRow>

      <button onClick={resetSection} className="mt-2 w-full py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-xs text-neutral-300 rounded transition-colors flex items-center justify-center gap-1.5">
        <RotateCcw className="w-3 h-3" /> Reset Section
      </button>
    </div>
  );
}
