"use client";

import { cn } from "@/lib/utils";
import { EXPIRATION_OPTIONS } from "@/lib/constants";
import type { ExpirationOption } from "@/types";

interface ExpirationPickerProps {
  selected: ExpirationOption;
  onSelect: (value: ExpirationOption) => void;
}

export default function ExpirationPicker({
  selected,
  onSelect,
}: ExpirationPickerProps) {
  return (
    <div>
      <label className="block text-xs text-white/30 font-jetbrains uppercase tracking-wider mb-2">
        Expiration
      </label>
      <div className="flex flex-wrap gap-2">
        {EXPIRATION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-jetbrains uppercase tracking-wider border rounded-sm transition-all duration-200",
              selected === opt.value
                ? "border-neon-cyan/60 text-neon-cyan bg-neon-cyan/10"
                : "border-white/10 text-white/40 hover:border-neon-cyan/30 hover:text-white/60"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
