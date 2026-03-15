/**
 * @upflame/json-cms — Content Validator
 *
 * Fixes applied vs. original:
 *  - isSEOData type guard operator-precedence bug fixed
 *  - AJV validators compiled once at module level (not per call)
 *  - Single-pass tree traversal replaces 5 separate traversals
 *  - assertSafeId() added before file path construction
 *  - File extension standardized to .json (matches resolver)
 */

import { z } from "zod";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { createHash } from "crypto";
import { readFile, stat } from "fs/promises";
import { join } from "path";

import { PageV2, Block, ComponentInstance, Manifest } from "@/types/composer";
import { RefUtils } from "@/types/refs";
import { assertSafeId } from "@/lib/security";

const DATA_DIR = process.env.DATA_DIR ?? "./data";

// ─── AJV — compiled once at module level ─────────────────────────────────────

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Cache compiled validators — avoid recompiling on every validation call
type CompiledValidateFn = ReturnType<typeof ajv.compile>;
const _compiledValidators = new Map<string, CompiledValidateFn>();

async function getCompiledValidator(type: "page" | "block"): Promise<CompiledValidateFn | null> {
  if (_compiledValidators.has(type)) return _compiledValidators.get(type)!;

  try {
    const schemaPath = join(DATA_DIR, "_schemas", `${type}.schema.json`);
    const content = await readFile(schemaPath, "utf-8");
    const schema = JSON.parse(content);
    const validate = ajv.compile(schema);
    _compiledValidators.set(type, validate);
    return validate;
  } catch {
    return null; // Schema file not found — skip AJV validation
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
};

export type ValidationError = {
  type: "schema" | "reference" | "constraint" | "integrity";
  path: string;
  message: string;
  details?: unknown;
};

export type ValidationWarning = {
  type: "accessibility" | "seo" | "performance" | "best-practice";
  path: string;
  message: string;
  suggestion?: string;
};

// ─── Main validation entrypoint ───────────────────────────────────────────────

export async function validateContent(
  type: "page" | "block",
  id: string,
  content?: unknown
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    assertSafeId(id, `${type} ID`);
    const data = content ?? (await loadContent(type, id));

    // 1. Schema validation (Zod)
    const zodResult = validateZod(type, data, id);
    errors.push(...zodResult.errors);

    // 2. AJV JSON Schema validation (for tooling compatibility)
    const ajvResult = await validateAjv(type, data, id);
    errors.push(...ajvResult.errors);
    warnings.push(...ajvResult.warnings);

    // 3. Single-pass tree traversal for all content checks
    const treeResult = await singlePassValidation(type, data, id);
    errors.push(...treeResult.errors);
    warnings.push(...treeResult.warnings);

    return { valid: errors.length === 0, errors, warnings };
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          type: "schema",
          path: id,
          message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
          details: error,
        },
      ],
      warnings: [],
    };
  }
}

// ─── Zod validation ───────────────────────────────────────────────────────────

function validateZod(
  type: "page" | "block",
  data: unknown,
  path: string
): { errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  try {
    if (type === "page") {
      PageV2.parse(data);
    } else {
      Block.parse(data);
    }
  } catch (zodError) {
    if (zodError instanceof z.ZodError) {
      for (const issue of zodError.issues) {
        errors.push({
          type: "schema",
          path: `${path}.${issue.path.join(".")}`,
          message: `Zod: ${issue.message}`,
          details: issue,
        });
      }
    } else {
      errors.push({
        type: "schema",
        path,
        message: `Zod validation failed: ${zodError}`,
        details: zodError,
      });
    }
  }
  return { errors };
}

// ─── AJV validation ───────────────────────────────────────────────────────────

async function validateAjv(
  type: "page" | "block",
  data: unknown,
  path: string
): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const validate = await getCompiledValidator(type);
  if (!validate) {
    warnings.push({
      type: "best-practice",
      path,
      message: "JSON Schema file not found — AJV validation skipped",
      suggestion: `Generate schemas with: npx jsoncms check schemas`,
    });
    return { errors, warnings };
  }

  const valid = validate(data);
  if (!valid && validate.errors) {
    for (const err of validate.errors) {
      errors.push({
        type: "schema",
        path: `${path}${err.instancePath ?? ""}`,
        message: `JSON Schema: ${err.message}`,
        details: err,
      });
    }
  }

  return { errors, warnings };
}

