import { z } from "zod";
export declare const WorkflowStatusSchema: z.ZodEnum<["draft", "published", "archived"]>;
export declare const RoleSchema: z.ZodEnum<["viewer", "editor", "admin"]>;
export declare const PermissionPolicySchema: z.ZodObject<{
    resource: z.ZodString;
    actions: z.ZodArray<z.ZodString, "many">;
    roles: z.ZodDefault<z.ZodArray<z.ZodEnum<["viewer", "editor", "admin"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    resource: string;
    actions: string[];
    roles: ("viewer" | "editor" | "admin")[];
}, {
    resource: string;
    actions: string[];
    roles?: ("viewer" | "editor" | "admin")[] | undefined;
}>;
export declare const SeoMetadataSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    keywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    canonicalUrl: z.ZodOptional<z.ZodString>;
    ogImage: z.ZodOptional<z.ZodString>;
    structuredData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    noIndex: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    keywords: string[];
    noIndex: boolean;
    canonicalUrl?: string | undefined;
    ogImage?: string | undefined;
    structuredData?: Record<string, unknown> | undefined;
}, {
    title: string;
    description: string;
    keywords?: string[] | undefined;
    canonicalUrl?: string | undefined;
    ogImage?: string | undefined;
    structuredData?: Record<string, unknown> | undefined;
    noIndex?: boolean | undefined;
}>;
export declare const WorkflowStateSchema: z.ZodObject<{
    status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
    version: z.ZodDefault<z.ZodNumber>;
    publishedAt: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    createdBy: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
    updatedBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "published" | "archived";
    version: number;
    publishedAt?: string | undefined;
    createdAt?: string | undefined;
    createdBy?: string | undefined;
    updatedAt?: string | undefined;
    updatedBy?: string | undefined;
}, {
    status?: "draft" | "published" | "archived" | undefined;
    version?: number | undefined;
    publishedAt?: string | undefined;
    createdAt?: string | undefined;
    createdBy?: string | undefined;
    updatedAt?: string | undefined;
    updatedBy?: string | undefined;
}>;
export declare const LocalizationBundleSchema: z.ZodObject<{
    defaultLocale: z.ZodDefault<z.ZodString>;
    locales: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodString>>>;
    fallbackLocale: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    defaultLocale: string;
    locales: Record<string, Record<string, string>>;
    fallbackLocale: string;
}, {
    defaultLocale?: string | undefined;
    locales?: Record<string, Record<string, string>> | undefined;
    fallbackLocale?: string | undefined;
}>;
export declare const MediaAssetSchema: z.ZodObject<{
    id: z.ZodString;
    src: z.ZodString;
    alt: z.ZodDefault<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    provider: z.ZodDefault<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    src: string;
    alt: string;
    provider: string;
    metadata: Record<string, unknown>;
    mimeType?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
}, {
    id: string;
    src: string;
    alt?: string | undefined;
    mimeType?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    provider?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const FieldDefinitionSchema: z.ZodObject<{
    name: z.ZodString;
    label: z.ZodString;
    type: z.ZodEnum<["text", "rich-text", "number", "boolean", "date", "select", "relation", "media", "json", "component"]>;
    required: z.ZodDefault<z.ZodBoolean>;
    repeatable: z.ZodDefault<z.ZodBoolean>;
    description: z.ZodOptional<z.ZodString>;
    validation: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    ui: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    validation: Record<string, unknown>;
    type: "number" | "boolean" | "date" | "text" | "rich-text" | "select" | "relation" | "media" | "json" | "component";
    name: string;
    label: string;
    required: boolean;
    repeatable: boolean;
    ui: Record<string, unknown>;
    description?: string | undefined;
}, {
    type: "number" | "boolean" | "date" | "text" | "rich-text" | "select" | "relation" | "media" | "json" | "component";
    name: string;
    label: string;
    validation?: Record<string, unknown> | undefined;
    description?: string | undefined;
    required?: boolean | undefined;
    repeatable?: boolean | undefined;
    ui?: Record<string, unknown> | undefined;
}>;
export declare const ContentTypeSchema: z.ZodObject<{
    name: z.ZodString;
    label: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    fields: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        label: z.ZodString;
        type: z.ZodEnum<["text", "rich-text", "number", "boolean", "date", "select", "relation", "media", "json", "component"]>;
        required: z.ZodDefault<z.ZodBoolean>;
        repeatable: z.ZodDefault<z.ZodBoolean>;
        description: z.ZodOptional<z.ZodString>;
        validation: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        ui: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        validation: Record<string, unknown>;
        type: "number" | "boolean" | "date" | "text" | "rich-text" | "select" | "relation" | "media" | "json" | "component";
        name: string;
        label: string;
        required: boolean;
        repeatable: boolean;
        ui: Record<string, unknown>;
        description?: string | undefined;
    }, {
        type: "number" | "boolean" | "date" | "text" | "rich-text" | "select" | "relation" | "media" | "json" | "component";
        name: string;
        label: string;
        validation?: Record<string, unknown> | undefined;
        description?: string | undefined;
        required?: boolean | undefined;
        repeatable?: boolean | undefined;
        ui?: Record<string, unknown> | undefined;
    }>, "many">;
    layout: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    render: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    seo: z.ZodOptional<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        keywords: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
        canonicalUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        ogImage: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        structuredData: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        noIndex: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        title?: string | undefined;
        description?: string | undefined;
        keywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
        ogImage?: string | undefined;
        structuredData?: Record<string, unknown> | undefined;
        noIndex?: boolean | undefined;
    }, {
        title?: string | undefined;
        description?: string | undefined;
        keywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
        ogImage?: string | undefined;
        structuredData?: Record<string, unknown> | undefined;
        noIndex?: boolean | undefined;
    }>>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        resource: z.ZodString;
        actions: z.ZodArray<z.ZodString, "many">;
        roles: z.ZodDefault<z.ZodArray<z.ZodEnum<["viewer", "editor", "admin"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        resource: string;
        actions: string[];
        roles: ("viewer" | "editor" | "admin")[];
    }, {
        resource: string;
        actions: string[];
        roles?: ("viewer" | "editor" | "admin")[] | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    label: string;
    fields: {
        validation: Record<string, unknown>;
        type: "number" | "boolean" | "date" | "text" | "rich-text" | "select" | "relation" | "media" | "json" | "component";
        name: string;
        label: string;
        required: boolean;
        repeatable: boolean;
        ui: Record<string, unknown>;
        description?: string | undefined;
    }[];
    layout: Record<string, unknown>;
    render: Record<string, unknown>;
    permissions: {
        resource: string;
        actions: string[];
        roles: ("viewer" | "editor" | "admin")[];
    }[];
    description?: string | undefined;
    seo?: {
        title?: string | undefined;
        description?: string | undefined;
        keywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
        ogImage?: string | undefined;
        structuredData?: Record<string, unknown> | undefined;
        noIndex?: boolean | undefined;
    } | undefined;
}, {
    name: string;
    label: string;
    fields: {
        type: "number" | "boolean" | "date" | "text" | "rich-text" | "select" | "relation" | "media" | "json" | "component";
        name: string;
        label: string;
        validation?: Record<string, unknown> | undefined;
        description?: string | undefined;
        required?: boolean | undefined;
        repeatable?: boolean | undefined;
        ui?: Record<string, unknown> | undefined;
    }[];
    description?: string | undefined;
    layout?: Record<string, unknown> | undefined;
    render?: Record<string, unknown> | undefined;
    seo?: {
        title?: string | undefined;
        description?: string | undefined;
        keywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
        ogImage?: string | undefined;
        structuredData?: Record<string, unknown> | undefined;
        noIndex?: boolean | undefined;
    } | undefined;
    permissions?: {
        resource: string;
        actions: string[];
        roles?: ("viewer" | "editor" | "admin")[] | undefined;
    }[] | undefined;
}>;
export declare const ComponentSlotSchema: z.ZodObject<{
    name: z.ZodString;
    accepts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    items: z.ZodDefault<z.ZodArray<z.ZodUnknown, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    accepts: string[];
    items: unknown[];
}, {
    name: string;
    accepts?: string[] | undefined;
    items?: unknown[] | undefined;
}>;
export declare const ComponentInputSchema: z.ZodType<Record<string, unknown>>;
export declare const CmsBlockSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    tree: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
    content: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    constraints: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
        rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
            op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
            args: z.ZodArray<z.ZodAny, "many">;
        }, "strip", z.ZodTypeAny, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }>]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        level: "error" | "warn";
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
    }, {
        id: string;
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
        level?: "error" | "warn" | undefined;
    }>, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    workflow: z.ZodDefault<z.ZodObject<{
        status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
        version: z.ZodDefault<z.ZodNumber>;
        publishedAt: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        createdBy: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
        updatedBy: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "draft" | "published" | "archived";
        version: number;
        publishedAt?: string | undefined;
        createdAt?: string | undefined;
        createdBy?: string | undefined;
        updatedAt?: string | undefined;
        updatedBy?: string | undefined;
    }, {
        status?: "draft" | "published" | "archived" | undefined;
        version?: number | undefined;
        publishedAt?: string | undefined;
        createdAt?: string | undefined;
        createdBy?: string | undefined;
        updatedAt?: string | undefined;
        updatedBy?: string | undefined;
    }>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    tree: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
    content: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    constraints: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
        rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
            op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
            args: z.ZodArray<z.ZodAny, "many">;
        }, "strip", z.ZodTypeAny, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }>]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        level: "error" | "warn";
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
    }, {
        id: string;
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
        level?: "error" | "warn" | undefined;
    }>, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    workflow: z.ZodDefault<z.ZodObject<{
        status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
        version: z.ZodDefault<z.ZodNumber>;
        publishedAt: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        createdBy: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
        updatedBy: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "draft" | "published" | "archived";
        version: number;
        publishedAt?: string | undefined;
        createdAt?: string | undefined;
        createdBy?: string | undefined;
        updatedAt?: string | undefined;
        updatedBy?: string | undefined;
    }, {
        status?: "draft" | "published" | "archived" | undefined;
        version?: number | undefined;
        publishedAt?: string | undefined;
        createdAt?: string | undefined;
        createdBy?: string | undefined;
        updatedAt?: string | undefined;
        updatedBy?: string | undefined;
    }>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    tree: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
    content: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    constraints: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
        rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
            op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
            args: z.ZodArray<z.ZodAny, "many">;
        }, "strip", z.ZodTypeAny, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }>]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        level: "error" | "warn";
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
    }, {
        id: string;
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
        level?: "error" | "warn" | undefined;
    }>, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    workflow: z.ZodDefault<z.ZodObject<{
        status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
        version: z.ZodDefault<z.ZodNumber>;
        publishedAt: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        createdBy: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
        updatedBy: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "draft" | "published" | "archived";
        version: number;
        publishedAt?: string | undefined;
        createdAt?: string | undefined;
        createdBy?: string | undefined;
        updatedAt?: string | undefined;
        updatedBy?: string | undefined;
    }, {
        status?: "draft" | "published" | "archived" | undefined;
        version?: number | undefined;
        publishedAt?: string | undefined;
        createdAt?: string | undefined;
        createdBy?: string | undefined;
        updatedAt?: string | undefined;
        updatedBy?: string | undefined;
    }>>;
}, z.ZodTypeAny, "passthrough">>;
export declare const CmsPageSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    blocks: z.ZodDefault<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tree: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
        content: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        constraints: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
            rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
                op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
                args: z.ZodArray<z.ZodAny, "many">;
            }, "strip", z.ZodTypeAny, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }>]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            level: "error" | "warn";
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
        }, {
            id: string;
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            level?: "error" | "warn" | undefined;
        }>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        workflow: z.ZodDefault<z.ZodObject<{
            status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
            version: z.ZodDefault<z.ZodNumber>;
            publishedAt: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodOptional<z.ZodString>;
            createdBy: z.ZodOptional<z.ZodString>;
            updatedAt: z.ZodOptional<z.ZodString>;
            updatedBy: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "draft" | "published" | "archived";
            version: number;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }, {
            status?: "draft" | "published" | "archived" | undefined;
            version?: number | undefined;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tree: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
        content: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        constraints: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
            rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
                op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
                args: z.ZodArray<z.ZodAny, "many">;
            }, "strip", z.ZodTypeAny, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }>]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            level: "error" | "warn";
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
        }, {
            id: string;
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            level?: "error" | "warn" | undefined;
        }>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        workflow: z.ZodDefault<z.ZodObject<{
            status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
            version: z.ZodDefault<z.ZodNumber>;
            publishedAt: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodOptional<z.ZodString>;
            createdBy: z.ZodOptional<z.ZodString>;
            updatedAt: z.ZodOptional<z.ZodString>;
            updatedBy: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "draft" | "published" | "archived";
            version: number;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }, {
            status?: "draft" | "published" | "archived" | undefined;
            version?: number | undefined;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tree: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
        content: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        constraints: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
            rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
                op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
                args: z.ZodArray<z.ZodAny, "many">;
            }, "strip", z.ZodTypeAny, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }>]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            level: "error" | "warn";
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
        }, {
            id: string;
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            level?: "error" | "warn" | undefined;
        }>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        workflow: z.ZodDefault<z.ZodObject<{
            status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
            version: z.ZodDefault<z.ZodNumber>;
            publishedAt: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodOptional<z.ZodString>;
            createdBy: z.ZodOptional<z.ZodString>;
            updatedAt: z.ZodOptional<z.ZodString>;
            updatedBy: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "draft" | "published" | "archived";
            version: number;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }, {
            status?: "draft" | "published" | "archived" | undefined;
            version?: number | undefined;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }>>;
    }, z.ZodTypeAny, "passthrough">>]>, "many">>;
    prepend: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
    append: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
    constraints: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
        rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
            op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
            args: z.ZodArray<z.ZodAny, "many">;
        }, "strip", z.ZodTypeAny, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }>]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        level: "error" | "warn";
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
    }, {
        id: string;
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
        level?: "error" | "warn" | undefined;
    }>, "many">>;
    context: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    seo: z.ZodOptional<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
        keywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        canonicalUrl: z.ZodOptional<z.ZodString>;
        ogImage: z.ZodOptional<z.ZodString>;
        structuredData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        noIndex: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
        keywords: string[];
        noIndex: boolean;
        canonicalUrl?: string | undefined;
        ogImage?: string | undefined;
        structuredData?: Record<string, unknown> | undefined;
    }, {
        title: string;
        description: string;
        keywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
        ogImage?: string | undefined;
        structuredData?: Record<string, unknown> | undefined;
        noIndex?: boolean | undefined;
    }>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        resource: z.ZodString;
        actions: z.ZodArray<z.ZodString, "many">;
        roles: z.ZodDefault<z.ZodArray<z.ZodEnum<["viewer", "editor", "admin"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        resource: string;
        actions: string[];
        roles: ("viewer" | "editor" | "admin")[];
    }, {
        resource: string;
        actions: string[];
        roles?: ("viewer" | "editor" | "admin")[] | undefined;
    }>, "many">>;
    workflow: z.ZodDefault<z.ZodObject<{
        status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
        version: z.ZodDefault<z.ZodNumber>;
        publishedAt: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        createdBy: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
        updatedBy: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "draft" | "published" | "archived";
        version: number;
        publishedAt?: string | undefined;
        createdAt?: string | undefined;
        createdBy?: string | undefined;
        updatedAt?: string | undefined;
        updatedBy?: string | undefined;
    }, {
        status?: "draft" | "published" | "archived" | undefined;
        version?: number | undefined;
        publishedAt?: string | undefined;
        createdAt?: string | undefined;
        createdBy?: string | undefined;
        updatedAt?: string | undefined;
        updatedBy?: string | undefined;
    }>>;
    contentType: z.ZodDefault<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    blocks: z.ZodDefault<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tree: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
        content: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        constraints: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
            rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
                op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
                args: z.ZodArray<z.ZodAny, "many">;
            }, "strip", z.ZodTypeAny, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }>]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            level: "error" | "warn";
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
        }, {
            id: string;
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            level?: "error" | "warn" | undefined;
        }>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        workflow: z.ZodDefault<z.ZodObject<{
            status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
            version: z.ZodDefault<z.ZodNumber>;
            publishedAt: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodOptional<z.ZodString>;
            createdBy: z.ZodOptional<z.ZodString>;
            updatedAt: z.ZodOptional<z.ZodString>;
            updatedBy: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "draft" | "published" | "archived";
            version: number;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }, {
            status?: "draft" | "published" | "archived" | undefined;
            version?: number | undefined;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tree: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
        content: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        constraints: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
            rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
                op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
                args: z.ZodArray<z.ZodAny, "many">;
            }, "strip", z.ZodTypeAny, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }>]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            level: "error" | "warn";
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
        }, {
            id: string;
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            level?: "error" | "warn" | undefined;
        }>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        workflow: z.ZodDefault<z.ZodObject<{
            status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
            version: z.ZodDefault<z.ZodNumber>;
            publishedAt: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodOptional<z.ZodString>;
            createdBy: z.ZodOptional<z.ZodString>;
            updatedAt: z.ZodOptional<z.ZodString>;
            updatedBy: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "draft" | "published" | "archived";
            version: number;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }, {
            status?: "draft" | "published" | "archived" | undefined;
            version?: number | undefined;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tree: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
        content: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        constraints: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
            rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
                op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
                args: z.ZodArray<z.ZodAny, "many">;
            }, "strip", z.ZodTypeAny, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }>]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            level: "error" | "warn";
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
        }, {
            id: string;
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            level?: "error" | "warn" | undefined;
        }>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        workflow: z.ZodDefault<z.ZodObject<{
            status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
            version: z.ZodDefault<z.ZodNumber>;
            publishedAt: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodOptional<z.ZodString>;
            createdBy: z.ZodOptional<z.ZodString>;
            updatedAt: z.ZodOptional<z.ZodString>;
            updatedBy: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "draft" | "published" | "archived";
            version: number;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }, {
            status?: "draft" | "published" | "archived" | undefined;
            version?: number | undefined;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }>>;
    }, z.ZodTypeAny, "passthrough">>]>, "many">>;
    prepend: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
    append: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
    constraints: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
        rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
            op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
            args: z.ZodArray<z.ZodAny, "many">;
        }, "strip", z.ZodTypeAny, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }>]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        level: "error" | "warn";
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
    }, {
        id: string;
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
        level?: "error" | "warn" | undefined;
    }>, "many">>;
    context: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    seo: z.ZodOptional<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
        keywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        canonicalUrl: z.ZodOptional<z.ZodString>;
        ogImage: z.ZodOptional<z.ZodString>;
        structuredData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        noIndex: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
        keywords: string[];
        noIndex: boolean;
        canonicalUrl?: string | undefined;
        ogImage?: string | undefined;
        structuredData?: Record<string, unknown> | undefined;
    }, {
        title: string;
        description: string;
        keywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
        ogImage?: string | undefined;
        structuredData?: Record<string, unknown> | undefined;
        noIndex?: boolean | undefined;
    }>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        resource: z.ZodString;
        actions: z.ZodArray<z.ZodString, "many">;
        roles: z.ZodDefault<z.ZodArray<z.ZodEnum<["viewer", "editor", "admin"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        resource: string;
        actions: string[];
        roles: ("viewer" | "editor" | "admin")[];
    }, {
        resource: string;
        actions: string[];
        roles?: ("viewer" | "editor" | "admin")[] | undefined;
    }>, "many">>;
    workflow: z.ZodDefault<z.ZodObject<{
        status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
        version: z.ZodDefault<z.ZodNumber>;
        publishedAt: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        createdBy: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
        updatedBy: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "draft" | "published" | "archived";
        version: number;
        publishedAt?: string | undefined;
        createdAt?: string | undefined;
        createdBy?: string | undefined;
        updatedAt?: string | undefined;
        updatedBy?: string | undefined;
    }, {
        status?: "draft" | "published" | "archived" | undefined;
        version?: number | undefined;
        publishedAt?: string | undefined;
        createdAt?: string | undefined;
        createdBy?: string | undefined;
        updatedAt?: string | undefined;
        updatedBy?: string | undefined;
    }>>;
    contentType: z.ZodDefault<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    blocks: z.ZodDefault<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tree: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
        content: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        constraints: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
            rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
                op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
                args: z.ZodArray<z.ZodAny, "many">;
            }, "strip", z.ZodTypeAny, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }>]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            level: "error" | "warn";
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
        }, {
            id: string;
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            level?: "error" | "warn" | undefined;
        }>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        workflow: z.ZodDefault<z.ZodObject<{
            status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
            version: z.ZodDefault<z.ZodNumber>;
            publishedAt: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodOptional<z.ZodString>;
            createdBy: z.ZodOptional<z.ZodString>;
            updatedAt: z.ZodOptional<z.ZodString>;
            updatedBy: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "draft" | "published" | "archived";
            version: number;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }, {
            status?: "draft" | "published" | "archived" | undefined;
            version?: number | undefined;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tree: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
        content: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        constraints: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
            rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
                op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
                args: z.ZodArray<z.ZodAny, "many">;
            }, "strip", z.ZodTypeAny, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }>]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            level: "error" | "warn";
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
        }, {
            id: string;
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            level?: "error" | "warn" | undefined;
        }>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        workflow: z.ZodDefault<z.ZodObject<{
            status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
            version: z.ZodDefault<z.ZodNumber>;
            publishedAt: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodOptional<z.ZodString>;
            createdBy: z.ZodOptional<z.ZodString>;
            updatedAt: z.ZodOptional<z.ZodString>;
            updatedBy: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "draft" | "published" | "archived";
            version: number;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }, {
            status?: "draft" | "published" | "archived" | undefined;
            version?: number | undefined;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tree: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
        content: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        constraints: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
            rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
                op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
                args: z.ZodArray<z.ZodAny, "many">;
            }, "strip", z.ZodTypeAny, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }>]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            level: "error" | "warn";
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
        }, {
            id: string;
            rule: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            level?: "error" | "warn" | undefined;
        }>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        workflow: z.ZodDefault<z.ZodObject<{
            status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
            version: z.ZodDefault<z.ZodNumber>;
            publishedAt: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodOptional<z.ZodString>;
            createdBy: z.ZodOptional<z.ZodString>;
            updatedAt: z.ZodOptional<z.ZodString>;
            updatedBy: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "draft" | "published" | "archived";
            version: number;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }, {
            status?: "draft" | "published" | "archived" | undefined;
            version?: number | undefined;
            publishedAt?: string | undefined;
            createdAt?: string | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
        }>>;
    }, z.ZodTypeAny, "passthrough">>]>, "many">>;
    prepend: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
    append: z.ZodDefault<z.ZodArray<z.ZodType<Record<string, unknown>, z.ZodTypeDef, Record<string, unknown>>, "many">>;
    constraints: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
        rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
            op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
            args: z.ZodArray<z.ZodAny, "many">;
        }, "strip", z.ZodTypeAny, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }>]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        level: "error" | "warn";
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
    }, {
        id: string;
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
        level?: "error" | "warn" | undefined;
    }>, "many">>;
    context: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    seo: z.ZodOptional<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
        keywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        canonicalUrl: z.ZodOptional<z.ZodString>;
        ogImage: z.ZodOptional<z.ZodString>;
        structuredData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        noIndex: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
        keywords: string[];
        noIndex: boolean;
        canonicalUrl?: string | undefined;
        ogImage?: string | undefined;
        structuredData?: Record<string, unknown> | undefined;
    }, {
        title: string;
        description: string;
        keywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
        ogImage?: string | undefined;
        structuredData?: Record<string, unknown> | undefined;
        noIndex?: boolean | undefined;
    }>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        resource: z.ZodString;
        actions: z.ZodArray<z.ZodString, "many">;
        roles: z.ZodDefault<z.ZodArray<z.ZodEnum<["viewer", "editor", "admin"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        resource: string;
        actions: string[];
        roles: ("viewer" | "editor" | "admin")[];
    }, {
        resource: string;
        actions: string[];
        roles?: ("viewer" | "editor" | "admin")[] | undefined;
    }>, "many">>;
    workflow: z.ZodDefault<z.ZodObject<{
        status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
        version: z.ZodDefault<z.ZodNumber>;
        publishedAt: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        createdBy: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
        updatedBy: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "draft" | "published" | "archived";
        version: number;
        publishedAt?: string | undefined;
        createdAt?: string | undefined;
        createdBy?: string | undefined;
        updatedAt?: string | undefined;
        updatedBy?: string | undefined;
    }, {
        status?: "draft" | "published" | "archived" | undefined;
        version?: number | undefined;
        publishedAt?: string | undefined;
        createdAt?: string | undefined;
        createdBy?: string | undefined;
        updatedAt?: string | undefined;
        updatedBy?: string | undefined;
    }>>;
    contentType: z.ZodDefault<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;
