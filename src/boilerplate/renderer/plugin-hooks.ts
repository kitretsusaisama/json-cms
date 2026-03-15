/**
 * Plugin Hook System for Component Lifecycle Events
 * Provides extensible hooks for plugins to interact with the rendering process
 */

import { ComponentInstance } from "@/types/composer";
import { TenantContext } from "../interfaces/tenant";
import { AuthContext } from "../interfaces/auth";
import { PluginContext, PluginHookHandler } from "../interfaces/plugin";
import { logger } from "../../lib/logger";

export interface HookData {
  slug: string;
  ctx: Record<string, unknown>;
  tenantContext?: TenantContext;
  authContext?: AuthContext;
  component?: ComponentInstance;
  phase: HookPhase;
  data?: unknown;
  error?: Error;
  timestamp: string;
  requestId?: string;
}

export type HookPhase = 
  | 'before-load'
  | 'after-load'
  | 'before-plan'
  | 'after-plan'
  | 'before-render'
  | 'after-render'
  | 'component-mount'
  | 'component-unmount'
  | 'error'
  | 'cache-hit'
  | 'cache-miss';

export interface HookHandler {
  id: string;
  pluginId: string;
  phase: HookPhase;
  priority: number;
  handler: PluginHookHandler;
  conditions?: HookCondition[];
  metadata?: Record<string, unknown>;
}

export interface HookCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with' | 'exists' | 'not_exists';
  value: unknown;
}

export interface HookExecutionResult {
  success: boolean;
  handlerId: string;
  pluginId: string;
  duration: number;
  error?: Error;
  data?: unknown;
}

export interface HookExecutionSummary {
  phase: HookPhase;
  totalHandlers: number;
  successfulHandlers: number;
  failedHandlers: number;
  totalDuration: number;
  results: HookExecutionResult[];
}

/**
 * Plugin Hook Manager
 */
export class PluginHookManager {
  private handlers = new Map<HookPhase, HookHandler[]>();
  private executionHistory: HookExecutionSummary[] = [];
  private maxHistorySize = 100;

  /**
   * Register a hook handler
   */
  registerHook(handler: HookHandler): void {
    const phaseHandlers = this.handlers.get(handler.phase) || [];
    
    // Check if handler already exists
    const existingIndex = phaseHandlers.findIndex(h => h.id === handler.id);
    if (existingIndex >= 0) {
      phaseHandlers[existingIndex] = handler;
    } else {
      phaseHandlers.push(handler);
    }
    
    // Sort by priority (higher priority first)
    phaseHandlers.sort((a, b) => b.priority - a.priority);
    
    this.handlers.set(handler.phase, phaseHandlers);
    
    logger.debug({
      message: `Registered hook handler: ${handler.id} for phase: ${handler.phase}`,
      pluginId: handler.pluginId,
      priority: handler.priority
    });
  }

  /**
   * Unregister a hook handler
   */
  unregisterHook(handlerId: string, phase?: HookPhase): void {
    if (phase) {
      const phaseHandlers = this.handlers.get(phase) || [];
      const filteredHandlers = phaseHandlers.filter(h => h.id !== handlerId);
      this.handlers.set(phase, filteredHandlers);
    } else {
      // Remove from all phases
      for (const [phaseName, phaseHandlers] of this.handlers.entries()) {
        const filteredHandlers = phaseHandlers.filter(h => h.id !== handlerId);
        this.handlers.set(phaseName, filteredHandlers);
      }
    }
    
    logger.debug({
      message: `Unregistered hook handler: ${handlerId}`,
      phase
    });
  }

  /**
   * Unregister all hooks for a plugin
   */
  unregisterPluginHooks(pluginId: string): void {
    for (const [phase, phaseHandlers] of this.handlers.entries()) {
      const filteredHandlers = phaseHandlers.filter(h => h.pluginId !== pluginId);
      this.handlers.set(phase, filteredHandlers);
    }
    
    logger.debug({
      message: `Unregistered all hooks for plugin: ${pluginId}`
    });
  }

