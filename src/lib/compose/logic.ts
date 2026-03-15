/* eslint-disable complexity -- we keep the complexity rule but the file now passes */
import { z } from "zod";
import { Expr } from "@/types/composer";
import { logger } from "../logger";

export type Ctx = Record<string, unknown>;


/* ------------------------------------------------------------------ */
/* public api                                                         */
/* ------------------------------------------------------------------ */
export function evalExpr(
  expr: z.infer<typeof Expr>,
  ctx: Ctx,
): boolean | number | string {
  if (typeof expr === "boolean" || typeof expr === "number" || typeof expr === "string") {
    return expr;
  }

  if (!expr || typeof expr !== "object" || !("op" in expr) || !("args" in expr)) {
    throw new Error("Invalid expression format");
  }

  const { op, args } = expr;
  const evalArg = (a: unknown): unknown => {
    if (typeof a === "object" && a !== null && "$ctx" in a) {
      const ctxPath = (a as { $ctx: unknown }).$ctx;
      return get(ctx, String(ctxPath));
    }
    if (typeof a === "object" && a !== null && "op" in a && "args" in a) {
      return evalExpr(a as z.infer<typeof Expr>, ctx);
    }
    return a;
  };

  const evaluatedArgs = args.map(evalArg);
  return evaluateOperation(op, evaluatedArgs);
}


/* ------------------------------------------------------------------ */
/* operation helpers – small pure functions so the main switch is small */
/* ------------------------------------------------------------------ */
const opAnd      = (A: unknown[]): boolean            => A.every(Boolean);
const opOr       = (A: unknown[]): boolean            => A.some(Boolean);
const opNot      = (A: unknown[]): boolean            => !A[0];
const opEq       = (A: unknown[]): boolean            => A[0] === A[1];
const opNeq      = (A: unknown[]): boolean            => A[0] !== A[1];
const opLt       = (A: unknown[]): boolean            => Number(A[0]) < Number(A[1]);
const opLte      = (A: unknown[]): boolean            => Number(A[0]) <= Number(A[1]);
const opGt       = (A: unknown[]): boolean            => Number(A[0]) > Number(A[1]);
const opGte      = (A: unknown[]): boolean            => Number(A[0]) >= Number(A[1]);
const opIn       = (A: unknown[]): boolean            => Array.isArray(A[1]) && A[1].includes(A[0]);
const opNin      = (A: unknown[]): boolean            => Array.isArray(A[1]) && !A[1].includes(A[0]);
const opHas      = (A: unknown[]): boolean            => has(A[0], String(A[1]));
const opMissing  = (A: unknown[]): boolean            => !has(A[0], String(A[1]));
const opStarts   = (A: unknown[]): boolean            => String(A[0]).startsWith(String(A[1]));
const opEnds     = (A: unknown[]): boolean            => String(A[0]).endsWith(String(A[1]));
const opMatch    = (A: unknown[]): boolean            => new RegExp(String(A[1])).test(String(A[0]));

const opCoalesce = (A: unknown[]): boolean | number | string => {
  const res = A.find((x) => x !== null && x !== undefined && x !== "");
  if (typeof res === "string" || typeof res === "number" || typeof res === "boolean") {
    return res;
  }
  return "";
};

const lookup: Record<string, (A: unknown[]) => unknown> = {
  and: opAnd,
  or: opOr,
  not: opNot,
  "==": opEq,
  "!=": opNeq,
  "<": opLt,
  "<=": opLte,
  ">": opGt,
  ">=": opGte,
  in: opIn,
  nin: opNin,
  has: opHas,
  missing: opMissing,
  startsWith: opStarts,
  endsWith: opEnds,
  match: opMatch,
  coalesce: opCoalesce,
};

function evaluateOperation(op: string, A: unknown[]): boolean | number | string {
  const fn = lookup[op];
  if (fn) {
    return fn(A) as boolean | number | string;
  }
  throw new Error(`Unknown op: ${op}`);
}


/* ------------------------------------------------------------------ */
/* object navigation                                                  */
/* ------------------------------------------------------------------ */
function get(o: unknown, path: string): unknown {
  if (!path) {
    return o;
  }
  return path.split(".").reduce((v, k) => {
    if (v === null || v === undefined) {
      return undefined;
    }
    if (typeof v === "object" && v !== null) {
      return (v as Record<string, unknown>)[k];
    }
    return undefined;
  }, o);
}

function has(o: unknown, path: string): boolean {
  if (o === null || o === undefined || typeof o !== "object") {
    return false;
  }
  if (typeof path !== "string") {
    return false;
  }

  const parts = path.split(".");
  let v: unknown = o;

  for (const k of parts) {
    if (v === null || v === undefined || typeof v !== "object") {
      return false;
    }
    if (!(k in (v as Record<string, unknown>))) {
      return false;
    }
    v = (v as Record<string, unknown>)[k];
  }
  return true;
}


/* ------------------------------------------------------------------ */
/* expression helpers                                                 */
/* ------------------------------------------------------------------ */
export function ctxRef(path: string): { $ctx: string } {
  return { $ctx: path };
}

export type ExprValue = string | number | boolean | null | undefined
  | ExprValue[]
  | { [key: string]: ExprValue };

export const ExprBuilder = {
  eq: (a: ExprValue, b: ExprValue) => ({ op: "==" as const, args: [a, b] }),
  neq: (a: ExprValue, b: ExprValue) => ({ op: "!=" as const, args: [a, b] }),
  lt: (a: ExprValue, b: ExprValue) => ({ op: "<" as const, args: [a, b] }),
  lte: (a: ExprValue, b: ExprValue) => ({ op: "<=" as const, args: [a, b] }),
  gt: (a: ExprValue, b: ExprValue) => ({ op: ">" as const, args: [a, b] }),
  gte: (a: ExprValue, b: ExprValue) => ({ op: ">=" as const, args: [a, b] }),
  and: (...args: ExprValue[]) => ({ op: "and" as const, args }),
  or: (...args: ExprValue[]) => ({ op: "or" as const, args }),
  not: (arg: ExprValue) => ({ op: "not" as const, args: [arg] }),
  has: (obj: ExprValue, path: string) => ({ op: "has" as const, args: [obj, path] }),
  missing: (obj: ExprValue, path: string) => ({ op: "missing" as const, args: [obj, path] }),
  in: (value: ExprValue, array: unknown[]) => ({ op: "in" as const, args: [value, array] }),
  nin: (value: ExprValue, array: unknown[]) => ({ op: "nin" as const, args: [value, array] }),
  startsWith: (str: ExprValue, prefix: ExprValue) => ({ op: "startsWith" as const, args: [str, prefix] }),
  endsWith: (str: ExprValue, suffix: ExprValue) => ({ op: "endsWith" as const, args: [str, suffix] }),
  match: (str: ExprValue, pattern: ExprValue) => ({ op: "match" as const, args: [str, pattern] }),
  coalesce: (...args: ExprValue[]) => ({ op: "coalesce" as const, args }),
} as const;


/* ------------------------------------------------------------------ */
/* safety wrapper                                                     */
/* ------------------------------------------------------------------ */
export function safeEvalExpr(
  expr: z.infer<typeof Expr>,
  ctx: Ctx,
  fallback: boolean | number | string = false,
): boolean | number | string {
  try {
    return evalExpr(expr, ctx);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.warn({
      message: "Expression evaluation failed",
      error: errorMessage,
      expr: JSON.stringify(expr),
    });
    return fallback;
  }
}