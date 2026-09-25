"use client";

export function FirstVisitToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed left-6 right-6 top-[calc(env(safe-area-inset-top)+12px)] z-50 max-w-lg mx-auto animate-fade-slide-up">
      <div className="bg-navy text-white rounded-2xl pl-4 pr-2 py-2.5 shadow-xl flex items-center gap-3">
        <span className="flex-1 text-xs font-semibold leading-snug">{message}</span>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white/70 transition-colors hover:bg-white/10 active:scale-90"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