  /**
   * Execute hooks for a specific phase
   */
  async executeHooks(phase: HookPhase, data: HookData): Promise<HookExecutionSummary> {
    const startTime = Date.now();
    const phaseHandlers = this.handlers.get(phase) || [];
    const results: HookExecutionResult[] = [];
    
    logger.debug({
      message: `Executing ${phaseHandlers.length} hooks for phase: ${phase}`,
      slug: data.slug,
      tenantId: data.tenantContext?.id,
      userId: data.authContext?.user?.id
    });

    for (const handler of phaseHandlers) {
      const handlerStartTime = Date.now();
      
      try {
        // Check conditions
        if (handler.conditions && !this.evaluateConditions(handler.conditions, data)) {
          logger.debug({
            message: `Skipping hook handler ${handler.id} - conditions not met`,
            pluginId: handler.pluginId
          });
          continue;
        }

        // Execute handler
        await handler.handler(data);
        
        const duration = Date.now() - handlerStartTime;
        results.push({
          success: true,
          handlerId: handler.id,
          pluginId: handler.pluginId,
          duration
        });
        
        logger.debug({
          message: `Hook handler executed successfully: ${handler.id}`,
          pluginId: handler.pluginId,
          duration
        });
        
      } catch (error) {
        const duration = Date.now() - handlerStartTime;
        const hookError = error instanceof Error ? error : new Error(String(error));
        
        results.push({
          success: false,
          handlerId: handler.id,
          pluginId: handler.pluginId,
          duration,
          error: hookError
        });
        
        logger.error({
          message: `Hook handler failed: ${handler.id}`,
          pluginId: handler.pluginId,
          error: hookError.message,
          duration
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const summary: HookExecutionSummary = {
      phase,
      totalHandlers: phaseHandlers.length,
      successfulHandlers: results.filter(r => r.success).length,
      failedHandlers: results.filter(r => !r.success).length,
      totalDuration,
      results
    };

    // Store execution history
    this.addToHistory(summary);

    return summary;
  }

  /**
   * Get registered handlers for a phase
   */
  getHandlers(phase: HookPhase): HookHandler[] {
    return [...(this.handlers.get(phase) || [])];
  }

  /**
   * Get all registered handlers
   */
  getAllHandlers(): Record<HookPhase, HookHandler[]> {
    const result: Partial<Record<HookPhase, HookHandler[]>> = {};
    for (const [phase, handlers] of this.handlers.entries()) {
      result[phase] = [...handlers];
    }
    return result as Record<HookPhase, HookHandler[]>;
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit?: number): HookExecutionSummary[] {
    const history = [...this.executionHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = [];
  }

  /**
   * Get hook statistics
   */
  getStatistics(): {
    totalHandlers: number;
    handlersByPhase: Record<HookPhase, number>;
    handlersByPlugin: Record<string, number>;
    executionStats: {
      totalExecutions: number;
      averageDuration: number;
      successRate: number;
    };
  } {
    const handlersByPhase: Partial<Record<HookPhase, number>> = {};
    const handlersByPlugin: Record<string, number> = {};
    let totalHandlers = 0;

    for (const [phase, handlers] of this.handlers.entries()) {
      handlersByPhase[phase] = handlers.length;
      totalHandlers += handlers.length;
      
      for (const handler of handlers) {
        handlersByPlugin[handler.pluginId] = (handlersByPlugin[handler.pluginId] || 0) + 1;
      }
    }

    // Calculate execution statistics
    const totalExecutions = this.executionHistory.reduce((sum, summary) => sum + summary.totalHandlers, 0);
    const totalDuration = this.executionHistory.reduce((sum, summary) => sum + summary.totalDuration, 0);
    const totalSuccessful = this.executionHistory.reduce((sum, summary) => sum + summary.successfulHandlers, 0);
    
    const averageDuration = totalExecutions > 0 ? totalDuration / totalExecutions : 0;
    const successRate = totalExecutions > 0 ? totalSuccessful / totalExecutions : 0;

    return {
      totalHandlers,
      handlersByPhase: handlersByPhase as Record<HookPhase, number>,
      handlersByPlugin,
      executionStats: {
        totalExecutions,
        averageDuration,
        successRate
      }
    };
  }

  /**
   * Evaluate hook conditions
   */
  private evaluateConditions(conditions: HookCondition[], data: HookData): boolean {
    return conditions.every(condition => this.evaluateCondition(condition, data));
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: HookCondition, data: HookData): boolean {
    const value = this.getFieldValue(condition.field, data);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      
      case 'not_equals':
        return value !== condition.value;
      
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      
      case 'contains':
        return typeof value === 'string' && typeof condition.value === 'string' && 
               value.includes(condition.value);
      
      case 'starts_with':
        return typeof value === 'string' && typeof condition.value === 'string' && 
               value.startsWith(condition.value);
      
      case 'ends_with':
        return typeof value === 'string' && typeof condition.value === 'string' && 
               value.endsWith(condition.value);
      
      case 'exists':
        return value !== undefined && value !== null;
      
      case 'not_exists':
        return value === undefined || value === null;
      
      default:
        logger.warn({
          message: `Unknown condition operator: ${condition.operator}`,
          field: condition.field
        });
        return false;
    }
  }

  /**
   * Get field value from hook data using dot notation
   */
  private getFieldValue(field: string, data: HookData): unknown {
    const parts = field.split('.');
    let value: any = data;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Add execution summary to history
   */
  private addToHistory(summary: HookExecutionSummary): void {
    this.executionHistory.push(summary);
    
    // Limit history size
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.maxHistorySize);
    }
  }
}

/**
 * Create hook data object
 */
export function createHookData(
  phase: HookPhase,
  slug: string,
  ctx: Record<string, unknown>,
  options: {
    tenantContext?: TenantContext;
    authContext?: AuthContext;
    component?: ComponentInstance;
    data?: unknown;
    error?: Error;
    requestId?: string;
  } = {}
): HookData {
  return {
    phase,
    slug,
    ctx,
    tenantContext: options.tenantContext,
    authContext: options.authContext,
    component: options.component,
    data: options.data,
    error: options.error,
    timestamp: new Date().toISOString(),
    requestId: options.requestId || generateRequestId()
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a singleton hook manager instance
 */
export const pluginHookManager = new PluginHookManager();

/**
 * Convenience function to execute hooks
 */
export async function executePluginHooks(
  pluginContext: PluginContext,
  phase: HookPhase,
  data: Omit<HookData, 'phase' | 'timestamp'>
): Promise<HookExecutionSummary> {
  const hookData = createHookData(phase, data.slug, data.ctx, data);
  return pluginHookManager.executeHooks(phase, hookData);
}

/**
 * Convenience function to register hooks from plugin context
 */
export function registerPluginHook(
  pluginContext: PluginContext,
  phase: HookPhase,
  handler: PluginHookHandler,
  options: {
    priority?: number;
    conditions?: HookCondition[];
    metadata?: Record<string, unknown>;
  } = {}
): void {
  const hookHandler: HookHandler = {
    id: `${pluginContext.pluginId}_${phase}_${Date.now()}`,
    pluginId: pluginContext.pluginId,
    phase,
    priority: options.priority || 0,
    handler,
    conditions: options.conditions,
    metadata: options.metadata
  };
  
  pluginHookManager.registerHook(hookHandler);
}