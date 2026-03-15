"use client";
/**
 * @upflame/json-cms — Preview Bar
 *
 * Floating indicator bar shown to editors when viewing draft content.
 * Shows: preview status, expiry countdown, current slug, exit button.
 * Anchored to top of viewport. Zero layout impact (fixed position).
 */

import React, { useEffect, useState } from "react";
import { useCMSOptional } from "./CMSProvider";

export interface PreviewBarProps {
  slug?: string;
  expiresAt?: number; // Unix ms
  className?: string;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m remaining`;
  if (m > 0) return `${m}m ${s}s remaining`;
  return `${s}s remaining`;
}

export function PreviewBar({ slug, expiresAt, className = "" }: PreviewBarProps): React.ReactElement | null {
  const cms = useCMSOptional();
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setCountdown(formatCountdown(expiresAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!cms?.isPreview) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 py-2 bg-amber-400 text-amber-950 text-sm font-medium shadow-lg ${className}`}
      role="banner"
      aria-label="Preview mode active"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-700 animate-pulse" />
          <strong>Preview Mode</strong>
        </span>
        {slug && (
          <span className="text-amber-800">
            /{slug}
          </span>
        )}
        <span className="px-2 py-0.5 bg-amber-200 rounded text-xs font-normal">DRAFT</span>
      </div>

      <div className="flex items-center gap-4">
        {expiresAt && (
          <span className="text-amber-800 text-xs tabular-nums">
            {countdown}
          </span>
        )}
        <button
          onClick={() => cms.exitPreview()}
          className="px-3 py-1 bg-amber-700 text-white text-xs rounded hover:bg-amber-800 transition-colors"
          type="button"
        >
          Exit Preview
        </button>
      </div>
    </div>
  );
}

/**
 * Server-side wrapper for use in Next.js App Router layouts.
 * Passes preview context as props to the client PreviewBar.
 */
export interface ServerPreviewBarProps {
  isPreview: boolean;
  slug?: string;
  expiresAt?: number;
}

export function ServerPreviewBar({ isPreview, slug, expiresAt }: ServerPreviewBarProps): React.ReactElement | null {
  if (!isPreview) return null;
  return <PreviewBar slug={slug} expiresAt={expiresAt} />;
}
