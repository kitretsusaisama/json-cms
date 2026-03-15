import { promises as fs } from "fs";
import path from "path";
import type {
  CreateTenantData,
  TenantContext,
  TenantFilters,
  TenantLimits,
  TenantSettings,
  TenantUsage,
} from "@/boilerplate/interfaces/tenant";
import { getCanonicalDataPath } from "@/core/content/paths";

const TENANTS_DIR = getCanonicalDataPath("tenants");
const TENANT_USAGE_DIR = getCanonicalDataPath("tenants", "usage");

export type TenantCreateInput = Omit<CreateTenantData, "settings" | "limits"> & {
  settings?: {
    theme?: Partial<NonNullable<TenantSettings["theme"]>>;
    branding?: Partial<NonNullable<TenantSettings["branding"]>>;
    localization?: Partial<NonNullable<TenantSettings["localization"]>>;
    content?: Partial<NonNullable<TenantSettings["content"]>>;
    security?: Partial<NonNullable<TenantSettings["security"]>>;
  };
  limits?: Partial<TenantLimits>;
};

export type TenantPatch = Omit<Partial<TenantContext>, "settings" | "limits"> & {
  settings?: {
    theme?: Partial<NonNullable<TenantSettings["theme"]>>;
    branding?: Partial<NonNullable<TenantSettings["branding"]>>;
    localization?: Partial<NonNullable<TenantSettings["localization"]>>;
    content?: Partial<NonNullable<TenantSettings["content"]>>;
    security?: Partial<NonNullable<TenantSettings["security"]>>;
  };
  limits?: Partial<TenantLimits>;
};

type TenantSettingsInput = NonNullable<TenantCreateInput["settings"]>;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeTenantId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function tenantFilePath(tenantId: string): string {
  return path.join(TENANTS_DIR, `${tenantId}.json`);
}

function usageFilePath(tenantId: string, period: string): string {
  return path.join(TENANT_USAGE_DIR, tenantId, `${period}.json`);
}

function defaultSettings(input?: TenantSettingsInput | TenantSettings): TenantSettings {
  return {
    theme: input?.theme ?? {},
    branding: input?.branding ?? {},
    localization: {
      defaultLocale: input?.localization?.defaultLocale ?? "en",
      supportedLocales: input?.localization?.supportedLocales ?? ["en"],
      timezone: input?.localization?.timezone ?? "UTC",
    },
    content: input?.content ?? {},
    security: input?.security ?? {},
  };
}

function defaultLimits(input?: Partial<TenantLimits>): TenantLimits {
  return {
    maxUsers: input?.maxUsers,
    maxPages: input?.maxPages,
    maxBlocks: input?.maxBlocks,
    maxComponents: input?.maxComponents,
    maxStorage: input?.maxStorage,
    maxApiRequests: input?.maxApiRequests,
    maxBandwidth: input?.maxBandwidth,
  };
}

function defaultUsage(tenantId: string, period: string): TenantUsage {
  return {
    tenantId,
    period,
    metrics: {
      users: 0,
      pages: 0,
      blocks: 0,
      components: 0,
      storage: 0,
      apiRequests: 0,
      bandwidth: 0,
    },
    updatedAt: nowIso(),
  };
}

