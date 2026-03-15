/**
 * @upflame/json-cms — Preview Bar
 *
 * Floating indicator bar shown to editors when viewing draft content.
 * Shows: preview status, expiry countdown, current slug, exit button.
 * Anchored to top of viewport. Zero layout impact (fixed position).
 */
import React from "react";
export interface PreviewBarProps {
    slug?: string;
    expiresAt?: number;
    className?: string;
}
export declare function PreviewBar({ slug, expiresAt, className }: PreviewBarProps): React.ReactElement | null;
/**
 * Server-side wrapper for use in Next.js App Router layouts.
 * Passes preview context as props to the client PreviewBar.
 */
export interface ServerPreviewBarProps {
    isPreview: boolean;
    slug?: string;
    expiresAt?: number;
}
export declare function ServerPreviewBar({ isPreview, slug, expiresAt }: ServerPreviewBarProps): React.ReactElement | null;
//# sourceMappingURL=PreviewBar.d.ts.map