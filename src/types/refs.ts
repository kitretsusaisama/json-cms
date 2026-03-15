import { z } from "zod";

/** Pointer format for referencing other JSON */
export const Pointer = z.object({
  $ref: z.string().regex(/^(block|settings|seo|data|snippet):.+$/)
});

/** Data reference for hydrating props */
export const DataRef = z.object({
  dataRef: z.object({
    source: z.enum(["seo", "product", "user", "inventory", "cms"]),
    key: z.string(),
    transform: z.string().optional(), // optional transformation function name
  })
});

/** Union of all reference types */
export const RefTypes = z.union([
  Pointer,
  DataRef,
  z.object({ $i18n: z.string() }),      // i18n reference
  z.string().regex(/^token:/),          // token reference
]);

export type Pointer = z.infer<typeof Pointer>;
export type DataRef = z.infer<typeof DataRef>;
export type RefTypes = z.infer<typeof RefTypes>;

/** Utilities for working with refs */
export const RefUtils = {
  isPointer: (value: unknown): value is Pointer => {
    try {
      return typeof value === 'object' && value !== null && '$ref' in value;
    } catch {
      return false;
    }
  },
  
  isDataRef: (value: unknown): value is DataRef => {
    try {
      return typeof value === 'object' && value !== null && 'dataRef' in value;
    } catch {
      return false;
    }
  },
  
  isI18nRef: (value: unknown): value is { $i18n: string } => {
    try {
      return typeof value === 'object' && value !== null && '$i18n' in value;
    } catch {
      return false;
    }
  },
  
  isTokenRef: (value: unknown): value is string => {
    return typeof value === 'string' && value.startsWith('token:');
  },
  
  parseRef: (ref: string): { type: string; path: string } => {
    const colonIndex = ref.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid ref format: ${ref}`);
    }

    return {
      type: ref.substring(0, colonIndex),
      path: ref.substring(colonIndex + 1)
    };
  }
};
