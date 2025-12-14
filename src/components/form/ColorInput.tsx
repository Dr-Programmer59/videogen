import { Input } from "../ui/input";

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ColorInput({ value, onChange, disabled }: ColorInputProps) {
  return (
    <div className="flex gap-2 items-center">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-12 h-10 rounded-lg border border-border bg-secondary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="#000000"
        pattern="^#[0-9A-Fa-f]{6}$"
        className="flex-1 font-mono bg-secondary border-border"
      />
    </div>
  );
}
