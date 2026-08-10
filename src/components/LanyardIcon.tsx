"use client";
import { LanyardIcon as LanyardIconKey } from "@/lib/lanyards";

function Glyph({ icon, unlocked }: { icon: LanyardIconKey; unlocked: boolean }) {
  const color = unlocked ? "white" : "#93A0AB";
  switch (icon) {
    case "play":
      return <path d="M31 58l14 9-14 9z" fill={color} />;
    case "five":
      return (
        <text x="36" y="73" textAnchor="middle" fontSize="26" fontWeight="800" fill={color}>
          5
        </text>
      );
    case "calendar":
      return (
        <>
          <rect x="24" y="58" width="24" height="20" rx="4" fill="none" stroke={color} strokeWidth="2.2" />
          <path d="M28 58v-5a4 4 0 018 0v5M36 58v-5a4 4 0 018 0v5" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        </>
      );
    case "crown":
      return <path d="M23 71l3-13 8 7 6-9 6 9 8-7 3 13z" fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />;
    case "flag":
      return (
        <>
          <path d="M27 55v24" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M27 56c4-3 8-3 12 0s8 3 12 0v11c-4 3-8 3-12 0s-8-3-12 0z" fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
        </>
      );
    case "tickets":
      return (
        <>
          <rect x="21" y="60" width="20" height="15" rx="3" fill="none" stroke={color} strokeWidth="2" />
          <rect x="31" y="66" width="20" height="15" rx="3" fill="none" stroke={color} strokeWidth="2" />
        </>
      );
  }
}

// The core visual for a lanyard: a strap up top (gradient + woven texture
// when unlocked, flat grey when locked), a grommet where it meets the pass,
// and the pass itself — deliberately portrait, like a real festival laminate.
// `width` scales the whole graphic; height follows the native 72:118 ratio.
export function LanyardIcon({
  icon,
  unlocked,
  gradientId,
  width = 72,
}: {
  icon: LanyardIconKey;
  unlocked: boolean;
  gradientId: string;
  width?: number;
}) {
  return (
    <svg width={width} height={(width * 118) / 72} viewBox="0 0 72 118">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#115067" />
          <stop offset="1" stopColor="#14CC9B" />
        </linearGradient>
      </defs>
      <rect x="27" y="0" width="18" height="34" rx="9" fill={unlocked ? `url(#${gradientId})` : "#D8DCDA"} />
      {unlocked && (
        <>
          <line x1="27" y1="8" x2="45" y2="14" stroke="white" strokeOpacity="0.35" strokeWidth="2" />
          <line x1="27" y1="18" x2="45" y2="24" stroke="white" strokeOpacity="0.35" strokeWidth="2" />
        </>
      )}
      <circle cx="36" cy="36" r="5" fill="white" stroke="#D8DCDA" strokeWidth="1.5" />
      <rect
        x="12"
        y="42"
        width="48"
        height="70"
        rx="14"
        fill={unlocked ? `url(#${gradientId})` : "#FFFFFF"}
        stroke={unlocked ? "none" : "#D8DCDA"}
        strokeWidth="2"
      />
      <Glyph icon={icon} unlocked={unlocked} />
    </svg>
  );
}
