"use client";
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

import React, { useState } from "react";
import { useCMSOptional } from "./CMSProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DebugPanelData {
  slug: string;
  timing?: {
    validateMs?: number;
    resolveMs?: number;
    planMs?: number;
    totalMs?: number;
  };
  components?: Array<{
    id: string;
    key: string;
    variant?: string;
    weight?: number;
  }>;
  warnings?: string[];
  errors?: string[];
  constraintsPassed?: number;
  constraintsFailed?: number;
  cacheHit?: boolean;
  blockCount?: number;
  locale?: string;
  segment?: Record<string, unknown>;
}

export interface DebugPanelProps {
  data: DebugPanelData;
}

type TabId = "pipeline" | "components" | "events" | "segment";

// ─── Timing Bar ───────────────────────────────────────────────────────────────

function TimingBar({ label, ms, maxMs, color }: { label: string; ms?: number; maxMs: number; color: string }) {
  const pct = ms !== undefined ? Math.min(100, (ms / maxMs) * 100) : 0;
  const status = ms === undefined ? "—" : ms < 2 ? "🟢" : ms < 10 ? "🟡" : "🔴";
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono text-gray-200">{ms !== undefined ? `${ms}ms ${status}` : "—"}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warn" | "error" }) {
  const colors = { default: "bg-gray-700 text-gray-300", success: "bg-green-900 text-green-300", warn: "bg-yellow-900 text-yellow-300", error: "bg-red-900 text-red-300" };
  return <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${colors[variant]}`}>{children}</span>;
}

// ─── Debug Panel ──────────────────────────────────────────────────────────────

export function DebugPanel({ data }: DebugPanelProps): React.ReactElement | null {
  const cms = useCMSOptional();
  const [activeTab, setActiveTab] = useState<TabId>("pipeline");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState({ x: 16, y: 80 });

  if (!cms?.isDebug) return null;

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: "pipeline", label: "Pipeline" },
    { id: "components", label: "Components", count: data.components?.length },
    { id: "events", label: "Stats" },
    { id: "segment", label: "Segment" },
  ];

  const totalMs = data.timing?.totalMs ?? 0;
  const statusBadge = totalMs < 10 ? "success" : totalMs < 50 ? "warn" : "error";

  return (
    <div
      className="fixed z-[9998] w-80 font-mono text-xs select-none"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-900 border border-gray-600 rounded-t cursor-move"
        onMouseDown={(e) => {
          const startX = e.clientX - pos.x;
          const startY = e.clientY - pos.y;
          setIsDragging(true);
          const onMove = (me: MouseEvent) => setPos({ x: me.clientX - startX, y: me.clientY - startY });
          const onUp = () => { setIsDragging(false); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
      >
        <span className="text-gray-300 font-semibold flex items-center gap-2">
          <span className="text-amber-400">⚙</span> CMS Debug
          <Badge variant={statusBadge}>{totalMs}ms</Badge>
          {data.cacheHit && <Badge variant="success">CACHE HIT</Badge>}
        </span>
        <div className="flex gap-1">
          <button onClick={() => setIsMinimized(m => !m)} className="text-gray-500 hover:text-gray-200 px-1">
            {isMinimized ? "▲" : "▼"}
          </button>
          <button onClick={() => cms.toggleDebug()} className="text-gray-500 hover:text-red-400 px-1">✕</button>
        </div>
      </div>

      {!isMinimized && (
        <div className="bg-gray-900 border border-t-0 border-gray-600 rounded-b overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs transition-colors ${activeTab === tab.id ? "text-blue-400 border-b-2 border-blue-400 bg-gray-800" : "text-gray-500 hover:text-gray-300"}`}
              >
                {tab.label}{tab.count !== undefined && <span className="ml-1 text-gray-600">({tab.count})</span>}
              </button>
            ))}
          </div>

          <div className="p-3 max-h-96 overflow-y-auto">
            {/* Slug */}
            <div className="mb-3 text-gray-400">
              Page: <span className="text-white font-semibold">/{data.slug}</span>
              {data.locale && <span className="ml-2 text-gray-600">({data.locale})</span>}
            </div>

            {/* Pipeline Tab */}
            {activeTab === "pipeline" && (
              <div>
                <TimingBar label="Validate" ms={data.timing?.validateMs} maxMs={20} color="bg-purple-500" />
                <TimingBar label="Resolve" ms={data.timing?.resolveMs} maxMs={20} color="bg-blue-500" />
                <TimingBar label="Plan" ms={data.timing?.planMs} maxMs={20} color="bg-emerald-500" />
                <TimingBar label="Total" ms={data.timing?.totalMs} maxMs={50} color="bg-amber-500" />

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    ["Blocks", data.blockCount, "default"],
                    ["Components", data.components?.length, "default"],
                    ["✓ Constraints", data.constraintsPassed, "success"],
                    ["✗ Constraints", data.constraintsFailed, data.constraintsFailed ? "error" : "default"],
                  ].map(([label, val, variant]) => (
                    <div key={String(label)} className="bg-gray-800 rounded p-2">
                      <div className="text-gray-500 text-xs">{String(label)}</div>
                      <div className={`text-sm font-semibold ${variant === "success" ? "text-green-400" : variant === "error" ? "text-red-400" : "text-white"}`}>
                        {val ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>

                {data.warnings && data.warnings.length > 0 && (
                  <div className="mt-3">
                    <div className="text-yellow-500 mb-1">⚠ Warnings ({data.warnings.length})</div>
                    {data.warnings.slice(0, 5).map((w, i) => (
                      <div key={i} className="text-yellow-300 text-xs ml-2 mb-0.5 truncate">{w}</div>
                    ))}
                  </div>
                )}
                {data.errors && data.errors.length > 0 && (
                  <div className="mt-3">
                    <div className="text-red-500 mb-1">✗ Errors ({data.errors.length})</div>
                    {data.errors.slice(0, 5).map((e, i) => (
                      <div key={i} className="text-red-300 text-xs ml-2 mb-0.5 truncate">{e}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Components Tab */}
            {activeTab === "components" && (
              <div>
                {(data.components ?? []).map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between py-1 border-b border-gray-800 last:border-0">
                    <div>
                      <span className="text-gray-500 mr-2">{i + 1}.</span>
                      <span className="text-white">{c.key}</span>
                      {c.variant && <span className="ml-1 text-blue-400">[{c.variant}]</span>}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>w:{c.weight ?? 1}</span>
                      <span className="text-gray-700 text-xs truncate max-w-20">{c.id}</span>
                    </div>
                  </div>
                ))}
                {!data.components?.length && <div className="text-gray-600">No components in plan.</div>}
              </div>
            )}

            {/* Events / Stats Tab */}
            {activeTab === "events" && (
              <div>
                {cms.getComponentStats().map(stat => (
                  <div key={stat.componentId} className="flex items-center justify-between py-1 border-b border-gray-800 last:border-0">
                    <span className="text-white">{stat.componentKey}</span>
                    <div className="flex gap-3 text-gray-400">
                      <span>👁 {stat.impressions}</span>
                      <span>🖱 {stat.clicks}</span>
                    </div>
                  </div>
                ))}
                {cms.getComponentStats().length === 0 && <div className="text-gray-600">No component interactions yet.</div>}
              </div>
            )}

            {/* Segment Tab */}
            {activeTab === "segment" && (
              <div>
                {data.segment ? (
                  Object.entries(data.segment).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-0.5">
                      <span className="text-gray-500">{k}</span>
                      <span className="text-gray-200 font-mono truncate max-w-40">{String(v)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-600">No segment data. Pass segment prop to renderer.</div>
                )}
                <div className="mt-2 pt-2 border-t border-gray-800 flex justify-between">
                  <span className="text-gray-500">A/B Bucket</span>
                  <Badge>{cms.abBucket}</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 bg-gray-950 border-t border-gray-700 text-gray-600 flex justify-between">
            <span>@upflame/json-cms v2.0</span>
            <span>Ctrl+Shift+D to hide</span>
          </div>
        </div>
      )}
    </div>
  );
}
