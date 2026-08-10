"use client";
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-6 h-6 rounded-full border border-lineStrong bg-surfaceAlt text-muted text-sm font-bold flex items-center justify-center transition-transform duration-100 active:scale-90 hover:border-accent hover:text-accent"
      >
        −
      </button>
      <span key={value} className="min-w-[1.75rem] text-center font-display text-sm font-bold animate-pop-in">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-6 h-6 rounded-full border border-lineStrong bg-surfaceAlt text-muted text-sm font-bold flex items-center justify-center transition-transform duration-100 active:scale-90 hover:border-accent hover:text-accent"
      >
        +
      </button>
    </div>
  );
}