export type PermissionPolicy = z.infer<typeof PermissionPolicySchema>;
export type SeoMetadata = z.infer<typeof SeoMetadataSchema>;
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;
export type LocalizationBundle = z.infer<typeof LocalizationBundleSchema>;
export type MediaAsset = z.infer<typeof MediaAssetSchema>;
export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;
export type ContentTypeDefinition = z.infer<typeof ContentTypeSchema>;
export type ComponentInput = z.infer<typeof ComponentInputSchema>;
export type CmsBlockDocument = z.infer<typeof CmsBlockSchema>;
export type CmsPageDocument = z.infer<typeof CmsPageSchema>;
export declare function defineField(input: FieldDefinition): FieldDefinition;
export declare function defineContentType(input: ContentTypeDefinition): ContentTypeDefinition;
export declare function defineBlock(input: CmsBlockDocument): CmsBlockDocument;
export declare const RuntimeBlockSchema: z.ZodObject<{
    id: z.ZodString;
    tree: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        key: z.ZodString;
        props: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        variant: z.ZodOptional<z.ZodString>;
        variants: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            props: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            weight: z.ZodDefault<z.ZodNumber>;
            conditions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                when: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
                    op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
                    args: z.ZodArray<z.ZodAny, "many">;
                }, "strip", z.ZodTypeAny, {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                }, {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                }>]>;
                elseHide: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide: boolean;
            }, {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide?: boolean | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            props: Record<string, unknown>;
            weight: number;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide: boolean;
            }[] | undefined;
        }, {
            name: string;
            props?: Record<string, unknown> | undefined;
            weight?: number | undefined;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide?: boolean | undefined;
            }[] | undefined;
        }>, "many">>;
        slotIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        conditions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            when: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
                op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
                args: z.ZodArray<z.ZodAny, "many">;
            }, "strip", z.ZodTypeAny, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }>]>;
            elseHide: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide: boolean;
        }, {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide?: boolean | undefined;
        }>, "many">>;
        weight: z.ZodDefault<z.ZodNumber>;
        analytics: z.ZodOptional<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            id?: string | undefined;
            tags?: string[] | undefined;
        }, {
            id?: string | undefined;
            tags?: string[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        props: Record<string, unknown>;
        weight: number;
        key: string;
        conditions?: {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide: boolean;
        }[] | undefined;
        variant?: string | undefined;
        variants?: {
            name: string;
            props: Record<string, unknown>;
            weight: number;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide: boolean;
            }[] | undefined;
        }[] | undefined;
        slotIds?: string[] | undefined;
        analytics?: {
            id?: string | undefined;
            tags?: string[] | undefined;
        } | undefined;
    }, {
        id: string;
        key: string;
        props?: Record<string, unknown> | undefined;
        weight?: number | undefined;
        conditions?: {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide?: boolean | undefined;
        }[] | undefined;
        variant?: string | undefined;
        variants?: {
            name: string;
            props?: Record<string, unknown> | undefined;
            weight?: number | undefined;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide?: boolean | undefined;
            }[] | undefined;
        }[] | undefined;
        slotIds?: string[] | undefined;
        analytics?: {
            id?: string | undefined;
            tags?: string[] | undefined;
        } | undefined;
    }>, "many">>;
    constraints: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
        rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
            op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
            args: z.ZodArray<z.ZodAny, "many">;
        }, "strip", z.ZodTypeAny, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }>]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        level: "error" | "warn";
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
    }, {
        id: string;
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
        level?: "error" | "warn" | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    tree: {
        id: string;
        props: Record<string, unknown>;
        weight: number;
        key: string;
        conditions?: {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide: boolean;
        }[] | undefined;
        variant?: string | undefined;
        variants?: {
            name: string;
            props: Record<string, unknown>;
            weight: number;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide: boolean;
            }[] | undefined;
        }[] | undefined;
        slotIds?: string[] | undefined;
        analytics?: {
            id?: string | undefined;
            tags?: string[] | undefined;
        } | undefined;
    }[];
    constraints?: {
        id: string;
        level: "error" | "warn";
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
    }[] | undefined;
}, {
    id: string;
    tree?: {
        id: string;
        key: string;
        props?: Record<string, unknown> | undefined;
        weight?: number | undefined;
        conditions?: {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide?: boolean | undefined;
        }[] | undefined;
        variant?: string | undefined;
        variants?: {
            name: string;
            props?: Record<string, unknown> | undefined;
            weight?: number | undefined;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide?: boolean | undefined;
            }[] | undefined;
        }[] | undefined;
        slotIds?: string[] | undefined;
        analytics?: {
            id?: string | undefined;
            tags?: string[] | undefined;
        } | undefined;
    }[] | undefined;
    constraints?: {
        id: string;
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
        level?: "error" | "warn" | undefined;
    }[] | undefined;
}>;
export declare const RuntimePageSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    blocks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    prepend: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        key: z.ZodString;
        props: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        variant: z.ZodOptional<z.ZodString>;
        variants: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            props: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            weight: z.ZodDefault<z.ZodNumber>;
            conditions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                when: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
                    op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
                    args: z.ZodArray<z.ZodAny, "many">;
                }, "strip", z.ZodTypeAny, {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                }, {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                }>]>;
                elseHide: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide: boolean;
            }, {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide?: boolean | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            props: Record<string, unknown>;
            weight: number;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide: boolean;
            }[] | undefined;
        }, {
            name: string;
            props?: Record<string, unknown> | undefined;
            weight?: number | undefined;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide?: boolean | undefined;
            }[] | undefined;
        }>, "many">>;
        slotIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        conditions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            when: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
                op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
                args: z.ZodArray<z.ZodAny, "many">;
            }, "strip", z.ZodTypeAny, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }>]>;
            elseHide: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide: boolean;
        }, {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide?: boolean | undefined;
        }>, "many">>;
        weight: z.ZodDefault<z.ZodNumber>;
        analytics: z.ZodOptional<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            id?: string | undefined;
            tags?: string[] | undefined;
        }, {
            id?: string | undefined;
            tags?: string[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        props: Record<string, unknown>;
        weight: number;
        key: string;
        conditions?: {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide: boolean;
        }[] | undefined;
        variant?: string | undefined;
        variants?: {
            name: string;
            props: Record<string, unknown>;
            weight: number;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide: boolean;
            }[] | undefined;
        }[] | undefined;
        slotIds?: string[] | undefined;
        analytics?: {
            id?: string | undefined;
            tags?: string[] | undefined;
        } | undefined;
    }, {
        id: string;
        key: string;
        props?: Record<string, unknown> | undefined;
        weight?: number | undefined;
        conditions?: {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide?: boolean | undefined;
        }[] | undefined;
        variant?: string | undefined;
        variants?: {
            name: string;
            props?: Record<string, unknown> | undefined;
            weight?: number | undefined;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide?: boolean | undefined;
            }[] | undefined;
        }[] | undefined;
        slotIds?: string[] | undefined;
        analytics?: {
            id?: string | undefined;
            tags?: string[] | undefined;
        } | undefined;
    }>, "many">>;
    append: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        key: z.ZodString;
        props: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        variant: z.ZodOptional<z.ZodString>;
        variants: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            props: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            weight: z.ZodDefault<z.ZodNumber>;
            conditions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                when: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
                    op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
                    args: z.ZodArray<z.ZodAny, "many">;
                }, "strip", z.ZodTypeAny, {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                }, {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                }>]>;
                elseHide: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide: boolean;
            }, {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide?: boolean | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            props: Record<string, unknown>;
            weight: number;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide: boolean;
            }[] | undefined;
        }, {
            name: string;
            props?: Record<string, unknown> | undefined;
            weight?: number | undefined;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide?: boolean | undefined;
            }[] | undefined;
        }>, "many">>;
        slotIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        conditions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            when: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
                op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
                args: z.ZodArray<z.ZodAny, "many">;
            }, "strip", z.ZodTypeAny, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }>]>;
            elseHide: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide: boolean;
        }, {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide?: boolean | undefined;
        }>, "many">>;
        weight: z.ZodDefault<z.ZodNumber>;
        analytics: z.ZodOptional<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            id?: string | undefined;
            tags?: string[] | undefined;
        }, {
            id?: string | undefined;
            tags?: string[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        props: Record<string, unknown>;
        weight: number;
        key: string;
        conditions?: {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide: boolean;
        }[] | undefined;
        variant?: string | undefined;
        variants?: {
            name: string;
            props: Record<string, unknown>;
            weight: number;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide: boolean;
            }[] | undefined;
        }[] | undefined;
        slotIds?: string[] | undefined;
        analytics?: {
            id?: string | undefined;
            tags?: string[] | undefined;
        } | undefined;
    }, {
        id: string;
        key: string;
        props?: Record<string, unknown> | undefined;
        weight?: number | undefined;
        conditions?: {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide?: boolean | undefined;
        }[] | undefined;
        variant?: string | undefined;
        variants?: {
            name: string;
            props?: Record<string, unknown> | undefined;
            weight?: number | undefined;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide?: boolean | undefined;
            }[] | undefined;
        }[] | undefined;
        slotIds?: string[] | undefined;
        analytics?: {
            id?: string | undefined;
            tags?: string[] | undefined;
        } | undefined;
    }>, "many">>;
    constraints: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        level: z.ZodDefault<z.ZodEnum<["error", "warn"]>>;
        rule: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
            op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
            args: z.ZodArray<z.ZodAny, "many">;
        }, "strip", z.ZodTypeAny, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }>]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        level: "error" | "warn";
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
    }, {
        id: string;
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
        level?: "error" | "warn" | undefined;
    }>, "many">>;
    context: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    blocks: string[];
    context: Record<string, unknown>;
    constraints?: {
        id: string;
        level: "error" | "warn";
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
    }[] | undefined;
    prepend?: {
        id: string;
        props: Record<string, unknown>;
        weight: number;
        key: string;
        conditions?: {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide: boolean;
        }[] | undefined;
        variant?: string | undefined;
        variants?: {
            name: string;
            props: Record<string, unknown>;
            weight: number;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide: boolean;
            }[] | undefined;
        }[] | undefined;
        slotIds?: string[] | undefined;
        analytics?: {
            id?: string | undefined;
            tags?: string[] | undefined;
        } | undefined;
    }[] | undefined;
    append?: {
        id: string;
        props: Record<string, unknown>;
        weight: number;
        key: string;
        conditions?: {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide: boolean;
        }[] | undefined;
        variant?: string | undefined;
        variants?: {
            name: string;
            props: Record<string, unknown>;
            weight: number;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide: boolean;
            }[] | undefined;
        }[] | undefined;
        slotIds?: string[] | undefined;
        analytics?: {
            id?: string | undefined;
            tags?: string[] | undefined;
        } | undefined;
    }[] | undefined;
}, {
    id: string;
    title: string;
    constraints?: {
        id: string;
        rule: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
        level?: "error" | "warn" | undefined;
    }[] | undefined;
    blocks?: string[] | undefined;
    prepend?: {
        id: string;
        key: string;
        props?: Record<string, unknown> | undefined;
        weight?: number | undefined;
        conditions?: {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide?: boolean | undefined;
        }[] | undefined;
        variant?: string | undefined;
        variants?: {
            name: string;
            props?: Record<string, unknown> | undefined;
            weight?: number | undefined;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide?: boolean | undefined;
            }[] | undefined;
        }[] | undefined;
        slotIds?: string[] | undefined;
        analytics?: {
            id?: string | undefined;
            tags?: string[] | undefined;
        } | undefined;
    }[] | undefined;
    append?: {
        id: string;
        key: string;
        props?: Record<string, unknown> | undefined;
        weight?: number | undefined;
        conditions?: {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide?: boolean | undefined;
        }[] | undefined;
        variant?: string | undefined;
        variants?: {
            name: string;
            props?: Record<string, unknown> | undefined;
            weight?: number | undefined;
            conditions?: {
                when: string | number | boolean | {
                    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                    args: any[];
                };
                elseHide?: boolean | undefined;
            }[] | undefined;
        }[] | undefined;
        slotIds?: string[] | undefined;
        analytics?: {
            id?: string | undefined;
            tags?: string[] | undefined;
        } | undefined;
    }[] | undefined;
    context?: Record<string, unknown> | undefined;
}>;
export declare const RuntimeComponentSchema: z.ZodObject<{
    id: z.ZodString;
    key: z.ZodString;
    props: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    variant: z.ZodOptional<z.ZodString>;
    variants: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        props: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        weight: z.ZodDefault<z.ZodNumber>;
        conditions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            when: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
                op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
                args: z.ZodArray<z.ZodAny, "many">;
            }, "strip", z.ZodTypeAny, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }, {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            }>]>;
            elseHide: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide: boolean;
        }, {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide?: boolean | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        props: Record<string, unknown>;
        weight: number;
        conditions?: {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide: boolean;
        }[] | undefined;
    }, {
        name: string;
        props?: Record<string, unknown> | undefined;
        weight?: number | undefined;
        conditions?: {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide?: boolean | undefined;
        }[] | undefined;
    }>, "many">>;
    slotIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    conditions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        when: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
            op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
            args: z.ZodArray<z.ZodAny, "many">;
        }, "strip", z.ZodTypeAny, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }, {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        }>]>;
        elseHide: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        when: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
        elseHide: boolean;
    }, {
        when: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
        elseHide?: boolean | undefined;
    }>, "many">>;
    weight: z.ZodDefault<z.ZodNumber>;
    analytics: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        id?: string | undefined;
        tags?: string[] | undefined;
    }, {
        id?: string | undefined;
        tags?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    props: Record<string, unknown>;
    weight: number;
    key: string;
    conditions?: {
        when: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
        elseHide: boolean;
    }[] | undefined;
    variant?: string | undefined;
    variants?: {
        name: string;
        props: Record<string, unknown>;
        weight: number;
        conditions?: {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide: boolean;
        }[] | undefined;
    }[] | undefined;
    slotIds?: string[] | undefined;
    analytics?: {
        id?: string | undefined;
        tags?: string[] | undefined;
    } | undefined;
}, {
    id: string;
    key: string;
    props?: Record<string, unknown> | undefined;
    weight?: number | undefined;
    conditions?: {
        when: string | number | boolean | {
            op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
            args: any[];
        };
        elseHide?: boolean | undefined;
    }[] | undefined;
    variant?: string | undefined;
    variants?: {
        name: string;
        props?: Record<string, unknown> | undefined;
        weight?: number | undefined;
        conditions?: {
            when: string | number | boolean | {
                op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
                args: any[];
            };
            elseHide?: boolean | undefined;
        }[] | undefined;
    }[] | undefined;
    slotIds?: string[] | undefined;
    analytics?: {
        id?: string | undefined;
        tags?: string[] | undefined;
    } | undefined;
}>;
//# sourceMappingURL=schemas.d.ts.map