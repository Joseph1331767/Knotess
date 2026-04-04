import { ReactNode } from 'react';

export function SettingRow({ label, children, vertical = false }: { label: string, children: ReactNode, vertical?: boolean }) {
  if (vertical) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs text-neutral-400">{label}</label>
        <div className="w-full">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-center">
      <label className="text-xs text-neutral-400">{label}</label>
      <div className="w-3/5 flex justify-end">
        {children}
      </div>
    </div>
  );
}

export function SettingSlider({ value, onChange, min, max, step = 1, format }: { value: number, onChange: (val: number) => void, min: number, max: number, step?: number, format?: (v: number) => string | number }) {
  return (
    <div className="flex items-center gap-3 w-full">
      <input 
        type="range" 
        min={min} max={max} step={step} 
        value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-blue-500 h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer"
      />
      <span className="text-xs text-neutral-300 w-8 text-right shrink-0">{format ? format(value) : value}</span>
    </div>
  );
}

export function SettingSelect({ value, onChange, options }: { value: string, onChange: (val: string) => void, options: {label: string, value: string}[] }) {
  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="bg-neutral-800/80 border border-white/[0.05] text-white text-xs rounded-md px-2 py-1.5 w-full outline-none focus:border-blue-500/50"
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  );
}

export function SettingToggle({ value, onChange }: { value: boolean, onChange: (val: boolean) => void }) {
  return (
    <button 
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${value ? 'bg-blue-500' : 'bg-neutral-700'}`}
    >
      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ease-in-out ${value ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  );
}

export function SettingColorBox({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  return (
    <div className="relative w-full h-7 rounded-md border border-white/[0.1] overflow-hidden flex items-center justify-center">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" />
      <div className="w-full h-full relative" style={{ backgroundColor: value }}>
        {/* If color has alpha, it doesn't matter for input type="color", but we'll show it. Input type="color" only supports hex without alpha. */}
      </div>
      <span className="absolute z-0 pointer-events-none text-[10px] text-white/70 bg-black/30 px-1 rounded uppercase mix-blend-difference">{value}</span>
    </div>
  );
}

export function SettingNumber({ value, onChange, min, max }: { value: number, onChange: (val: number) => void, min?: number, max?: number }) {
  return (
    <input 
      type="number" 
      min={min} max={max}
      value={value} 
      onChange={(e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val)) return;
        onChange(val);
      }}
      className="bg-neutral-800/80 border border-white/[0.05] text-white text-xs rounded-md px-2 py-1 w-full text-right outline-none focus:border-blue-500/50"
    />
  );
}
