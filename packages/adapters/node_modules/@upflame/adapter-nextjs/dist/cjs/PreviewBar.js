"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewBar = PreviewBar;
exports.ServerPreviewBar = ServerPreviewBar;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * @upflame/json-cms — Preview Bar
 *
 * Floating indicator bar shown to editors when viewing draft content.
 * Shows: preview status, expiry countdown, current slug, exit button.
 * Anchored to top of viewport. Zero layout impact (fixed position).
 */
const react_1 = require("react");
const CMSProvider_1 = require("./CMSProvider");
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
function PreviewBar({ slug, expiresAt, className = "" }) {
    const cms = (0, CMSProvider_1.useCMSOptional)();
    const [countdown, setCountdown] = (0, react_1.useState)("");
    (0, react_1.useEffect)(() => {
        if (!expiresAt)
            return;
        const tick = () => setCountdown(formatCountdown(expiresAt - Date.now()));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);
    if (!cms?.isPreview)
        return null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: `fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 py-2 bg-amber-400 text-amber-950 text-sm font-medium shadow-lg ${className}`, role: "banner", "aria-label": "Preview mode active", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "w-2 h-2 rounded-full bg-amber-700 animate-pulse" }), (0, jsx_runtime_1.jsx)("strong", { children: "Preview Mode" })] }), slug && ((0, jsx_runtime_1.jsxs)("span", { className: "text-amber-800", children: ["/", slug] })), (0, jsx_runtime_1.jsx)("span", { className: "px-2 py-0.5 bg-amber-200 rounded text-xs font-normal", children: "DRAFT" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4", children: [expiresAt && ((0, jsx_runtime_1.jsx)("span", { className: "text-amber-800 text-xs tabular-nums", children: countdown })), (0, jsx_runtime_1.jsx)("button", { onClick: () => cms.exitPreview(), className: "px-3 py-1 bg-amber-700 text-white text-xs rounded hover:bg-amber-800 transition-colors", type: "button", children: "Exit Preview" })] })] }));
}
function ServerPreviewBar({ isPreview, slug, expiresAt }) {
    if (!isPreview)
        return null;
    return (0, jsx_runtime_1.jsx)(PreviewBar, { slug: slug, expiresAt: expiresAt });
}
//# sourceMappingURL=PreviewBar.js.map