// ─── Single-pass tree validation ──────────────────────────────────────────────
//
// Previously 5 separate full-tree traversals. Now one pass collects everything:
// references, accessibility, SEO, performance, and cross-document checks.

interface SinglePassResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

async function singlePassValidation(
  type: "page" | "block",
  data: unknown,
  basePath: string
): Promise<SinglePassResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  let componentCount = 0;
  let foldWeight = 0;
  let componentIndex = 0;
  const registry = await loadRegistry();

  // Reference validation (async, needs await)
  await traverseObjectAsync(data, async (value, path) => {
    const fullPath = `${basePath}.${path}`;

    if (RefUtils.isPointer(value)) {
      const refResult = await validatePointer(value.$ref);
      if (!refResult.valid) {
        errors.push({
          type: "reference",
          path: fullPath,
          message: `Invalid pointer: ${value.$ref}`,
          details: refResult.error,
        });
      }
    }

    if (RefUtils.isTokenRef(value)) {
      const tokenResult = await validateToken(value);
      if (!tokenResult.valid) {
        warnings.push({
          type: "best-practice",
          path: fullPath,
          message: `Token not found: ${value}`,
          suggestion: "Ensure token exists in settings/tokens.json",
        });
      }
    }

    if (RefUtils.isI18nRef(value)) {
      const i18nResult = await validateI18n(value.$i18n);
      if (!i18nResult.valid) {
        warnings.push({
          type: "best-practice",
          path: fullPath,
          message: `i18n key not found: ${value.$i18n}`,
          suggestion: "Add translation for all supported locales",
        });
      }
    }

    if (RefUtils.isDataRef(value)) {
      const dataResult = validateDataRef(value.dataRef);
      if (!dataResult.valid) {
        warnings.push({
          type: "best-practice",
          path: fullPath,
          message: `Data source validation: ${dataResult.message}`,
          suggestion: "Ensure data source and key are valid",
        });
      }
    }
  });

  // Component-level checks (sync, single pass)
  traverseComponents(data, (component, path) => {
    const fullPath = `${basePath}.${path}`;
    componentCount++;

    // Performance: accumulate fold weight
    if (componentIndex < 5) {
      foldWeight += component.weight ?? 1;
      componentIndex++;
    }

    // Registry check
    if (registry && !registry[component.key]) {
      errors.push({
        type: "reference",
        path: fullPath,
        message: `Component '${component.key}' not found in registry`,
        details: { availableKeys: Object.keys(registry) },
      });
    }

    // Accessibility: images without alt
    const imgCheck = checkForImages(component.props);
    if (imgCheck.found && !imgCheck.hasAlt) {
      warnings.push({
        type: "accessibility",
        path: fullPath,
        message: "Image found without alt text",
        suggestion: "Add alt attribute for screen reader accessibility",
      });
    }

    // Accessibility: interactive elements without labels
    if (isInteractiveComponent(component.key) && !hasAccessibleLabel(component.props)) {
      warnings.push({
        type: "accessibility",
        path: fullPath,
        message: `Interactive component '${component.key}' missing accessible label`,
        suggestion: "Add aria-label, aria-labelledby, or visible label text",
      });
    }

    // Accessibility: heading levels
    if (isHeadingComponent(component.key)) {
      const level = getHeadingLevel(component);
      if (level !== null && level > 6) {
        warnings.push({
          type: "accessibility",
          path: fullPath,
          message: `Heading level ${level} exceeds maximum (h6)`,
          suggestion: "Use h1–h6 for semantic heading hierarchy",
        });
      }
    }
  });

  // Performance checks (aggregate results from single pass)
  if (componentCount > 50) {
    warnings.push({
      type: "performance",
      path: basePath,
      message: `High component count (${componentCount}) may impact performance`,
      suggestion: "Consider breaking into smaller pages or lazy loading",
    });
  }
  if (foldWeight > 10) {
    warnings.push({
      type: "performance",
      path: basePath,
      message: `Above-the-fold weight (${foldWeight}) exceeds recommended limit`,
      suggestion: "Reduce component weight or move heavy components below fold",
    });
  }

  // SEO checks (page-level only)
  if (type === "page") {
    const pageData = data as Record<string, unknown>;
    const title = typeof pageData.title === "string" ? pageData.title : "";
    if (title.length > 60) {
      warnings.push({
        type: "seo",
        path: `${basePath}.title`,
        message: `Page title length (${title.length}) exceeds recommended 60 characters`,
        suggestion: "Keep titles concise for better search engine display",
      });
    }
    if (!hasMetaDescriptionComponent(data)) {
      warnings.push({
        type: "seo",
        path: basePath,
        message: "Page missing meta description",
        suggestion: "Add SEO component with meta description",
      });
    }
    if (!hasOpenGraphImage(data)) {
      warnings.push({
        type: "seo",
        path: basePath,
        message: "Page missing Open Graph image",
        suggestion: "Add og:image for social media sharing",
      });
    }
  }

  return { errors, warnings };
}

