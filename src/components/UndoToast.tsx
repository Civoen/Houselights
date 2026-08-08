"use client";
export function UndoToast({
  message,
  onUndo,
  className = "",
}: {
  message: string;
  onUndo: () => void;
  className?: string;
}) {
  return (
    <div className={"fixed left-1/2 -translate-x-1/2 z-40 animate-fade-slide-up " + className}>
      <div className="bg-navy text-white text-xs font-semibold pl-4 pr-2 py-2.5 rounded-full shadow-lg flex items-center gap-3 whitespace-nowrap">
        <span>{message}</span>
        <button
          onClick={onUndo}
          className="text-green font-extrabold uppercase text-[11px] tracking-wide px-3 py-1.5 rounded-full transition-colors hover:bg-white/10 active:scale-95"
        >
          Undo
        </button>
      </div>
    </div>
  );
}
