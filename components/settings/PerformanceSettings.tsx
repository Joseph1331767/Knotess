import { useStore, DEFAULT_EDITOR_SETTINGS } from '@/lib/store';
import { SettingRow, SettingNumber } from './controls';
import { RotateCcw, AlertTriangle } from 'lucide-react';

export function PerformanceSettings() {
  const { editorSettings, updateEditorSettings } = useStore();

  const resetSection = () => {
    updateEditorSettings({
      lodThresholds: DEFAULT_EDITOR_SETTINGS.lodThresholds,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex gap-3 text-yellow-500/90 items-start">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="text-[11px] leading-relaxed">
          Changing Level of Detail (LOD) thresholds affects rendering performance. Lower values cull details sooner when zooming out.
        </p>
      </div>

      <SettingRow label="Culled Max Threshold">
        <SettingNumber 
          min={1} max={50} value={editorSettings.lodThresholds.culledMax} 
          onChange={(v) => updateEditorSettings({ lodThresholds: { ...editorSettings.lodThresholds, culledMax: v } })}
        />
      </SettingRow>
      <SettingRow label="Star Max Threshold">
        <SettingNumber 
          min={10} max={100} value={editorSettings.lodThresholds.starMax} 
          onChange={(v) => updateEditorSettings({ lodThresholds: { ...editorSettings.lodThresholds, starMax: v } })}
        />
      </SettingRow>
      <SettingRow label="Compact Max Threshold">
        <SettingNumber 
          min={30} max={200} value={editorSettings.lodThresholds.compactMax} 
          onChange={(v) => updateEditorSettings({ lodThresholds: { ...editorSettings.lodThresholds, compactMax: v } })}
        />
      </SettingRow>

      <div className="mt-2 p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
        <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2 font-bold">Current Effective Values</div>
        <div className="flex justify-between text-xs text-neutral-400">
          <span>Culled: &lt; {editorSettings.lodThresholds.culledMax}px</span>
          <span>Star: &lt; {editorSettings.lodThresholds.starMax}px</span>
        </div>
        <div className="flex justify-between text-xs text-neutral-400 mt-1">
          <span>Compact: &lt; {editorSettings.lodThresholds.compactMax}px</span>
          <span>Full: &gt; {editorSettings.lodThresholds.compactMax}px</span>
        </div>
      </div>

      <button onClick={resetSection} className="mt-2 w-full py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-xs text-neutral-300 rounded transition-colors flex items-center justify-center gap-1.5">
        <RotateCcw className="w-3 h-3" /> Reset Section
      </button>
    </div>
  );
}
