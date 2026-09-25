"use client";
import { WristbandIconKey, WristbandPattern } from "@/lib/wristbands";

function Glyph({ icon, color }: { icon: WristbandIconKey; color: string }) {
  switch (icon) {
    case "play":
      return <path d="M53 27l14 9-14 9z" fill={color} />;
    case "five":
      return (
        <text x="60" y="43" textAnchor="middle" fontSize="20" fontWeight="800" fill={color}>
          5
        </text>
      );
    case "calendar":
      return (
        <>
          <rect x="47" y="27" width="26" height="20" rx="4" fill="none" stroke={color} strokeWidth="2.2" />
          <path d="M52 27v-5a3.5 3.5 0 017 0v5M61 27v-5a3.5 3.5 0 017 0v5" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        </>
      );
    case "crown":
      return <path d="M46 46l3-14 8 7 3-9 3 9 8-7 3 14z" fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />;
    case "flag":
      return (
        <>
          <path d="M50 24v24" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M50 25c4-3 8-3 12 0s8 3 12 0v11c-4 3-8 3-12 0s-8-3-12 0z" fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
        </>
      );
    case "tickets":
      return (
        <>
          <rect x="44" y="29" width="19" height="14" rx="3" fill="none" stroke={color} strokeWidth="2" />
          <rect x="53" y="35" width="19" height="14" rx="3" fill="none" stroke={color} strokeWidth="2" />
        </>
      );
  }
}

function PatternDef({ id, type }: { id: string; type: WristbandPattern }) {
  if (type === "dots") {
    return (
      <pattern id={id} width="13" height="13" patternUnits="userSpaceOnUse">
        <circle cx="3.5" cy="3.5" r="1.3" fill="white" fillOpacity="0.32" />
        <circle cx="10" cy="9" r="1.3" fill="white" fillOpacity="0.28" />
      </pattern>
    );
  }
  if (type === "stars") {
    return (
      <pattern id={id} width="17" height="17" patternUnits="userSpaceOnUse">
        <path d="M4 0.5l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="white" fillOpacity="0.3" />
        <path d="M13 8l0.6 1.8 1.8 0.6-1.8 0.6-0.6 1.8-0.6-1.8-1.8-0.6 1.8-0.6z" fill="white" fillOpacity="0.26" />
      </pattern>
    );
  }
  return (
    <pattern id={id} width="15" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
      <line x1="0" y1="7.5" x2="15" y2="7.5" stroke="white" strokeOpacity="0.28" strokeWidth="2" />
    </pattern>
  );
}

// Lightens a hex color toward white by the given amount (0-1), for the
// curved band's top-edge highlight.
function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * amount));
  const g = Math.min(255, Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * amount));
  const b = Math.min(255, Math.round((n & 255) + (255 - (n & 255)) * amount));
  return `rgb(${r},${g},${b})`;
}

// Darkens a hex color toward black by the given amount (0-1), for the
// curved band's bottom-edge shadow.
function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amount));
  const g = Math.round(((n >> 8) & 255) * (1 - amount));
  const b = Math.round((n & 255) * (1 - amount));
  return `rgb(${r},${g},${b})`;
}

// A curved horizontal band with a beveled metallic badge at its center —
// modeled on a real event wristband: woven fabric texture and a slight
// wrap-around gradient on the band, a brushed-metal bevel on the badge
// with a soft shine catching the light. Deliberately colorful and
// distinct per wristband (a real departure from the rest of the app's
// single-gradient look) rather than themed to match; locked wristbands
// stay plain grey/outline until earned, so the material treatment reads
// as a genuine payoff rather than being always-on decoration.
export function WristbandIcon({
  icon,
  unlocked,
  color,
  pattern,
  gradientId,
  width = 120,
}: {
  icon: WristbandIconKey;
  unlocked: boolean;
  color: string;
  pattern: WristbandPattern;
  gradientId: string;
  width?: number;
}) {
  const height = (width * 72) / 120;
  const patternId = `${gradientId}-pattern`;
  const fabricId = `${gradientId}-fabric`;
  const metalId = `${gradientId}-metal`;
  const shineId = `${gradientId}-shine`;
  const bandPath = "M4 20 C4 8 116 8 116 20 L116 52 C116 64 4 64 4 52 Z";

  if (!unlocked) {
    return (
      <svg width={width} height={height} viewBox="0 0 120 72">
        <path d={bandPath} fill="#FFFFFF" stroke="#D8DCDA" strokeWidth="2" />
        <rect x="42" y="18" width="36" height="36" rx="8" fill="#F1F2F0" stroke="#D8DCDA" strokeWidth="1.5" />
        <Glyph icon={icon} color="#93A0AB" />
      </svg>
    );
  }

  return (
    <svg width={width} height={height} viewBox="0 0 120 72">
      <defs>
        <PatternDef id={patternId} type={pattern} />
        <linearGradient id={fabricId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lighten(color, 0.4)} />
          <stop offset="0.18" stopColor={color} />
          <stop offset="0.82" stopColor={color} />
          <stop offset="1" stopColor={darken(color, 0.35)} />
        </linearGradient>
        <linearGradient id={metalId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2F2F2" />
          <stop offset="0.35" stopColor="#CFCFCF" />
          <stop offset="0.55" stopColor="#9A9A9A" />
          <stop offset="0.8" stopColor="#6B6B6B" />
          <stop offset="1" stopColor="#4A4A4A" />
        </linearGradient>
        <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.65" />
          <stop offset="0.25" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={bandPath} fill={`url(#${fabricId})`} />
      <path d={bandPath} fill={`url(#${patternId})`} />
      <path d="M4 20 C4 14 116 14 116 20" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M4 52 C4 58 116 58 116 52" fill="none" stroke="black" strokeOpacity="0.22" strokeWidth="4" />
      <rect x="42" y="18" width="36" height="36" rx="8" fill="#2A2A2A" />
      <rect x="45" y="21" width="30" height="30" rx="6" fill={`url(#${metalId})`} />
      <rect x="45" y="21" width="30" height="15" rx="6" fill={`url(#${shineId})`} />
      <rect x="45" y="21" width="30" height="30" rx="6" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="1" />
      <Glyph icon={icon} color={darken(color, 0.5)} />
    </svg>
  );
}
