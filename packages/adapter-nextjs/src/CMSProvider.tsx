"use client";
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

import React, { createContext, useContext, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CMSContextValue {
  isPreview: boolean;
  isDebug: boolean;
  locale: string;
  abBucket: number;
  cspNonce?: string;

  // Analytics
  trackEvent(name: string, data?: Record<string, unknown>): void;
  trackImpression(componentId: string, componentKey: string): void;
  trackClick(componentId: string, label?: string): void;

  // Preview
  exitPreview(): void;

  // Dev tools
  toggleDebug(): void;
  getComponentStats(): ComponentStats[];
}

export interface ComponentStats {
  componentId: string;
  componentKey: string;
  impressions: number;
  clicks: number;
  mountedAt: number;
}

export interface CMSProviderProps {
  children: React.ReactNode;
  isPreview?: boolean;
  isDebug?: boolean;
  locale?: string;
  abBucket?: number;
  nonce?: string;
  analyticsEndpoint?: string;
  enableAutoTracking?: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CMSContext = createContext<CMSContextValue | null>(null);

export function useCMS(): CMSContextValue {
  const ctx = useContext(CMSContext);
  if (!ctx) throw new Error("useCMS must be used inside <CMSProvider>");
  return ctx;
}

export function useCMSOptional(): CMSContextValue | null {
  return useContext(CMSContext);
}

// ─── Analytics Queue ──────────────────────────────────────────────────────────

interface AnalyticsEvent {
  type: "event" | "impression" | "click";
  name?: string;
  componentId?: string;
  componentKey?: string;
  label?: string;
  data?: Record<string, unknown>;
  timestamp: number;
  locale: string;
  url: string;
}

class AnalyticsQueue {
  private queue: AnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private endpoint: string;
  private flushInterval: number;

  constructor(endpoint: string, flushInterval = 5000) {
    this.endpoint = endpoint;
    this.flushInterval = flushInterval;
  }

  push(event: AnalyticsEvent): void {
    this.queue.push(event);
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.flushInterval);
    }
    // Flush immediately if queue is large
    if (this.queue.length >= 25) this.flush();
  }

  flush(): void {
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0);
    // Use sendBeacon for reliability on page unload
    const body = JSON.stringify(batch);
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(this.endpoint, body);
    } else {
      fetch(this.endpoint, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CMSProvider({
  children,
  isPreview = false,
  isDebug: initialDebug = false,
  locale = "en",
  abBucket = 0,
  nonce,
  analyticsEndpoint = "/api/cms/analytics",
  enableAutoTracking = true,
}: CMSProviderProps): React.ReactElement {
  const [isDebug, setIsDebug] = useState(initialDebug || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("cms_debug")));
  const statsRef = useRef<Map<string, ComponentStats>>(new Map());
  const analyticsRef = useRef<AnalyticsQueue | null>(null);

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
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setIsDebug(d => !d);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const trackEvent = (name: string, data?: Record<string, unknown>) => {
    analyticsRef.current?.push({
      type: "event", name, data, timestamp: Date.now(),
      locale, url: window.location.pathname,
    });
  };

  const trackImpression = (componentId: string, componentKey: string) => {
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

  const trackClick = (componentId: string, label?: string) => {
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

  return (
    <CMSContext.Provider value={{
      isPreview, isDebug, locale, abBucket,
      cspNonce: nonce,
      trackEvent, trackImpression, trackClick, exitPreview,
      toggleDebug: () => setIsDebug(d => !d),
      getComponentStats: () => Array.from(statsRef.current.values()),
    }}>
      {children}
    </CMSContext.Provider>
  );
}


