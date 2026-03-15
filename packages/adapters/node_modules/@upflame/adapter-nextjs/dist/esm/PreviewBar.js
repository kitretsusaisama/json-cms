"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @upflame/json-cms — Preview Bar
 *
 * Floating indicator bar shown to editors when viewing draft content.
 * Shows: preview status, expiry countdown, current slug, exit button.
 * Anchored to top of viewport. Zero layout impact (fixed position).
 */
import { useEffect, useState } from "react";
import { useCMSOptional } from "./CMSProvider";
function formatCountdown(ms) {
    if (ms <= 0)
        return "expired";
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1_000);
    if (h > 0)
        return `${h}h ${m}m remaining`;
    if (m > 0)
        return `${m}m ${s}s remaining`;
    return `${s}s remaining`;
}
export function PreviewBar({ slug, expiresAt, className = "" }) {
    const cms = useCMSOptional();
    const [countdown, setCountdown] = useState("");
    useEffect(() => {
        if (!expiresAt)
            return;
        const tick = () => setCountdown(formatCountdown(expiresAt - Date.now()));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);
    if (!cms?.isPreview)
        return null;
    return (_jsxs("div", { className: `fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 py-2 bg-amber-400 text-amber-950 text-sm font-medium shadow-lg ${className}`, role: "banner", "aria-label": "Preview mode active", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-amber-700 animate-pulse" }), _jsx("strong", { children: "Preview Mode" })] }), slug && (_jsxs("span", { className: "text-amber-800", children: ["/", slug] })), _jsx("span", { className: "px-2 py-0.5 bg-amber-200 rounded text-xs font-normal", children: "DRAFT" })] }), _jsxs("div", { className: "flex items-center gap-4", children: [expiresAt && (_jsx("span", { className: "text-amber-800 text-xs tabular-nums", children: countdown })), _jsx("button", { onClick: () => cms.exitPreview(), className: "px-3 py-1 bg-amber-700 text-white text-xs rounded hover:bg-amber-800 transition-colors", type: "button", children: "Exit Preview" })] })] }));
}
export function ServerPreviewBar({ isPreview, slug, expiresAt }) {
    if (!isPreview)
        return null;
    return _jsx(PreviewBar, { slug: slug, expiresAt: expiresAt });
}
//# sourceMappingURL=PreviewBar.js.map