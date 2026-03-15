import { z } from "zod";

/** Safe expression DSL (subset of JSONLogic) */
export const Expr = z.union([
  z.boolean(),
  z.number(),
  z.string(),
  z.object({
    op: z.enum([
      "and","or","not",
      "==","!=","<","<=",">",">=",
      "in","nin","has","missing",
      "startsWith","endsWith","match",
      "coalesce"
    ]),
    args: z.array(z.any()).min(1),
  }),
]);

/** Context reference for expressions */
export const CtxRef = z.object({
  $ctx: z.string()
});

/** Conditional visibility */
export const Condition = z.object({
  when: Expr,                    // evaluated against context (env, user, request, settings)
  elseHide: z.boolean().default(true) // if false, render but dim/disabled (optional)
});

/** Constraints = hard rules planner must satisfy */
export const Constraint = z.object({
  id: z.string(),
  level: z.enum(["error","warn"]).default("error"),
  // Examples: enforce "Hero must be first", "<= N above-the-fold components",
  // "title length <= 60", "images have alt", "sum(weight) <= budget"
  rule: Expr
});

/** Design tokens reference */
export const TokenRef = z.string().regex(/^token:[a-z0-9.\-_/]+$/i);

/** Internationalization reference */
export const I18nRef = z.object({
  $i18n: z.string()
});

/** Variants */
export const Variant = z.object({
  name: z.string(),
  props: z.record(z.unknown()).default({}),
  weight: z.number().int().min(0).default(1), // planner can pick by constraints/weights (A/B or targeting)
  conditions: z.array(Condition).optional()
});

/** Forward declarations for circular references */
export type ComponentInstanceType = z.infer<typeof ComponentInstance>;
export type SlotType = z.infer<typeof Slot>;


/** Slots allow composition */
export const Slot = z.object({
  name: z.string(),
  accepts: z.array(z.string()).min(1),
  itemIds: z.array(z.string()).default([]), // store ComponentInstance IDs instead of objects
});

/** Component instance */
export const ComponentInstance = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  props: z.record(z.unknown()).default({}),
  variant: z.string().optional(),
  variants: z.array(Variant).optional(),
  slotIds: z.array(z.string()).optional(), // store Slot IDs instead of objects
  conditions: z.array(Condition).optional(),
  weight: z.number().int().min(0).default(1),
  analytics: z.object({
    id: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

/** Reusable block (named subtree) */
export const Block = z.object({
  id: z.string().min(1),
  // Either define inline tree or a pointer to a fragment
  tree: z.array(ComponentInstance).default([]),
  constraints: z.array(Constraint).optional(),
});

/** Page spec v2 */
export const PageV2 = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  // composition references
  blocks: z.array(z.string()).default([]), // list of Block IDs to mount sequentially
  // optional inline components (mounted before/after blocks)
  prepend: z.array(ComponentInstance).optional(),
  append: z.array(ComponentInstance).optional(),
  // page-level constraints (fold budget, SEO rules, etc.)
  constraints: z.array(Constraint).optional(),
  // context selectors (device, locale, site) for evaluation
  context: z.record(z.unknown()).default({}),
});

// Type exports
export type Expr = z.infer<typeof Expr>;
export type CtxRef = z.infer<typeof CtxRef>;
export type Condition = z.infer<typeof Condition>;
export type Constraint = z.infer<typeof Constraint>;
export type TokenRef = z.infer<typeof TokenRef>;
export type I18nRef = z.infer<typeof I18nRef>;
export type Variant = z.infer<typeof Variant>;
export type Slot = z.infer<typeof Slot>;
export type ComponentInstance = z.infer<typeof ComponentInstance>;
export type Block = z.infer<typeof Block>;
export type PageV2 = z.infer<typeof PageV2>;

/** Manifest for tracking all content */
export const Manifest = z.object({
  pages: z.record(z.object({
    path: z.string(),
    version: z.number(),
    updated: z.string().datetime()
  })),
  blocks: z.record(z.object({
    path: z.string(),
    version: z.number(),
    updated: z.string().datetime()
  })),
  overlays: z.record(z.object({
    scope: z.string(),
    target: z.string(),
    path: z.string()
  })),
  integrity: z.record(z.object({
    sha256: z.string(),
    size: z.number()
  }))
});

export type Manifest = z.infer<typeof Manifest>;
