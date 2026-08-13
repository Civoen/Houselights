"use client";
export function FirstVisitToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed left-6 right-6 top-[calc(env(safe-area-inset-top)+12px)] z-40 max-w-lg mx-auto animate-fade-slide-up">
      <div className="bg-navy text-white rounded-2xl pl-4 pr-3 py-3 shadow-xl flex items-start gap-3 text-left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5 text-green">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M12 8v.01M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className="text-xs font-semibold flex-1 leading-relaxed">{message}</p>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-white/70 flex-shrink-0 text-sm font-bold leading-none px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
