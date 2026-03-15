/**
 * Plugin SDK — Plugin Logger
 * Structured logger scoped to a specific plugin ID.
 */

import { logger as cmsLogger } from "@/lib/logger";
import type { SdkLogger } from "./types";

export function createPluginLogger(pluginId: string): SdkLogger {
  const prefix = `[Plugin: ${pluginId}]`;

  return {
    debug(message: string, data?: Record<string, unknown>): void {
      cmsLogger.debug({ message: `${prefix} ${message}`, pluginId, ...data });
    },
    info(message: string, data?: Record<string, unknown>): void {
      cmsLogger.info({ message: `${prefix} ${message}`, pluginId, ...data });
    },
    warn(message: string, data?: Record<string, unknown>): void {
      cmsLogger.warn({ message: `${prefix} ${message}`, pluginId, ...data });
    },
    error(message: string, data?: Record<string, unknown>): void {
      cmsLogger.error({ message: `${prefix} ${message}`, pluginId, ...data });
    },
  };
}
