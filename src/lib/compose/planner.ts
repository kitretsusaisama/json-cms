/**
 * @upflame/json-cms — Constraint Satisfaction Planner
 *
 * Fixes applied vs. original:
 *  - globalSlotMap mutable global removed — pass slotMap as parameter
 *  - blocks parameter now accepts Block (includes constraints) not just { tree }
 *  - Block-level constraints evaluated alongside page constraints
 *  - CRLF line endings normalized
 */

import {
  PageV2,
  Block,
  ComponentInstance,
  Constraint,
  Variant,
} from "@/types/composer";
import { evalExpr, safeEvalExpr } from "./logic";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlanResult {
  components: ComponentInstance[];
  warnings: string[];
  errors: string[];
  metrics: PlanMetrics;
}

export interface PlanMetrics {
  totalComponents: number;
  totalWeight: number;
  foldWeight: number;
  constraintsPassed: number;
  constraintsFailed: number;
  variantsSelected: number;
}

export interface PlanCtx extends Record<string, unknown> {
  abBucket?: number;
  metrics?: {
    totalComponents?: number;
    totalWeight?: number;
    foldWeight?: number;
    seo?: Record<string, unknown>;
  };
  components?: ComponentInstance[];
}

export interface PlanPageOptions {
  page: PageV2;
  ctx: PlanCtx;
  globalConstraints?: Constraint[];
  /** Loaded blocks from the resolver (full Block objects) */
  blocks?: Record<string, Block>;
  /**
   * Slot map for slot-aware metrics (optional).
   * Pass this in from the caller — no module-level global state.
   */
  slotMap?: Record<string, { items: ComponentInstance[] }>;
}

// ─── Main planner ─────────────────────────────────────────────────────────────

