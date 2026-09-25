export function EqSpinner({ className = "" }: { className?: string }) {
  return (
    <span className={"inline-flex items-end gap-[2.5px] h-[14px] flex-shrink-0 " + className} aria-hidden="true">
      <span
        className="w-[3px] h-full bg-current rounded-full origin-bottom animate-eq-bounce"
        style={{ animationDelay: "0ms", animationDuration: "0.75s" }}
      />
      <span
        className="w-[3px] h-full bg-current rounded-full origin-bottom animate-eq-bounce"
        style={{ animationDelay: "150ms", animationDuration: "0.65s" }}
      />
      <span
        className="w-[3px] h-full bg-current rounded-full origin-bottom animate-eq-bounce"
        style={{ animationDelay: "300ms", animationDuration: "0.85s" }}
      />
    </span>
  );
}
