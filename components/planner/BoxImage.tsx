"use client";

import { useState, type CSSProperties } from "react";

/**
 * Image with graceful degradation: tries `src`, then `fallbackSrc`, and if
 * both are missing or fail to load renders a neutral drawn box instead of the
 * browser's broken-image icon.
 */
export default function BoxImage({
  src,
  fallbackSrc,
  alt = "",
  className,
  style,
  placeholderClassName,
  placeholderStyle,
  lazy = false,
}: {
  src: string;
  fallbackSrc?: string | null;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  placeholderClassName?: string;
  placeholderStyle?: CSSProperties;
  lazy?: boolean;
}) {
  const candidates = [src, fallbackSrc].filter(
    (s): s is string => Boolean(s && s.trim()),
  );
  // The failure index is tied to the candidate list, so when the sources
  // change (e.g. a different box type) we start over from the first one.
  const key = candidates.join("|");
  const [failed, setFailed] = useState({ key, index: 0 });
  const index = failed.key === key ? failed.index : 0;

  const current = candidates[index];
  if (!current) {
    return (
      <div
        aria-hidden
        className={["box-placeholder", placeholderClassName ?? className ?? ""].join(" ")}
        style={placeholderStyle ?? style}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      draggable={false}
      loading={lazy ? "lazy" : undefined}
      className={className}
      style={style}
      onError={() => setFailed({ key, index: index + 1 })}
    />
  );
}