export function planPage({
  page,
  ctx,
  globalConstraints = [],
  blocks = {},
  slotMap = {},
}: PlanPageOptions): PlanResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  let constraintsPassed = 0;
  let constraintsFailed = 0;
  let variantsSelected = 0;

  // 1. Assemble component sequence: prepend → block trees → append
  const seq: ComponentInstance[] = [];

  if (page.prepend) seq.push(...page.prepend);

  for (const blockId of page.blocks) {
    const block = blocks[blockId];
    if (block) {
      seq.push(...block.tree);
    } else {
      warnings.push(`Block not found: ${blockId}`);
    }
  }

  if (page.append) seq.push(...page.append);

  // 2. Filter by conditions
  const visible = seq.filter((c) => {
    if (!c.conditions || c.conditions.length === 0) return true;
    return c.conditions.every((cond) =>
      Boolean(safeEvalExpr(cond.when, ctx, cond.elseHide))
    );
  });

  // 3. Variant selection
  const resolved = visible.map((c) => {
    if (!c.variants || c.variant) return c;

    const viable = c.variants.filter((v) => {
      if (!v.conditions || v.conditions.length === 0) return true;
      return v.conditions.every((cond) =>
        Boolean(safeEvalExpr(cond.when, ctx, false))
      );
    });

    if (viable.length === 0) return c;

    const pick = selectVariantByWeight(viable, c.id, ctx);
    variantsSelected++;

    return {
      ...c,
      props: { ...c.props, ...pick.props },
      variant: pick.name,
    };
  });

  // 4. Compute metrics
  const totalWeight = resolved.reduce((sum, c) => sum + (c.weight ?? 1), 0);
  const foldWeight = resolved
    .slice(0, 5)
    .reduce((sum, c) => sum + (c.weight ?? 1), 0);

  const contextWithMetrics: PlanCtx = {
    ...ctx,
    components: resolved,
    metrics: {
      totalComponents: resolved.length,
      totalWeight,
      foldWeight,
      seo: calculateSEOMetrics(page, resolved, slotMap),
    },
  };

  // 5. Collect all constraints: page + block-level + global
  const blockConstraints: Constraint[] = Object.values(blocks).flatMap(
    (b) => b.constraints ?? []
  );
  const allConstraints = [
    ...(page.constraints ?? []),
    ...blockConstraints,
    ...globalConstraints,
  ];

  for (const constraint of allConstraints) {
    try {
      const passed = Boolean(evalExpr(constraint.rule, contextWithMetrics));
      if (passed) {
        constraintsPassed++;
      } else {
        constraintsFailed++;
        const msg = `Constraint '${constraint.id}' violated`;
        if (constraint.level === "warn") {
          warnings.push(msg);
        } else {
          errors.push(msg);
        }
      }
    } catch (error) {
      constraintsFailed++;
      errors.push(
        `Constraint '${constraint.id}' evaluation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // 6. Backtracking on hard failures
  if (errors.length > 0) {
    const backtrackResult = attemptBacktracking({
      components: resolved,
      constraints: allConstraints,
      ctx: contextWithMetrics,
      originalErrors: errors,
    });

    if (backtrackResult) {
      const { components: newComps, warnings: newWarnings, resolved: resolvedCount } = backtrackResult;
      const newWeight = newComps.reduce((s, c) => s + (c.weight ?? 1), 0);
      return {
        components: newComps,
        warnings: [...warnings, ...newWarnings],
        errors: [],
        metrics: {
          totalComponents: newComps.length,
          totalWeight: newWeight,
          foldWeight: newComps.slice(0, 5).reduce((s, c) => s + (c.weight ?? 1), 0),
          constraintsPassed: constraintsPassed + resolvedCount,
          constraintsFailed: constraintsFailed - resolvedCount,
          variantsSelected,
        },
      };
    }
  }

  return {
    components: resolved,
    warnings,
    errors,
    metrics: {
      totalComponents: resolved.length,
      totalWeight,
      foldWeight,
      constraintsPassed,
      constraintsFailed,
      variantsSelected,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic variant selection using stable hash of component ID + A/B bucket */
function selectVariantByWeight(
  variants: Variant[],
  componentId: string,
  ctx: PlanCtx
): Variant {
  const sorted = [...variants].sort((a, b) => {
    const diff = (b.weight ?? 1) - (a.weight ?? 1);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

  const abBucket = ctx.abBucket ?? 0;
  const hash = stableHash(`${componentId}:${abBucket}`);
  return sorted[hash % sorted.length];
}

/** djb2 hash — deterministic and fast for short strings */
function stableHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

function calculateSEOMetrics(
  page: PageV2,
  components: ComponentInstance[],
  slotMap: Record<string, { items: ComponentInstance[] }>
): Record<string, number | boolean> {
  const title = page.title ?? "";
  const metaDesc = extractMetaDescription(components) ?? "";

  return {
    titleLength: title.length,
    metaDescLength: metaDesc.length,
    hasOgImage: hasOpenGraphImage(components),
    hasStructuredData: hasStructuredData(components),
    imageAltCount: countImageAlts(components, slotMap),
    headingCount: countHeadings(components, slotMap),
  };
}

function extractMetaDescription(components: ComponentInstance[]): string | null {
  for (const comp of components) {
    if (comp.key === "SEO" || comp.key === "Meta") {
      const desc = comp.props.description ?? comp.props.metaDescription;
      if (typeof desc === "string") return desc;
    }
  }
  return null;
}

function hasOpenGraphImage(components: ComponentInstance[]): boolean {
  return components.some(
    (c) => c.key === "SEO" && (c.props.ogImage || c.props["og:image"])
  );
}

function hasStructuredData(components: ComponentInstance[]): boolean {
  return components.some(
    (c) => c.key === "StructuredData" || c.props.structuredData
  );
}

function countImageAlts(
  components: ComponentInstance[],
  slotMap: Record<string, { items: ComponentInstance[] }>
): number {
  let count = 0;

  function countInComponent(comp: ComponentInstance): void {
    for (const value of Object.values(comp.props)) {
      if (
        typeof value === "object" &&
        value !== null &&
        "alt" in value &&
        typeof (value as Record<string, unknown>).alt === "string" &&
        ((value as Record<string, unknown>).alt as string).trim()
      ) {
        count++;
      }
    }
    comp.slotIds?.forEach((slotId) => {
      slotMap[slotId]?.items.forEach(countInComponent);
    });
  }

  components.forEach(countInComponent);
  return count;
}

function countHeadings(
  components: ComponentInstance[],
  slotMap: Record<string, { items: ComponentInstance[] }>
): number {
  const headingKeys = new Set(["Heading", "Title", "H1", "H2", "H3", "H4", "H5", "H6"]);
  const headingProps = ["heading", "title", "h1", "h2", "h3"];
  let count = 0;

  function countInComponent(comp: ComponentInstance): void {
    if (headingKeys.has(comp.key)) count++;
    for (const prop of headingProps) {
      const v = comp.props[prop];
      if (typeof v === "string" && v.trim()) count++;
    }
    comp.slotIds?.forEach((slotId) => {
      slotMap[slotId]?.items.forEach(countInComponent);
    });
  }

  components.forEach(countInComponent);
  return count;
}

interface BacktrackingArgs {
  components: ComponentInstance[];
  constraints: Constraint[];
  ctx: PlanCtx;
  originalErrors: string[];
}

interface BacktrackingResult {
  components: ComponentInstance[];
  warnings: string[];
  resolved: number;
}

function attemptBacktracking({
  components,
  constraints,
  ctx,
  originalErrors,
}: BacktrackingArgs): BacktrackingResult | null {
  const warnings: string[] = [];
  const sortedByWeight = [...components].sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1));

  for (let i = 0; i < Math.min(3, sortedByWeight.length); i++) {
    const toRemove = sortedByWeight[i];
    const remaining = components.filter((c) => c.id !== toRemove.id);

    const testCtx: PlanCtx = {
      ...ctx,
      components: remaining,
      metrics: {
        ...(ctx.metrics ?? {}),
        totalComponents: remaining.length,
        totalWeight: remaining.reduce((s, c) => s + (c.weight ?? 1), 0),
      },
    };

    const stillFailing = constraints.filter((c) => {
      try {
        return !evalExpr(c.rule, testCtx) && c.level === "error";
      } catch {
        return true;
      }
    });

    if (stillFailing.length === 0) {
      warnings.push(
        `Removed component '${toRemove.id}' (${toRemove.key}) to satisfy constraints`
      );
      return { components: remaining, warnings, resolved: originalErrors.length };
    }
  }

  return null;
}

/** Validate slot compatibility — callable from CLI and tests */
export function validateSlotCompatibility(
  component: ComponentInstance,
  registry: Record<string, { slots?: { name: string; accepts: string[]; items: ComponentInstance[] }[] }>
): string[] {
  const errors: string[] = [];
  if (!component.slotIds || component.slotIds.length === 0) return errors;

  const def = registry[component.key];
  if (!def) {
    errors.push(`Component '${component.key}' not found in registry`);
    return errors;
  }

  for (const slotId of component.slotIds) {
    const slot = def.slots?.find((s) => s.name === slotId);
    if (!slot) continue;
    for (const item of slot.items) {
      if (!slot.accepts.includes(item.key)) {
        errors.push(
          `Component '${item.key}' is not accepted in slot '${slot.name}' of '${component.key}'. ` +
            `Accepts: [${slot.accepts.join(", ")}]`
        );
      }
    }
  }

  return errors;
}