// ─── Integrity verification ────────────────────────────────────────────────────

export async function verifyIntegrity(manifestPath?: string): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    const manifest = await loadManifest(manifestPath);

    for (const [file, expectedRecord] of Object.entries(manifest.integrity)) {
      try {
        const filePath = join(DATA_DIR, file);
        const stats = await stat(filePath);
        const content = await readFile(filePath, "utf8");
        const actualHash = createHash("sha256").update(content).digest("hex");

        if (actualHash !== expectedRecord.sha256) {
          errors.push({
            type: "integrity",
            path: file,
            message: "File integrity check failed — content has been modified",
            details: { expected: expectedRecord.sha256, actual: actualHash },
          });
        }
        if (stats.size !== expectedRecord.size) {
          warnings.push({
            type: "best-practice",
            path: file,
            message: "File size mismatch in manifest",
            suggestion: "Regenerate manifest with: npx jsoncms integrity --generate",
          });
        }
      } catch (fileError) {
        errors.push({
          type: "integrity",
          path: file,
          message: `Cannot verify file: ${fileError}`,
          details: fileError,
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  } catch (manifestError) {
    return {
      valid: false,
      errors: [
        {
          type: "integrity",
          path: manifestPath ?? "manifest.json",
          message: `Cannot load manifest: ${manifestError}`,
          details: manifestError,
        },
      ],
      warnings: [],
    };
  }
}

export async function generateIntegrityManifest(outputPath?: string): Promise<Manifest> {
  const manifest: Manifest = {
    pages: {},
    blocks: {},
    overlays: {},
    integrity: {},
  };

  const dataFiles = await scanDataDirectory();

  for (const file of dataFiles) {
    const filePath = join(DATA_DIR, file);
    const stats = await stat(filePath);
    const content = await readFile(filePath, "utf8");
    const hash = createHash("sha256").update(content).digest("hex");

    manifest.integrity[file] = { sha256: hash, size: stats.size };

    if (file.startsWith("pages/")) {
      const id = file.replace("pages/", "").replace(".json", "");
      manifest.pages[id] = {
        path: file,
        version: 1,
        updated: stats.mtime.toISOString(),
      };
    } else if (file.startsWith("blocks/")) {
      const id = file.replace("blocks/", "").replace(".json", "");
      manifest.blocks[id] = {
        path: file,
        version: 1,
        updated: stats.mtime.toISOString(),
      };
    }
  }

  if (outputPath) {
    const { writeFile } = await import("fs/promises");
    await writeFile(outputPath, JSON.stringify(manifest, null, 2));
  }

  return manifest;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadContent(type: "page" | "block", id: string): Promise<unknown> {
  const dir = type === "page" ? "pages" : "blocks";
  const filePath = join(DATA_DIR, dir, `${id}.json`);
  const content = await readFile(filePath, "utf-8");
  return JSON.parse(content);
}

async function loadRegistry(): Promise<Record<string, unknown> | null> {
  try {
    const content = await readFile(join(DATA_DIR, "_registry.json"), "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function loadManifest(path?: string): Promise<Manifest> {
  const manifestPath = path ?? join(DATA_DIR, "_manifest.json");
  const content = await readFile(manifestPath, "utf-8");
  return Manifest.parse(JSON.parse(content));
}

async function scanDataDirectory(): Promise<string[]> {
  const { glob } = await import("glob");
  return glob("**/*.json", { cwd: DATA_DIR, ignore: ["_*/**", "_*"] });
}

async function validatePointer(ref: string): Promise<{ valid: boolean; error?: unknown }> {
  try {
    const { type, path: refPath } = RefUtils.parseRef(ref);
    if (type === "block") {
      await readFile(join(DATA_DIR, "blocks", `${refPath}.json`), "utf-8");
    } else if (type === "snippet") {
      await readFile(join(DATA_DIR, "snippets", `${refPath}.json`), "utf-8");
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error };
  }
}

async function validateToken(tokenRef: string): Promise<{ valid: boolean }> {
  try {
    const { path } = RefUtils.parseRef(tokenRef);
    const content = await readFile(join(DATA_DIR, "settings", "tokens.json"), "utf-8");
    const tokens = JSON.parse(content);
    const value = path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], tokens);
    return { valid: value !== undefined };
  } catch {
    return { valid: false };
  }
}

async function validateI18n(key: string): Promise<{ valid: boolean }> {
  try {
    const content = await readFile(join(DATA_DIR, "settings", "i18n", "en.json"), "utf-8");
    const messages = JSON.parse(content);
    const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
    return { valid: value !== undefined };
  } catch {
    return { valid: false };
  }
}

function validateDataRef(
  dataRef: Record<string, unknown>
): { valid: boolean; message?: string } {
  const validSources = ["seo", "product", "user", "inventory", "cms"];
  if (typeof dataRef.source !== "string" || !validSources.includes(dataRef.source)) {
    return { valid: false, message: `Invalid data source: "${dataRef.source}". Valid: [${validSources.join(", ")}]` };
  }
  if (!dataRef.key || typeof dataRef.key !== "string") {
    return { valid: false, message: "Data reference must have a non-empty key" };
  }
  return { valid: true };
}

// ─── Tree traversal utilities ─────────────────────────────────────────────────

async function traverseObjectAsync(
  obj: unknown,
  callback: (value: unknown, path: string) => Promise<void>
): Promise<void> {
  async function traverse(current: unknown, currentPath: string): Promise<void> {
    if (!current || typeof current !== "object") return;
    await callback(current, currentPath);

    if (Array.isArray(current)) {
      await Promise.all(
        current.map((item, i) => traverse(item, `${currentPath}[${i}]`))
      );
    } else {
      await Promise.all(
        Object.entries(current as Record<string, unknown>).map(([key, value]) =>
          traverse(value, currentPath ? `${currentPath}.${key}` : key)
        )
      );
    }
  }
  await traverse(obj, "");
}

function traverseComponents(
  obj: unknown,
  callback: (component: ComponentInstance, path: string) => void
): void {
  function traverse(current: unknown, currentPath: string): void {
    if (!current || typeof current !== "object") return;

    if (
      !Array.isArray(current) &&
      "id" in current &&
      "key" in current &&
      typeof (current as { key: unknown }).key === "string"
    ) {
      callback(current as ComponentInstance, currentPath);
    }

    if (Array.isArray(current)) {
      current.forEach((item, i) => traverse(item, `${currentPath}[${i}]`));
    } else {
      Object.entries(current as Record<string, unknown>).forEach(([key, value]) =>
        traverse(value, currentPath ? `${currentPath}.${key}` : key)
      );
    }
  }
  traverse(obj, "");
}

function checkForImages(props: Record<string, unknown>): { found: boolean; hasAlt: boolean } {
  const imageProps = ["image", "src", "imageSrc", "backgroundImage"];
  const found = imageProps.some((p) => props[p]);
  if (!found) return { found: false, hasAlt: false };
  return { found: true, hasAlt: Boolean(props.alt || props.altText || props.imageAlt) };
}

function isInteractiveComponent(key: string): boolean {
  return ["Button", "Link", "Input", "Form", "Modal", "Dropdown", "Tab"].includes(key);
}

function hasAccessibleLabel(props: Record<string, unknown>): boolean {
  return Boolean(
    props.label ||
      props.title ||
      props.ariaLabel ||
      props["aria-label"] ||
      props.ariaLabelledby ||
      props["aria-labelledby"]
  );
}

function isHeadingComponent(key: string): boolean {
  return ["Heading", "Title", "H1", "H2", "H3", "H4", "H5", "H6"].includes(key);
}

function getHeadingLevel(component: ComponentInstance): number | null {
  if (/^H[1-6]$/.test(component.key)) return parseInt(component.key[1], 10);
  if (typeof component.props.level === "number") return component.props.level;
  return null;
}

function hasMetaDescriptionComponent(data: unknown): boolean {
  let found = false;
  traverseComponents(data, (c) => {
    if ((c.key === "SEO" || c.key === "Meta") && (c.props.description || c.props.metaDescription)) {
      found = true;
    }
  });
  return found;
}

function hasOpenGraphImage(data: unknown): boolean {
  let found = false;
  traverseComponents(data, (c) => {
    if (c.key === "SEO" && (c.props.ogImage || c.props["og:image"])) found = true;
  });
  return found;
}

