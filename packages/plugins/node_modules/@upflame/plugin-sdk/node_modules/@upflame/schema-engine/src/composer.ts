import { z } from "zod";

export const Expr = z.union([
  z.boolean(),
  z.number(),
  z.string(),
  z.object({
    op: z.enum([
      "and", "or", "not",
      "==", "!=", "<", "<=", ">", ">=",
      "in", "nin", "has", "missing",
      "startsWith", "endsWith", "match",
      "coalesce",
    ]),
    args: z.array(z.any()).min(1),
  }),
]);

export const CtxRef = z.object({
  $ctx: z.string(),
});

export const Condition = z.object({
  when: Expr,
  elseHide: z.boolean().default(true),
});

export const Constraint = z.object({
  id: z.string(),
  level: z.enum(["error", "warn"]).default("error"),
  rule: Expr,
});

export const TokenRef = z.string().regex(/^token:[a-z0-9.\-_/]+$/i);

export const I18nRef = z.object({
  $i18n: z.string(),
});

export const Variant = z.object({
  name: z.string(),
  props: z.record(z.unknown()).default({}),
  weight: z.number().int().min(0).default(1),
  conditions: z.array(Condition).optional(),
});

export const Slot = z.object({
  name: z.string(),
  accepts: z.array(z.string()).min(1),
  itemIds: z.array(z.string()).default([]),
});

export const ComponentInstance = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  props: z.record(z.unknown()).default({}),
  variant: z.string().optional(),
  variants: z.array(Variant).optional(),
  slotIds: z.array(z.string()).optional(),
  conditions: z.array(Condition).optional(),
  weight: z.number().int().min(0).default(1),
  analytics: z.object({
    id: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

export const Block = z.object({
  id: z.string().min(1),
  tree: z.array(ComponentInstance).default([]),
  constraints: z.array(Constraint).optional(),
});

export const PageV2 = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  blocks: z.array(z.string()).default([]),
  prepend: z.array(ComponentInstance).optional(),
  append: z.array(ComponentInstance).optional(),
  constraints: z.array(Constraint).optional(),
  context: z.record(z.unknown()).default({}),
});

export const Manifest = z.object({
  pages: z.record(z.object({
    path: z.string(),
    version: z.number(),
    updated: z.string().datetime(),
  })),
  blocks: z.record(z.object({
    path: z.string(),
    version: z.number(),
    updated: z.string().datetime(),
  })),
  overlays: z.record(z.object({
    scope: z.string(),
    target: z.string(),
    path: z.string(),
  })),
  integrity: z.record(z.object({
    sha256: z.string(),
    size: z.number(),
  })),
});

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
export type Manifest = z.infer<typeof Manifest>;
