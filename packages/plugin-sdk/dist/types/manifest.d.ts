/**
 * Plugin SDK — Manifest Validation
 *
 * Validates plugin.json manifests using Zod with clear error messages.
 * The schema mirrors SdkPluginManifest exactly.
 */
import { z } from "zod";
export declare const PluginManifestSchema: z.ZodObject<{
    name: z.ZodString;
    version: z.ZodString;
    description: z.ZodString;
    author: z.ZodUnion<[z.ZodString, z.ZodObject<{
        name: z.ZodString;
        email: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        email?: string | undefined;
        url?: string | undefined;
    }, {
        name: string;
        email?: string | undefined;
        url?: string | undefined;
    }>]>;
    license: z.ZodOptional<z.ZodString>;
    homepage: z.ZodOptional<z.ZodString>;
    repository: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
        type: z.ZodString;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: string;
        url: string;
    }, {
        type: string;
        url: string;
    }>]>>;
    keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    cms: z.ZodObject<{
        components: z.ZodOptional<z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            path: z.ZodString;
            displayName: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            category: z.ZodOptional<z.ZodEnum<["layout", "content", "media", "commerce", "form", "analytics", "custom"]>>;
            propsSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            exampleProps: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            iconUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            key: string;
            path: string;
            displayName?: string | undefined;
            description?: string | undefined;
            category?: "layout" | "content" | "media" | "commerce" | "form" | "analytics" | "custom" | undefined;
            propsSchema?: Record<string, unknown> | undefined;
            exampleProps?: Record<string, unknown> | undefined;
            iconUrl?: string | undefined;
        }, {
            key: string;
            path: string;
            displayName?: string | undefined;
            description?: string | undefined;
            category?: "layout" | "content" | "media" | "commerce" | "form" | "analytics" | "custom" | undefined;
            propsSchema?: Record<string, unknown> | undefined;
            exampleProps?: Record<string, unknown> | undefined;
            iconUrl?: string | undefined;
        }>, "many">>;
        contentTypes: z.ZodOptional<z.ZodArray<any, "many">>;
        renderers: z.ZodOptional<z.ZodArray<z.ZodObject<{
            schemaType: z.ZodString;
            componentKey: z.ZodString;
            priority: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            schemaType: string;
            componentKey: string;
            priority?: number | undefined;
        }, {
            schemaType: string;
            componentKey: string;
            priority?: number | undefined;
        }>, "many">>;
        hooks: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            handler: z.ZodString;
            priority: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            priority: number;
            name: string;
            handler: string;
        }, {
            name: string;
            handler: string;
            priority?: number | undefined;
        }>, "many">>;
        routes: z.ZodOptional<z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            component: z.ZodString;
            layout: z.ZodOptional<z.ZodString>;
            permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            component: string;
            layout?: string | undefined;
            permissions?: string[] | undefined;
        }, {
            path: string;
            component: string;
            layout?: string | undefined;
            permissions?: string[] | undefined;
        }>, "many">>;
        api: z.ZodOptional<z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            methods: z.ZodArray<z.ZodEnum<["GET", "POST", "PUT", "PATCH", "DELETE"]>, "many">;
            handler: z.ZodString;
            permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            rateLimit: z.ZodOptional<z.ZodObject<{
                requests: z.ZodNumber;
                windowMs: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                requests: number;
                windowMs: number;
            }, {
                requests: number;
                windowMs: number;
            }>>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            handler: string;
            methods: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE")[];
            permissions?: string[] | undefined;
            rateLimit?: {
                requests: number;
                windowMs: number;
            } | undefined;
        }, {
            path: string;
            handler: string;
            methods: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE")[];
            permissions?: string[] | undefined;
            rateLimit?: {
                requests: number;
                windowMs: number;
            } | undefined;
        }>, "many">>;
        permissions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodString;
            resource: z.ZodString;
            actions: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            description: string;
            name: string;
            resource: string;
            actions: string[];
        }, {
            description: string;
            name: string;
            resource: string;
            actions: string[];
        }>, "many">>;
        configSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            type: z.ZodEnum<["string", "number", "boolean", "object", "array"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            default: z.ZodOptional<z.ZodUnknown>;
            enum: z.ZodOptional<z.ZodArray<z.ZodUnknown, "many">>;
            secret: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            type: "string" | "number" | "boolean" | "object" | "array";
            label: string;
            description?: string | undefined;
            required?: boolean | undefined;
            default?: unknown;
            enum?: unknown[] | undefined;
            secret?: boolean | undefined;
        }, {
            type: "string" | "number" | "boolean" | "object" | "array";
            label: string;
            description?: string | undefined;
            required?: boolean | undefined;
            default?: unknown;
            enum?: unknown[] | undefined;
            secret?: boolean | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        permissions?: {
            description: string;
            name: string;
            resource: string;
            actions: string[];
        }[] | undefined;
        components?: {
            key: string;
            path: string;
            displayName?: string | undefined;
            description?: string | undefined;
            category?: "layout" | "content" | "media" | "commerce" | "form" | "analytics" | "custom" | undefined;
            propsSchema?: Record<string, unknown> | undefined;
            exampleProps?: Record<string, unknown> | undefined;
            iconUrl?: string | undefined;
        }[] | undefined;
        contentTypes?: any[] | undefined;
        renderers?: {
            schemaType: string;
            componentKey: string;
            priority?: number | undefined;
        }[] | undefined;
        hooks?: {
            priority: number;
            name: string;
            handler: string;
        }[] | undefined;
        routes?: {
            path: string;
            component: string;
            layout?: string | undefined;
            permissions?: string[] | undefined;
        }[] | undefined;
        api?: {
            path: string;
            handler: string;
            methods: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE")[];
            permissions?: string[] | undefined;
            rateLimit?: {
                requests: number;
                windowMs: number;
            } | undefined;
        }[] | undefined;
        configSchema?: Record<string, {
            type: "string" | "number" | "boolean" | "object" | "array";
            label: string;
            description?: string | undefined;
            required?: boolean | undefined;
            default?: unknown;
            enum?: unknown[] | undefined;
            secret?: boolean | undefined;
        }> | undefined;
    }, {
        permissions?: {
            description: string;
            name: string;
            resource: string;
            actions: string[];
        }[] | undefined;
        components?: {
            key: string;
            path: string;
            displayName?: string | undefined;
            description?: string | undefined;
            category?: "layout" | "content" | "media" | "commerce" | "form" | "analytics" | "custom" | undefined;
            propsSchema?: Record<string, unknown> | undefined;
            exampleProps?: Record<string, unknown> | undefined;
            iconUrl?: string | undefined;
        }[] | undefined;
        contentTypes?: any[] | undefined;
        renderers?: {
            schemaType: string;
            componentKey: string;
            priority?: number | undefined;
        }[] | undefined;
        hooks?: {
            name: string;
            handler: string;
            priority?: number | undefined;
        }[] | undefined;
        routes?: {
            path: string;
            component: string;
            layout?: string | undefined;
            permissions?: string[] | undefined;
        }[] | undefined;
        api?: {
            path: string;
            handler: string;
            methods: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE")[];
            permissions?: string[] | undefined;
            rateLimit?: {
                requests: number;
                windowMs: number;
            } | undefined;
        }[] | undefined;
        configSchema?: Record<string, {
            type: "string" | "number" | "boolean" | "object" | "array";
            label: string;
            description?: string | undefined;
            required?: boolean | undefined;
            default?: unknown;
            enum?: unknown[] | undefined;
            secret?: boolean | undefined;
        }> | undefined;
    }>;
    engines: z.ZodOptional<z.ZodObject<{
        "json-cms": z.ZodOptional<z.ZodString>;
        node: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        "json-cms"?: string | undefined;
        node?: string | undefined;
    }, {
        "json-cms"?: string | undefined;
        node?: string | undefined;
    }>>;
    peerDependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    dependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    name: string;
    version: string;
    author: string | {
        name: string;
        email?: string | undefined;
        url?: string | undefined;
    };
    cms: {
        permissions?: {
            description: string;
            name: string;
            resource: string;
            actions: string[];
        }[] | undefined;
        components?: {
            key: string;
            path: string;
            displayName?: string | undefined;
            description?: string | undefined;
            category?: "layout" | "content" | "media" | "commerce" | "form" | "analytics" | "custom" | undefined;
            propsSchema?: Record<string, unknown> | undefined;
            exampleProps?: Record<string, unknown> | undefined;
            iconUrl?: string | undefined;
        }[] | undefined;
        contentTypes?: any[] | undefined;
        renderers?: {
            schemaType: string;
            componentKey: string;
            priority?: number | undefined;
        }[] | undefined;
        hooks?: {
            priority: number;
            name: string;
            handler: string;
        }[] | undefined;
        routes?: {
            path: string;
            component: string;
            layout?: string | undefined;
            permissions?: string[] | undefined;
        }[] | undefined;
        api?: {
            path: string;
            handler: string;
            methods: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE")[];
            permissions?: string[] | undefined;
            rateLimit?: {
                requests: number;
                windowMs: number;
            } | undefined;
        }[] | undefined;
        configSchema?: Record<string, {
            type: "string" | "number" | "boolean" | "object" | "array";
            label: string;
            description?: string | undefined;
            required?: boolean | undefined;
            default?: unknown;
            enum?: unknown[] | undefined;
            secret?: boolean | undefined;
        }> | undefined;
    };
    license?: string | undefined;
    homepage?: string | undefined;
    repository?: string | {
        type: string;
        url: string;
    } | undefined;
    keywords?: string[] | undefined;
    engines?: {
        "json-cms"?: string | undefined;
        node?: string | undefined;
    } | undefined;
    peerDependencies?: Record<string, string> | undefined;
    dependencies?: Record<string, string> | undefined;
}, {
    description: string;
    name: string;
    version: string;
    author: string | {
        name: string;
        email?: string | undefined;
        url?: string | undefined;
    };
    cms: {
        permissions?: {
            description: string;
            name: string;
            resource: string;
            actions: string[];
        }[] | undefined;
        components?: {
            key: string;
            path: string;
            displayName?: string | undefined;
            description?: string | undefined;
            category?: "layout" | "content" | "media" | "commerce" | "form" | "analytics" | "custom" | undefined;
            propsSchema?: Record<string, unknown> | undefined;
            exampleProps?: Record<string, unknown> | undefined;
            iconUrl?: string | undefined;
        }[] | undefined;
        contentTypes?: any[] | undefined;
        renderers?: {
            schemaType: string;
            componentKey: string;
            priority?: number | undefined;
        }[] | undefined;
        hooks?: {
            name: string;
            handler: string;
            priority?: number | undefined;
        }[] | undefined;
        routes?: {
            path: string;
            component: string;
            layout?: string | undefined;
            permissions?: string[] | undefined;
        }[] | undefined;
        api?: {
            path: string;
            handler: string;
            methods: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE")[];
            permissions?: string[] | undefined;
            rateLimit?: {
                requests: number;
                windowMs: number;
            } | undefined;
        }[] | undefined;
        configSchema?: Record<string, {
            type: "string" | "number" | "boolean" | "object" | "array";
            label: string;
            description?: string | undefined;
            required?: boolean | undefined;
            default?: unknown;
            enum?: unknown[] | undefined;
            secret?: boolean | undefined;
        }> | undefined;
    };
    license?: string | undefined;
    homepage?: string | undefined;
    repository?: string | {
        type: string;
        url: string;
    } | undefined;
    keywords?: string[] | undefined;
    engines?: {
        "json-cms"?: string | undefined;
        node?: string | undefined;
    } | undefined;
    peerDependencies?: Record<string, string> | undefined;
    dependencies?: Record<string, string> | undefined;
}>;
export type ValidatedManifest = z.infer<typeof PluginManifestSchema>;
export interface ManifestValidationResult {
    valid: boolean;
    manifest?: ValidatedManifest;
    errors: string[];
}
/**
 * Validate a plugin manifest object.
 * Returns structured errors with actionable messages.
 */
export declare function validateManifest(raw: unknown): ManifestValidationResult;
/**
 * Validate a plugin manifest and throw on failure.
 * Useful for programmatic plugin loading.
 */
export declare function assertValidManifest(raw: unknown): ValidatedManifest;
//# sourceMappingURL=manifest.d.ts.map