async function ensureDirs(): Promise<void> {
  await Promise.all([
    fs.mkdir(TENANTS_DIR, { recursive: true }),
    fs.mkdir(TENANT_USAGE_DIR, { recursive: true }),
  ]);
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

export class TenantRepository {
  async getTenant(tenantId: string): Promise<TenantContext | null> {
    await ensureDirs();
    return readJsonFile<TenantContext>(tenantFilePath(tenantId));
  }

  async listTenants(filters: TenantFilters = {}): Promise<TenantContext[]> {
    await ensureDirs();

    const entries = await fs.readdir(TENANTS_DIR, { withFileTypes: true });
    const tenants = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => readJsonFile<TenantContext>(path.join(TENANTS_DIR, entry.name)))
    );

    return tenants
      .filter((tenant): tenant is TenantContext => Boolean(tenant))
      .filter((tenant) => (filters.status ? tenant.status === filters.status : true))
      .filter((tenant) => {
        if (!filters.domain) {
          return true;
        }
        return tenant.domain === filters.domain || tenant.subdomain === filters.domain;
      })
      .filter((tenant) => (filters.createdAfter ? tenant.createdAt >= filters.createdAfter : true))
      .filter((tenant) => (filters.createdBefore ? tenant.createdAt <= filters.createdBefore : true))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  async createTenant(data: TenantCreateInput): Promise<TenantContext> {
    await ensureDirs();

    const tenantId = normalizeTenantId(data.subdomain || data.domain || data.name);
    if (!tenantId) {
      throw new Error("Tenant id could not be derived from the provided input.");
    }

    const existing = await this.getTenant(tenantId);
    if (existing) {
      throw new Error(`Tenant "${tenantId}" already exists.`);
    }

    const timestamp = nowIso();
    const tenant: TenantContext = {
      id: tenantId,
      name: data.name,
      domain: data.domain,
      subdomain: data.subdomain,
      settings: defaultSettings(data.settings),
      features: data.features ?? {},
      limits: defaultLimits(data.limits),
      metadata: data.metadata ?? {},
      createdAt: timestamp,
      updatedAt: timestamp,
      status: "active",
    };

    await writeJsonFile(tenantFilePath(tenant.id), tenant);
    return tenant;
  }

  async updateTenant(tenantId: string, patch: TenantPatch): Promise<TenantContext> {
    const existing = await this.getTenant(tenantId);
    if (!existing) {
      throw new Error(`Tenant "${tenantId}" was not found.`);
    }

    const updated: TenantContext = {
      ...existing,
      ...patch,
      id: tenantId,
      settings: patch.settings
        ? defaultSettings({
            theme: { ...existing.settings.theme, ...patch.settings.theme },
            branding: { ...existing.settings.branding, ...patch.settings.branding },
            localization: {
              ...existing.settings.localization,
              ...patch.settings.localization,
            },
            content: { ...existing.settings.content, ...patch.settings.content },
            security: { ...existing.settings.security, ...patch.settings.security },
          })
        : existing.settings,
      features: patch.features ? { ...existing.features, ...patch.features } : existing.features,
      limits: patch.limits ? { ...existing.limits, ...patch.limits } : existing.limits,
      metadata: patch.metadata ? { ...existing.metadata, ...patch.metadata } : existing.metadata,
      updatedAt: nowIso(),
    };

    await writeJsonFile(tenantFilePath(tenantId), updated);
    return updated;
  }

  async deleteTenant(tenantId: string): Promise<void> {
    await ensureDirs();
    await fs.rm(tenantFilePath(tenantId), { force: true });
    await fs.rm(path.join(TENANT_USAGE_DIR, tenantId), { recursive: true, force: true });
  }

  async getTenantUsage(
    tenantId: string,
    period = new Date().toISOString().slice(0, 7)
  ): Promise<TenantUsage> {
    await ensureDirs();
    const usage = await readJsonFile<TenantUsage>(usageFilePath(tenantId, period));
    return usage ?? defaultUsage(tenantId, period);
  }

  async suspendTenant(tenantId: string, reason: string): Promise<TenantContext> {
    return this.updateTenant(tenantId, {
      status: "suspended",
      metadata: {
        suspensionReason: reason,
        suspendedAt: nowIso(),
      },
    });
  }

  async activateTenant(tenantId: string): Promise<TenantContext> {
    const existing = await this.getTenant(tenantId);
    if (!existing) {
      throw new Error(`Tenant "${tenantId}" was not found.`);
    }

    const metadata = { ...existing.metadata };
    delete metadata.suspensionReason;
    delete metadata.suspendedAt;

    return this.updateTenant(tenantId, {
      status: "active",
      metadata,
    });
  }
}

export const tenantRepository = new TenantRepository();
