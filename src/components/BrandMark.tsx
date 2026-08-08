export function BrandMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="hlBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#115067" />
          <stop offset="1" stopColor="#14CC9B" />
        </linearGradient>
      </defs>
      <rect x="3" y="5" width="4" height="14" rx="2" fill="url(#hlBarGrad)" />
      <rect x="10" y="2" width="4" height="20" rx="2" fill="url(#hlBarGrad)" />
      <rect x="17" y="7" width="4" height="12" rx="2" fill="url(#hlBarGrad)" />
      <rect x="1.5" y="8.7" width="7" height="2.6" rx="1.3" fill="#0A1F26" />
      <rect x="8.5" y="15.7" width="7" height="2.6" rx="1.3" fill="#0A1F26" />
      <rect x="15.5" y="10.7" width="7" height="2.6" rx="1.3" fill="#0A1F26" />
    </svg>
  );
}
