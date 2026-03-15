/**
 * @upflame/json-cms — Unified Pipeline Orchestrator
 *
 * Coordinates the full validate → resolve → plan → render pipeline
 * with integrated event bus instrumentation, error handling, and
 * performance telemetry at every stage.
 *
 * Performance targets:
 *   validate < 2ms  (schema compilation cached)
 *   resolve  < 2ms  (LRU + in-flight deduplication)
 *   plan     < 5ms  (memoized constraint evaluation)
 *   render   < 1ms  (registry O(1) lookup)
 */

import { eventBus, withStageEvents } from "../events/event-bus";
import { loadResolvedPage, cachedLoadPage, generateCacheKey, type ResolveContext, type LoadedData } from "../compose/resolve";
import { resolverCache } from "../compose/cache";
import { planPage, type PlanResult, type PlanCtx } from "../compose/planner";
import { validateContent, type ValidationResult } from "../compose/validator";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PipelineRequest {
  /** Page slug to process */
  slug: string;
  /** Resolution context (locale, env, site) */
  resolveCtx?: ResolveContext;
  /** Planning context (A/B bucket, device, etc.) */
  planCtx?: PlanCtx;
  /** Whether to run validation before resolve */
  validate?: boolean;
  /** Skip validation even if enabled globally */
  skipValidation?: boolean;
  /** Request ID for distributed tracing */
  requestId?: string;
}

export interface PipelineResult {
  slug: string;
  loaded: LoadedData;
  plan: PlanResult;
  validation?: ValidationResult;
  timing: {
    validateMs: number;
    resolveMs: number;
    planMs: number;
    totalMs: number;
  };
  requestId?: string;
}

export interface PipelineOptions {
  /** Enable validation stage (default: process.env.NODE_ENV !== 'production') */
  validateInProd?: boolean;
  /** Throw on validation errors (default: false) */
  throwOnValidationError?: boolean;
  /** Throw on plan errors (default: false) */
  throwOnPlanError?: boolean;
  /** Emit timing events (default: true) */
  emitEvents?: boolean;
}

// ─── Pipeline Orchestrator ────────────────────────────────────────────────────

export class CMSPipeline {
  private readonly opts: Required<PipelineOptions>;

  constructor(opts: PipelineOptions = {}) {
    this.opts = {
      validateInProd: opts.validateInProd ?? false,
      throwOnValidationError: opts.throwOnValidationError ?? false,
      throwOnPlanError: opts.throwOnPlanError ?? false,
      emitEvents: opts.emitEvents ?? true,
    };
  }

