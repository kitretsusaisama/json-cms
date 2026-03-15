import { ContentTypeDefinition, ContentTypeSchema, FieldDefinition } from "@/core/content/schemas";

export type SchemaSource = "core" | "plugin" | "manifest" | "user";

export interface ContentTypeRecord {
  type: ContentTypeDefinition;
  source: SchemaSource;
  pluginId?: string;
}

export interface CompiledContentType {
  name: string;
  label: string;
  description?: string;
  jsonSchema: Record<string, unknown>;
}

export interface RegisterContentTypeOptions {
  source?: SchemaSource;
  pluginId?: string;
}

function normalizeEnum(input: unknown): unknown[] | undefined {
  if (!Array.isArray(input)) {
    return undefined;
  }
  return input.filter((value) => value !== undefined && value !== null);
}

function fieldToJsonSchema(field: FieldDefinition): Record<string, unknown> {
  let schema: Record<string, unknown>;
  switch (field.type) {
    case "number":
      schema = { type: "number" };
      break;
    case "boolean":
      schema = { type: "boolean" };
      break;
    case "date":
      schema = { type: "string", format: "date-time" };
      break;
    case "json":
      schema = { type: "object", additionalProperties: true };
      break;
    case "component":
      schema = { type: "object", additionalProperties: true };
      break;
    case "media":
      schema = { type: "object", additionalProperties: true };
      break;
    case "relation":
      schema = { type: "object", additionalProperties: true };
      break;
    case "select": {
      const enumValues = normalizeEnum(field.validation?.enum ?? field.ui?.options);
      schema = enumValues ? { type: "string", enum: enumValues } : { type: "string" };
      break;
    }
    case "rich-text":
    case "text":
    default:
      schema = { type: "string" };
  }

  if (field.repeatable) {
    schema = { type: "array", items: schema };
  }

  return {
    title: field.label,
    description: field.description,
    ...schema,
  };
}

function compileContentType(type: ContentTypeDefinition): CompiledContentType {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of type.fields) {
    properties[field.name] = fieldToJsonSchema(field);
    if (field.required) {
      required.push(field.name);
    }
  }

  return {
    name: type.name,
    label: type.label,
    description: type.description,
    jsonSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: type.label,
      description: type.description,
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
      additionalProperties: true,
    },
  };
}

export class ContentSchemaRegistry {
  private readonly types = new Map<string, ContentTypeRecord>();
  private readonly pluginEntries = new Map<string, Set<string>>();

  register(type: ContentTypeDefinition, options: RegisterContentTypeOptions = {}): ContentTypeRecord {
    const validated = ContentTypeSchema.parse(type);
    const record: ContentTypeRecord = {
      type: validated,
      source: options.source ?? "core",
      pluginId: options.pluginId,
    };

    this.types.set(validated.name, record);

    if (record.pluginId) {
      if (!this.pluginEntries.has(record.pluginId)) {
        this.pluginEntries.set(record.pluginId, new Set());
      }
      this.pluginEntries.get(record.pluginId)!.add(validated.name);
    }

    return record;
  }

  registerMany(types: ContentTypeDefinition[], options: RegisterContentTypeOptions = {}): ContentTypeRecord[] {
    return types.map((type) => this.register(type, options));
  }

  get(name: string): ContentTypeRecord | null {
    return this.types.get(name) ?? null;
  }

  list(): ContentTypeRecord[] {
    return [...this.types.values()].sort((left, right) => left.type.name.localeCompare(right.type.name));
  }

  compile(name: string): CompiledContentType | null {
    const record = this.types.get(name);
    if (!record) {
      return null;
    }
    return compileContentType(record.type);
  }

  compileAll(): CompiledContentType[] {
    return this.list().map((record) => compileContentType(record.type));
  }

  unregister(name: string): void {
    const record = this.types.get(name);
    if (!record) {
      return;
    }

    this.types.delete(name);
    if (record.pluginId) {
      this.pluginEntries.get(record.pluginId)?.delete(name);
    }
  }

  unregisterPlugin(pluginId: string): void {
    const names = this.pluginEntries.get(pluginId);
    if (!names) {
      return;
    }

    for (const name of names) {
      this.types.delete(name);
    }

    this.pluginEntries.delete(pluginId);
  }
}

export const schemaRegistry = new ContentSchemaRegistry();
