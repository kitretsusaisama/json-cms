"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugPanel = DebugPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * @upflame/json-cms — Debug Panel
 *
 * Floating developer overlay (Ctrl+Shift+D to toggle).
 * Shows: pipeline timings, component tree, cache status, event log,
 *        personalization segment, constraint violations.
 *
 * Only renders when isDebug=true. Zero bundle impact in production
 * if tree-shaken (conditionally imported).
 */
const react_1 = require("react");
const CMSProvider_1 = require("./CMSProvider");
// ─── Timing Bar ───────────────────────────────────────────────────────────────
function TimingBar({ label, ms, maxMs, color }) {
    const pct = ms !== undefined ? Math.min(100, (ms / maxMs) * 100) : 0;
    const status = ms === undefined ? "—" : ms < 2 ? "🟢" : ms < 10 ? "🟡" : "🔴";
    return ((0, jsx_runtime_1.jsxs)("div", { className: "mb-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between text-xs mb-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-gray-400", children: label }), (0, jsx_runtime_1.jsx)("span", { className: "font-mono text-gray-200", children: ms !== undefined ? `${ms}ms ${status}` : "—" })] }), (0, jsx_runtime_1.jsx)("div", { className: "h-1.5 bg-gray-700 rounded-full overflow-hidden", children: (0, jsx_runtime_1.jsx)("div", { className: `h-full rounded-full transition-all ${color}`, style: { width: `${pct}%` } }) })] }));
}
// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ children, variant = "default" }) {
    const colors = { default: "bg-gray-700 text-gray-300", success: "bg-green-900 text-green-300", warn: "bg-yellow-900 text-yellow-300", error: "bg-red-900 text-red-300" };
    return (0, jsx_runtime_1.jsx)("span", { className: `px-1.5 py-0.5 rounded text-xs font-mono ${colors[variant]}`, children: children });
}
// ─── Debug Panel ──────────────────────────────────────────────────────────────
function DebugPanel({ data }) {
    const cms = (0, CMSProvider_1.useCMSOptional)();
    const [activeTab, setActiveTab] = (0, react_1.useState)("pipeline");
    const [isMinimized, setIsMinimized] = (0, react_1.useState)(false);
    const [isDragging, setIsDragging] = (0, react_1.useState)(false);
    const [pos, setPos] = (0, react_1.useState)({ x: 16, y: 80 });
    if (!cms?.isDebug)
        return null;
    const tabs = [
        { id: "pipeline", label: "Pipeline" },
        { id: "components", label: "Components", count: data.components?.length },
        { id: "events", label: "Stats" },
        { id: "segment", label: "Segment" },
    ];
    const totalMs = data.timing?.totalMs ?? 0;
    const statusBadge = totalMs < 10 ? "success" : totalMs < 50 ? "warn" : "error";
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed z-[9998] w-80 font-mono text-xs select-none", style: { left: pos.x, top: pos.y }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between px-3 py-2 bg-gray-900 border border-gray-600 rounded-t cursor-move", onMouseDown: (e) => {
                    const startX = e.clientX - pos.x;
                    const startY = e.clientY - pos.y;
                    setIsDragging(true);
                    const onMove = (me) => setPos({ x: me.clientX - startX, y: me.clientY - startY });
                    const onUp = () => { setIsDragging(false); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                }, children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-gray-300 font-semibold flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-amber-400", children: "\u2699" }), " CMS Debug", (0, jsx_runtime_1.jsxs)(Badge, { variant: statusBadge, children: [totalMs, "ms"] }), data.cacheHit && (0, jsx_runtime_1.jsx)(Badge, { variant: "success", children: "CACHE HIT" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-1", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setIsMinimized(m => !m), className: "text-gray-500 hover:text-gray-200 px-1", children: isMinimized ? "▲" : "▼" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => cms.toggleDebug(), className: "text-gray-500 hover:text-red-400 px-1", children: "\u2715" })] })] }), !isMinimized && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-gray-900 border border-t-0 border-gray-600 rounded-b overflow-hidden", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex border-b border-gray-700", children: tabs.map(tab => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => setActiveTab(tab.id), className: `px-3 py-1.5 text-xs transition-colors ${activeTab === tab.id ? "text-blue-400 border-b-2 border-blue-400 bg-gray-800" : "text-gray-500 hover:text-gray-300"}`, children: [tab.label, tab.count !== undefined && (0, jsx_runtime_1.jsxs)("span", { className: "ml-1 text-gray-600", children: ["(", tab.count, ")"] })] }, tab.id))) }), (0, jsx_runtime_1.jsxs)("div", { className: "p-3 max-h-96 overflow-y-auto", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-3 text-gray-400", children: ["Page: ", (0, jsx_runtime_1.jsxs)("span", { className: "text-white font-semibold", children: ["/", data.slug] }), data.locale && (0, jsx_runtime_1.jsxs)("span", { className: "ml-2 text-gray-600", children: ["(", data.locale, ")"] })] }), activeTab === "pipeline" && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(TimingBar, { label: "Validate", ms: data.timing?.validateMs, maxMs: 20, color: "bg-purple-500" }), (0, jsx_runtime_1.jsx)(TimingBar, { label: "Resolve", ms: data.timing?.resolveMs, maxMs: 20, color: "bg-blue-500" }), (0, jsx_runtime_1.jsx)(TimingBar, { label: "Plan", ms: data.timing?.planMs, maxMs: 20, color: "bg-emerald-500" }), (0, jsx_runtime_1.jsx)(TimingBar, { label: "Total", ms: data.timing?.totalMs, maxMs: 50, color: "bg-amber-500" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-3 grid grid-cols-2 gap-2", children: [
                                            ["Blocks", data.blockCount, "default"],
                                            ["Components", data.components?.length, "default"],
                                            ["✓ Constraints", data.constraintsPassed, "success"],
                                            ["✗ Constraints", data.constraintsFailed, data.constraintsFailed ? "error" : "default"],
                                        ].map(([label, val, variant]) => ((0, jsx_runtime_1.jsxs)("div", { className: "bg-gray-800 rounded p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-gray-500 text-xs", children: String(label) }), (0, jsx_runtime_1.jsx)("div", { className: `text-sm font-semibold ${variant === "success" ? "text-green-400" : variant === "error" ? "text-red-400" : "text-white"}`, children: val ?? "—" })] }, String(label)))) }), data.warnings && data.warnings.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-yellow-500 mb-1", children: ["\u26A0 Warnings (", data.warnings.length, ")"] }), data.warnings.slice(0, 5).map((w, i) => ((0, jsx_runtime_1.jsx)("div", { className: "text-yellow-300 text-xs ml-2 mb-0.5 truncate", children: w }, i)))] })), data.errors && data.errors.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-red-500 mb-1", children: ["\u2717 Errors (", data.errors.length, ")"] }), data.errors.slice(0, 5).map((e, i) => ((0, jsx_runtime_1.jsx)("div", { className: "text-red-300 text-xs ml-2 mb-0.5 truncate", children: e }, i)))] }))] })), activeTab === "components" && ((0, jsx_runtime_1.jsxs)("div", { children: [(data.components ?? []).map((c, i) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between py-1 border-b border-gray-800 last:border-0", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-gray-500 mr-2", children: [i + 1, "."] }), (0, jsx_runtime_1.jsx)("span", { className: "text-white", children: c.key }), c.variant && (0, jsx_runtime_1.jsxs)("span", { className: "ml-1 text-blue-400", children: ["[", c.variant, "]"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 text-gray-600", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["w:", c.weight ?? 1] }), (0, jsx_runtime_1.jsx)("span", { className: "text-gray-700 text-xs truncate max-w-20", children: c.id })] })] }, c.id))), !data.components?.length && (0, jsx_runtime_1.jsx)("div", { className: "text-gray-600", children: "No components in plan." })] })), activeTab === "events" && ((0, jsx_runtime_1.jsxs)("div", { children: [cms.getComponentStats().map(stat => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between py-1 border-b border-gray-800 last:border-0", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-white", children: stat.componentKey }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-3 text-gray-400", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["\uD83D\uDC41 ", stat.impressions] }), (0, jsx_runtime_1.jsxs)("span", { children: ["\uD83D\uDDB1 ", stat.clicks] })] })] }, stat.componentId))), cms.getComponentStats().length === 0 && (0, jsx_runtime_1.jsx)("div", { className: "text-gray-600", children: "No component interactions yet." })] })), activeTab === "segment" && ((0, jsx_runtime_1.jsxs)("div", { children: [data.segment ? (Object.entries(data.segment).map(([k, v]) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between py-0.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-gray-500", children: k }), (0, jsx_runtime_1.jsx)("span", { className: "text-gray-200 font-mono truncate max-w-40", children: String(v) })] }, k)))) : ((0, jsx_runtime_1.jsx)("div", { className: "text-gray-600", children: "No segment data. Pass segment prop to renderer." })), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 pt-2 border-t border-gray-800 flex justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-gray-500", children: "A/B Bucket" }), (0, jsx_runtime_1.jsx)(Badge, { children: cms.abBucket })] })] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "px-3 py-1.5 bg-gray-950 border-t border-gray-700 text-gray-600 flex justify-between", children: [(0, jsx_runtime_1.jsx)("span", { children: "@upflame/json-cms v2.0" }), (0, jsx_runtime_1.jsx)("span", { children: "Ctrl+Shift+D to hide" })] })] }))] }));
}
//# sourceMappingURL=CMSDebugPanel.js.map