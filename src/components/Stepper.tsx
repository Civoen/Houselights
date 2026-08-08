"use client";
export function Stepper({ value, onChange, min = 1, max = 100 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-6 h-6 rounded-full border border-lineStrong bg-surfaceAlt text-muted text-sm font-bold flex items-center justify-center"
      >
        −
      </button>
      <span className="w-5 text-center font-display text-sm font-bold">{value}</span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-6 h-6 rounded-full border border-lineStrong bg-surfaceAlt text-muted text-sm font-bold flex items-center justify-center"
      >
        +
      </button>
    </div>
  );
}
