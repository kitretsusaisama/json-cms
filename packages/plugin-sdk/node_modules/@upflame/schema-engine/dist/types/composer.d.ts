import { z } from "zod";
export declare const Expr: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString, z.ZodObject<{
    op: z.ZodEnum<["and", "or", "not", "==", "!=", "<", "<=", ">", ">=", "in", "nin", "has", "missing", "startsWith", "endsWith", "match", "coalesce"]>;
    args: z.ZodArray<z.ZodAny, "many">;
}, "strip", z.ZodTypeAny, {
    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
    args: any[];
}, {
    op: "and" | "or" | "not" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "nin" | "has" | "missing" | "startsWith" | "endsWith" | "match" | "coalesce";
    args: any[];
}>]>;
export declare const CtxRef: z.ZodObject<{
    $ctx: z.ZodString;
}, "strip", z.ZodTypeAny, {
    $ctx: string;
}, {
    $ctx: string;
}>;
export declare const Condition: z.ZodObject<{
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
}>;
export declare const Constraint: z.ZodObject<{
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
}>;
export declare const TokenRef: z.ZodString;
export declare const I18nRef: z.ZodObject<{
    $i18n: z.ZodString;
}, "strip", z.ZodTypeAny, {
    $i18n: string;
}, {
    $i18n: string;
}>;
export declare const Variant: z.ZodObject<{
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
}>;
export declare const Slot: z.ZodObject<{
    name: z.ZodString;
    accepts: z.ZodArray<z.ZodString, "many">;
    itemIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    accepts: string[];
    itemIds: string[];
}, {
    name: string;
    accepts: string[];
    itemIds?: string[] | undefined;
}>;
export declare const ComponentInstance: z.ZodObject<{
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
export declare const Block: z.ZodObject<{
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
export declare const PageV2: z.ZodObject<{
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
export declare const Manifest: z.ZodObject<{
    pages: z.ZodRecord<z.ZodString, z.ZodObject<{
        path: z.ZodString;
        version: z.ZodNumber;
        updated: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: string;
        version: number;
        updated: string;
    }, {
        path: string;
        version: number;
        updated: string;
    }>>;
    blocks: z.ZodRecord<z.ZodString, z.ZodObject<{
        path: z.ZodString;
        version: z.ZodNumber;
        updated: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: string;
        version: number;
        updated: string;
    }, {
        path: string;
        version: number;
        updated: string;
    }>>;
    overlays: z.ZodRecord<z.ZodString, z.ZodObject<{
        scope: z.ZodString;
        target: z.ZodString;
        path: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: string;
        scope: string;
        target: string;
    }, {
        path: string;
        scope: string;
        target: string;
    }>>;
    integrity: z.ZodRecord<z.ZodString, z.ZodObject<{
        sha256: z.ZodString;
        size: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        sha256: string;
        size: number;
    }, {
        sha256: string;
        size: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    blocks: Record<string, {
        path: string;
        version: number;
        updated: string;
    }>;
    pages: Record<string, {
        path: string;
        version: number;
        updated: string;
    }>;
    overlays: Record<string, {
        path: string;
        scope: string;
        target: string;
    }>;
    integrity: Record<string, {
        sha256: string;
        size: number;
    }>;
}, {
    blocks: Record<string, {
        path: string;
        version: number;
        updated: string;
    }>;
    pages: Record<string, {
        path: string;
        version: number;
        updated: string;
    }>;
    overlays: Record<string, {
        path: string;
        scope: string;
        target: string;
    }>;
    integrity: Record<string, {
        sha256: string;
        size: number;
    }>;
}>;
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
//# sourceMappingURL=composer.d.ts.map