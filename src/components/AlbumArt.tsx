"use client";
import { useState } from "react";

export function AlbumArt({
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
        className={"rounded-lg bg-gradient-to-br from-teal to-green flex-shrink-0 " + className}
        style={{ width: size, height: size }}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className={"rounded-lg object-cover flex-shrink-0 " + className}
      style={{ width: size, height: size }}
    />
  );
}
