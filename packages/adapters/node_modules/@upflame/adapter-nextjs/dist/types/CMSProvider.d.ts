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
import React from "react";
export interface CMSContextValue {
    isPreview: boolean;
    isDebug: boolean;
    locale: string;
    abBucket: number;
    cspNonce?: string;
    trackEvent(name: string, data?: Record<string, unknown>): void;
    trackImpression(componentId: string, componentKey: string): void;
    trackClick(componentId: string, label?: string): void;
    exitPreview(): void;
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
export declare function useCMS(): CMSContextValue;
export declare function useCMSOptional(): CMSContextValue | null;
export declare function CMSProvider({ children, isPreview, isDebug: initialDebug, locale, abBucket, nonce, analyticsEndpoint, enableAutoTracking, }: CMSProviderProps): React.ReactElement;
//# sourceMappingURL=CMSProvider.d.ts.map