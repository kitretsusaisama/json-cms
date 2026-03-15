import type { ContentTypeDefinition } from "@/core/content/schemas";
import type { PluginDefinition } from "@/plugin-sdk/types";

export type CMSPluginEntry =
  | PluginDefinition
  | string
  | {
      name?: string;
      plugin?: PluginDefinition;
      enabled?: boolean;
      config?: Record<string, unknown>;
    };

export interface CMSConfig {
  framework?: string;
  dataDir?: string;
  preset?: string;
  plugins?: CMSPluginEntry[];
  content?: {
    types?: ContentTypeDefinition[];
  };
  features?: {
    streaming?: boolean;
    serverComponents?: boolean;
    edgeRuntime?: boolean;
  };
  security?: {
    requireAuth?: boolean;
    corsOrigins?: string[];
    csp?: {
      reportOnly?: boolean;
      enableUnsafeEvalInDev?: boolean;
    };
  };
  seo?: {
    defaultLocale?: string;
    locales?: string[];
  };
}