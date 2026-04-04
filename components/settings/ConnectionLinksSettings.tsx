import { useStore, DEFAULT_EDITOR_SETTINGS } from '@/lib/store';
import { SettingRow, SettingSelect, SettingSlider, SettingToggle, SettingColorBox } from './controls';
import { RotateCcw } from 'lucide-react';

export function ConnectionLinksSettings() {
  const { editorSettings, updateEditorSettings } = useStore();

  const resetSection = () => {
    updateEditorSettings({
      linkStyle: DEFAULT_EDITOR_SETTINGS.linkStyle,
      linkThickness: DEFAULT_EDITOR_SETTINGS.linkThickness,
      linkColors: DEFAULT_EDITOR_SETTINGS.linkColors,
      linkAnimation: DEFAULT_EDITOR_SETTINGS.linkAnimation,
      linkArrowHeads: DEFAULT_EDITOR_SETTINGS.linkArrowHeads,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <SettingRow label="Link Style">
        <SettingSelect 
          value={editorSettings.linkStyle} 
          onChange={(v) => updateEditorSettings({ linkStyle: v as any })}
          options={[
            { label: 'Bezier', value: 'bezier' },
            { label: 'Straight', value: 'straight' },
            { label: 'Step', value: 'step' },
          ]}
        />
      </SettingRow>
      <SettingRow label="Thickness">
        <SettingSlider 
          min={1} max={8} value={editorSettings.linkThickness} 
          onChange={(v) => updateEditorSettings({ linkThickness: v })}
          format={(v) => `${v}px`}
        />
      </SettingRow>
      <SettingRow label="Child Link Color">
        <SettingColorBox 
          value={editorSettings.linkColors.child} 
          onChange={(v) => updateEditorSettings({ linkColors: { ...editorSettings.linkColors, child: v } })}
        />
      </SettingRow>
      <SettingRow label="Sister Link Color">
        <SettingColorBox 
          value={editorSettings.linkColors.sister} 
          onChange={(v) => updateEditorSettings({ linkColors: { ...editorSettings.linkColors, sister: v } })}
        />
      </SettingRow>
      <SettingRow label="Tunnel Link Color">
        <SettingColorBox 
          value={editorSettings.linkColors.tunnel} 
          onChange={(v) => updateEditorSettings({ linkColors: { ...editorSettings.linkColors, tunnel: v } })}
        />
      </SettingRow>
      <SettingRow label="Route Link Color">
        <SettingColorBox 
          value={editorSettings.linkColors.route} 
          onChange={(v) => updateEditorSettings({ linkColors: { ...editorSettings.linkColors, route: v } })}
        />
      </SettingRow>
      <SettingRow label="Buss Link Color">
        <SettingColorBox 
          value={editorSettings.linkColors.buss} 
          onChange={(v) => updateEditorSettings({ linkColors: { ...editorSettings.linkColors, buss: v } })}
        />
      </SettingRow>
      <SettingRow label="Animation">
        <SettingSelect 
          value={editorSettings.linkAnimation} 
          onChange={(v) => updateEditorSettings({ linkAnimation: v as any })}
          options={[
            { label: 'Flow Dots', value: 'flow-dots' },
            { label: 'None', value: 'none' },
          ]}
        />
      </SettingRow>
      <SettingRow label="Arrow Heads">
        <SettingToggle 
          value={editorSettings.linkArrowHeads} 
          onChange={(v) => updateEditorSettings({ linkArrowHeads: v })}
        />
      </SettingRow>

      <button onClick={resetSection} className="mt-2 w-full py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-xs text-neutral-300 rounded transition-colors flex items-center justify-center gap-1.5">
        <RotateCcw className="w-3 h-3" /> Reset Section
      </button>
    </div>
  );
}
