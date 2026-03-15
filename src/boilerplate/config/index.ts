/**
 * Boilerplate Configuration System
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { z } from 'zod';

// Configuration schema
export const BoilerplateConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  dataDir: z.string().default('./src/data'),
  apiPrefix: z.string().default('/api/cms'),
  provider: z.enum(['file', 'database']).default('file'),
  enableMultiTenant: z.boolean().default(false),
  enablePlugins: z.boolean().default(true),
  enableCaching: z.boolean().default(true),
  cssStrategy: z.enum(['modules', 'tailwind', 'styled-components', 'emotion']).default('modules'),
  security: z.object({
    enableRateLimit: z.boolean().default(true),
    enableAuditLog: z.boolean().default(true),
    enableInputSanitization: z.boolean().default(true),
    corsOrigins: z.array(z.string()).default(['http://localhost:3000']),
  }).default({}),
  database: z.object({
    type: z.enum(['postgresql', 'mongodb', 'sqlite']).optional(),
    connectionString: z.string().optional(),
    poolSize: z.number().default(10),
    timeout: z.number().default(30000),
  }).optional(),
  plugins: z.object({
    directory: z.string().default('./src/plugins'),
    autoLoad: z.boolean().default(true),
    enabled: z.array(z.string()).default([]),
  }).default({}),
  tenant: z.object({
    strategy: z.enum(['domain', 'subdomain', 'header', 'path']).default('header'),
    headerName: z.string().default('x-tenant-id'),
    defaultTenant: z.string().default('default'),
  }).optional(),
});

export type BoilerplateConfig = z.infer<typeof BoilerplateConfigSchema>;

export class ConfigManager {
  private configPath: string;
  private config: BoilerplateConfig | null = null;

  constructor(configPath = './boilerplate.config.json') {
    this.configPath = configPath;
  }

  /**
   * Load configuration from file
   */
  async load(): Promise<BoilerplateConfig> {
    try {
      const content = await readFile(this.configPath, 'utf-8');
      const rawConfig = JSON.parse(content);
      this.config = BoilerplateConfigSchema.parse(rawConfig);
      return this.config;
    } catch (error) {
      // If config doesn't exist, create default
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return this.createDefault();
      }
      throw new Error(`Failed to load config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save configuration to file
   */
  async save(config: Partial<BoilerplateConfig> = {}): Promise<void> {
    const fullConfig = BoilerplateConfigSchema.parse({
      ...this.config,
      ...config,
    });

    // Ensure directory exists
    await mkdir(dirname(this.configPath), { recursive: true });

    await writeFile(this.configPath, JSON.stringify(fullConfig, null, 2));
    this.config = fullConfig;
  }

  /**
   * Get current configuration
   */
  get(): BoilerplateConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }

  /**
   * Update configuration
   */
  async update(updates: Partial<BoilerplateConfig>): Promise<BoilerplateConfig> {
    const newConfig = {
      ...this.config,
      ...updates,
    };
    
    await this.save(newConfig);
    return this.config!;
  }

  /**
   * Create default configuration
   */
  private async createDefault(): Promise<BoilerplateConfig> {
    const defaultConfig = BoilerplateConfigSchema.parse({});
    await this.save(defaultConfig);
    return defaultConfig;
  }

  /**
   * Validate configuration
   */
  validate(config: unknown): BoilerplateConfig {
    return BoilerplateConfigSchema.parse(config);
  }

  /**
   * Get environment-specific configuration
   */
  getForEnvironment(env: string = process.env.NODE_ENV || 'development'): BoilerplateConfig {
    const config = this.get();
    
    // Apply environment-specific overrides
    switch (env) {
      case 'production':
        return {
          ...config,
          enableCaching: true,
          security: {
            ...config.security,
            enableRateLimit: true,
            enableAuditLog: true,
          },
        };
      
      case 'development':
        return {
          ...config,
          enableCaching: false,
          security: {
            ...config.security,
            enableRateLimit: false,
          },
        };
      
      case 'test':
        return {
          ...config,
          enableCaching: false,
          enablePlugins: false,
          security: {
            ...config.security,
            enableRateLimit: false,
            enableAuditLog: false,
          },
        };
      
      default:
        return config;
    }
  }
}

// Global config instance
let globalConfig: ConfigManager | null = null;

/**
 * Get global configuration manager
 */
export function getConfigManager(configPath?: string): ConfigManager {
  if (!globalConfig || configPath) {
    globalConfig = new ConfigManager(configPath);
  }
  return globalConfig;
}

/**
 * Load and get configuration
 */
export async function loadConfig(configPath?: string): Promise<BoilerplateConfig> {
  const manager = getConfigManager(configPath);
  return manager.load();
}

/**
 * Get configuration (must be loaded first)
 */
export function getConfig(): BoilerplateConfig {
  if (!globalConfig) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return globalConfig.get();
}