"use client";
import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @upflame/json-cms — CMS React Context Provider
 *
 * Provides CMS state, personalization context, preview mode status,
 * and analytics hooks to all child components.
 *
 * Usage (App Router layout.tsx):
 *   import { CMSProvider } from "@/components/cms/CMSProvider";
 *   export default function RootLayout({ children }) {
 *     return <CMSProvider>{children}</CMSProvider>;
 *   }
 */
import { createContext, useContext, useEffect, useRef, useState } from "react";
// ─── Context ──────────────────────────────────────────────────────────────────
const CMSContext = createContext(null);
export function useCMS() {
    const ctx = useContext(CMSContext);
    if (!ctx)
        throw new Error("useCMS must be used inside <CMSProvider>");
    return ctx;
}
export function useCMSOptional() {
    return useContext(CMSContext);
}
class AnalyticsQueue {
    queue = [];
    flushTimer = null;
    endpoint;
    flushInterval;
    constructor(endpoint, flushInterval = 5000) {
        this.endpoint = endpoint;
        this.flushInterval = flushInterval;
    }
    push(event) {
        this.queue.push(event);
        if (!this.flushTimer) {
            this.flushTimer = setTimeout(() => this.flush(), this.flushInterval);
        }
        // Flush immediately if queue is large
        if (this.queue.length >= 25)
            this.flush();
    }
    flush() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        if (this.queue.length === 0)
            return;
        const batch = this.queue.splice(0);
        // Use sendBeacon for reliability on page unload
        const body = JSON.stringify(batch);
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
            navigator.sendBeacon(this.endpoint, body);
        }
        else {
            fetch(this.endpoint, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => { });
        }
    }
}
// ─── Provider ─────────────────────────────────────────────────────────────────
export function CMSProvider({ children, isPreview = false, isDebug: initialDebug = false, locale = "en", abBucket = 0, nonce, analyticsEndpoint = "/api/cms/analytics", enableAutoTracking = true, }) {
    const [isDebug, setIsDebug] = useState(initialDebug || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("cms_debug")));
    const statsRef = useRef(new Map());
    const analyticsRef = useRef(null);
    useEffect(() => {
        analyticsRef.current = new AnalyticsQueue(analyticsEndpoint);
        // Flush on page hide / unload
        const flush = () => analyticsRef.current?.flush();
        window.addEventListener("pagehide", flush);
        window.addEventListener("beforeunload", flush);
        return () => {
            window.removeEventListener("pagehide", flush);
            window.removeEventListener("beforeunload", flush);
            flush();
        };
    }, [analyticsEndpoint]);
    // Keyboard shortcut: Ctrl+Shift+D toggles debug panel
    useEffect(() => {
        const handler = (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === "D") {
                e.preventDefault();
                setIsDebug(d => !d);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);
    const trackEvent = (name, data) => {
        analyticsRef.current?.push({
            type: "event", name, data, timestamp: Date.now(),
            locale, url: window.location.pathname,
        });
    };
    const trackImpression = (componentId, componentKey) => {
        const existing = statsRef.current.get(componentId);
        statsRef.current.set(componentId, {
            componentId, componentKey,
            impressions: (existing?.impressions ?? 0) + 1,
            clicks: existing?.clicks ?? 0,
            mountedAt: existing?.mountedAt ?? Date.now(),
        });
        if (enableAutoTracking) {
            analyticsRef.current?.push({
                type: "impression", componentId, componentKey,
                timestamp: Date.now(), locale, url: window.location.pathname,
            });
        }
    };
    const trackClick = (componentId, label) => {
        const existing = statsRef.current.get(componentId);
        if (existing) {
            statsRef.current.set(componentId, { ...existing, clicks: existing.clicks + 1 });
        }
        analyticsRef.current?.push({
            type: "click", componentId, label,
            timestamp: Date.now(), locale, url: window.location.pathname,
        });
    };
    const exitPreview = () => {
        fetch("/api/cms/preview/disable").then(() => window.location.reload());
    };
    return (_jsx(CMSContext.Provider, { value: {
            isPreview, isDebug, locale, abBucket,
            cspNonce: nonce,
            trackEvent, trackImpression, trackClick, exitPreview,
            toggleDebug: () => setIsDebug(d => !d),
            getComponentStats: () => Array.from(statsRef.current.values()),
        }, children: children }));
}
//# sourceMappingURL=CMSProvider.js.map