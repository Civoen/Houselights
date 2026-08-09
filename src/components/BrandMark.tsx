export function BrandMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  const height = size;
  const width = size * (136 / 205);

  return (
    <svg width={width} height={height} viewBox="0 0 136 205" fill="none" className={className}>
      <rect x="6" width="28" height="205" rx="14" fill="url(#hlLogoGradA)" />
      <rect x="102" width="28" height="205" rx="14" fill="url(#hlLogoGradB)" />
      <rect x="54" y="40" width="28" height="125" rx="14" fill="url(#hlLogoGradC)" />
      <rect y="82" width="40" height="29" rx="5" fill="url(#hlLogoGradD)" />
      <rect x="48" y="116" width="40" height="29" rx="5" fill="url(#hlLogoGradE)" />
      <rect x="96" y="53" width="40" height="29" rx="5" fill="url(#hlLogoGradF)" />
      <defs>
        <linearGradient id="hlLogoGradA" x1="14.5556" y1="205" x2="16.0212" y2="0.00491954" gradientUnits="userSpaceOnUse">
          <stop stopColor="#115067" />
          <stop offset="1" stopColor="#14CC9B" />
        </linearGradient>
        <linearGradient id="hlLogoGradB" x1="110.556" y1="205" x2="112.021" y2="0.00491954" gradientUnits="userSpaceOnUse">
          <stop stopColor="#115067" />
          <stop offset="1" stopColor="#14CC9B" />
        </linearGradient>
        <linearGradient id="hlLogoGradC" x1="62.5556" y1="165" x2="63.1005" y2="39.999" gradientUnits="userSpaceOnUse">
          <stop stopColor="#115067" />
          <stop offset="1" stopColor="#14CC9B" />
        </linearGradient>
        <linearGradient id="hlLogoGradD" x1="12.2222" y1="111" x2="12.2428" y2="81.9992" gradientUnits="userSpaceOnUse">
          <stop stopColor="#115067" />
          <stop offset="1" stopColor="#14CC9B" />
        </linearGradient>
        <linearGradient id="hlLogoGradE" x1="60.2222" y1="145" x2="60.2428" y2="115.999" gradientUnits="userSpaceOnUse">
          <stop stopColor="#115067" />
          <stop offset="1" stopColor="#14CC9B" />
        </linearGradient>
        <linearGradient id="hlLogoGradF" x1="108.222" y1="82" x2="108.243" y2="52.9992" gradientUnits="userSpaceOnUse">
          <stop stopColor="#115067" />
          <stop offset="1" stopColor="#14CC9B" />
        </linearGradient>
      </defs>
    </svg>
  );
}
