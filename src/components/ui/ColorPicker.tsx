'use client';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium opacity-70">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
          aria-label={label}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
              onChange(v);
            }
          }}
          className="w-20 rounded bg-white/10 px-2 py-0.5 text-xs font-mono"
          maxLength={7}
          aria-label={`${label} hex value`}
        />
      </div>
    </div>
  );
}