  /**
   * Run the full CMS pipeline for a single page.
   * Returns a complete PipelineResult with timing data.
   */
  async run(req: PipelineRequest): Promise<PipelineResult> {
    const { slug, resolveCtx = {}, planCtx = {}, requestId } = req;
    const pipelineStart = performance.now();
    const timing = { validateMs: 0, resolveMs: 0, planMs: 0, totalMs: 0 };
    let cacheHit = false;

    // ── Stage 1: Validate (optional) ─────────────────────────────────────────
    let validation: ValidationResult | undefined;
    const shouldValidate =
      (req.validate ?? (process.env.NODE_ENV !== "production")) &&
      !req.skipValidation;

    if (shouldValidate) {
      const validateStart = performance.now();

      if (this.opts.emitEvents) {
        eventBus.emit("page:validate", { slug, type: "page" });
      }

      try {
        validation = await validateContent("page", slug);
        timing.validateMs = Math.round(performance.now() - validateStart);

        if (this.opts.emitEvents) {
          eventBus.emit("page:validated", {
            slug,
            valid: validation.valid,
            errorCount: validation.errors.length,
            warningCount: validation.warnings.length,
            durationMs: timing.validateMs,
            cacheHit,
          } as Parameters<typeof eventBus.emit<"page:validated">>[1]);
        }

        if (!validation.valid && this.opts.throwOnValidationError) {
          const errors = validation.errors.map((e) => e.message).join("; ");
          throw new Error(`Validation failed for "${slug}": ${errors}`);
        }
      } catch (err) {
        if (this.opts.throwOnValidationError || !(err instanceof Error)) throw err;
        // Non-fatal: log and continue
        console.warn(`[CMS Pipeline] Validation error for "${slug}":`, err.message);
      }
    }

    // ── Stage 2: Resolve ──────────────────────────────────────────────────────
    const resolveStart = performance.now();

    if (this.opts.emitEvents) {
      eventBus.emit("page:resolve", { slug, ctx: resolveCtx as Record<string, unknown> });
    }

    // BUG-PIPELINE-001 FIX: use cachedLoadPage + detect cache hit
    const cacheKey = generateCacheKey(slug, planCtx, resolveCtx);
    cacheHit = (resolverCache as unknown as { get: (k: string) => unknown }).get?.(cacheKey) !== undefined;
    let loaded: LoadedData;
    try {
      loaded = await cachedLoadPage(slug, planCtx, resolveCtx);
    } catch (err) {
      if (this.opts.emitEvents) {
        eventBus.emit("error:pipeline", {
          stage: "resolve",
          slug,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
      }
      throw err;
    }

    timing.resolveMs = Math.round(performance.now() - resolveStart);

    if (this.opts.emitEvents) {
      eventBus.emit("page:resolved", {
        slug,
        blockCount: Object.keys(loaded.blocks).length,
        warningCount: loaded.warnings.length,
        durationMs: timing.resolveMs,
        cacheHit,
      });
    }

    // ── Stage 3: Plan ─────────────────────────────────────────────────────────
    const planStart = performance.now();
    const inputComponentCount =
      (loaded.page.prepend?.length ?? 0) +
      (loaded.page.append?.length ?? 0) +
      Object.values(loaded.blocks).reduce((acc, b) => acc + b.tree.length, 0);

    if (this.opts.emitEvents) {
      eventBus.emit("page:plan", { slug, componentCount: inputComponentCount });
    }

    let plan: PlanResult;
    try {
      plan = planPage({
        page: loaded.page,
        ctx: planCtx,
        blocks: loaded.blocks,
      });
    } catch (err) {
      if (this.opts.emitEvents) {
        eventBus.emit("error:pipeline", {
          stage: "plan",
          slug,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      throw err;
    }

    timing.planMs = Math.round(performance.now() - planStart);

    if (plan.errors.length > 0 && this.opts.throwOnPlanError) {
      throw new Error(`Plan failed for "${slug}": ${plan.errors.join("; ")}`);
    }

    if (this.opts.emitEvents) {
      eventBus.emit("page:planned", {
        slug,
        componentCount: plan.components.length,
        constraintsPassed: plan.metrics.constraintsPassed,
        constraintsFailed: plan.metrics.constraintsFailed,
        durationMs: timing.planMs,
      });
    }

    timing.totalMs = Math.round(performance.now() - pipelineStart);

    return { slug, loaded, plan, validation, timing, requestId };
  }

  /**
   * Batch process multiple pages in parallel.
   * Failed pages return errors in the results array without stopping others.
   */
  async runBatch(
    requests: PipelineRequest[]
  ): Promise<Array<{ slug: string; result?: PipelineResult; error?: string }>> {
    const results = await Promise.allSettled(
      requests.map((req) => this.run(req))
    );

    return results.map((r, i) => {
      const slug = requests[i].slug;
      if (r.status === "fulfilled") return { slug, result: r.value };
      return {
        slug,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      };
    });
  }
}

// ─── Singleton Default Pipeline ───────────────────────────────────────────────

/** Default pipeline instance — use this in production RSC pages */
export const pipeline = new CMSPipeline({
  validateInProd: false,
  throwOnValidationError: false,
  throwOnPlanError: false,
  emitEvents: true,
});

/**
 * Convenience function for running the pipeline on a single page.
 * Equivalent to: pipeline.run(req)
 */
export async function runPipeline(req: PipelineRequest): Promise<PipelineResult> {
  return pipeline.run(req);
}

/**
 * Convenience function for validating + resolving + planning in one call.
 * Most RSC pages should use this.
 *
 * @example
 * const { loaded, plan, timing } = await renderPage("home", { locale: "en" });
 */
export async function renderPage(
  slug: string,
  resolveCtx: ResolveContext = {},
  planCtx: PlanCtx = {}
): Promise<PipelineResult> {
  return pipeline.run({ slug, resolveCtx, planCtx });
}
