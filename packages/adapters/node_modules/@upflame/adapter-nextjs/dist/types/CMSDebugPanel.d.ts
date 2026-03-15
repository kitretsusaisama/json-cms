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
import React from "react";
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
export declare function DebugPanel({ data }: DebugPanelProps): React.ReactElement | null;
//# sourceMappingURL=CMSDebugPanel.d.ts.map