"use client";
import { useState } from "react";

export function ArtistAvatar({
  src,
  size = 36,
  className = "",
}: {
  src?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={"rounded-full bg-gradient-to-br from-teal/30 to-green/30 flex-shrink-0 " + className}
        style={{ width: size, height: size }}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      className={"rounded-full object-cover flex-shrink-0 " + className}
      style={{ width: size, height: size, WebkitUserDrag: "none", WebkitTouchCallout: "none" } as React.CSSProperties}
    />
  );
}
