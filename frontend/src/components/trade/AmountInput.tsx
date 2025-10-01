"use client";

import { cn } from "@/lib/utils";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  tokenSymbol: string;
  label?: string;
  onMaxClick?: () => void;
  disabled?: boolean;
}

export default function AmountInput({
  value,
  onChange,
  tokenSymbol,
  label,
  onMaxClick,
  disabled = false,
}: AmountInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      onChange(val);
    }
  }

  return (
    <div>
      {label && (
        <label className="block text-xs text-white/30 font-jetbrains uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3 bg-cyber-black border border-white/10 rounded-sm transition-all duration-200",
          "focus-within:border-neon-cyan/40",
          disabled && "opacity-50"
        )}
      >
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="0.00"
          className="flex-1 bg-transparent text-white font-jetbrains text-lg outline-none placeholder:text-white/15"
        />
        <span className="text-sm font-orbitron text-white/50">{tokenSymbol}</span>
        {onMaxClick && (
          <button
            type="button"
            onClick={onMaxClick}
            className="px-2 py-0.5 text-[10px] font-jetbrains uppercase tracking-wider text-neon-cyan border border-neon-cyan/30 rounded-sm hover:bg-neon-cyan/10 transition-colors"
          >
            Max
          </button>
        )}
      </div>
    </div>
  );
}
