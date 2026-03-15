/**
 * JSON CMS Boilerplate System
 * 
 * A comprehensive, plug-and-play solution that transforms any Next.js application
 * into a content management system with JSON-driven pages, components, and SEO.
 */

// Core interfaces
export * from './interfaces/content-provider';
export * from './interfaces/component-registry';
export * from './interfaces/auth';
export * from './interfaces/tenant';
export * from './interfaces/plugin';
export * from './interfaces/cache';
export * from './interfaces/migration';

// Main modules
export * from './scanner';
export * from './api';
export * from './providers/provider-factory';
export * from './registry';
export * from './css';
export * from './renderer';
export * from './plugins';
export * from './seo';
export * from './tenant';

// Versioning system
export {
  ContentVersioningSystem,
  createVersioningSystem,
  createVersioningSystemWithStorages,
  VersionManager,
  AuditTrailManager,
  WorkflowApprovalManager
} from './versioning';

// Version and metadata
export const BOILERPLATE_VERSION = '1.0.0';
export const BOILERPLATE_NAME = 'JSON CMS Boilerplate';

// Default configuration
export const DEFAULT_CONFIG = {
  dataDir: './src/data',
  apiPrefix: '/api/cms',
  provider: 'file' as const,
  enableMultiTenant: false,
  enablePlugins: true,
  enableCaching: true,
  cssStrategy: 'modules' as const,
  security: {
    enableRateLimit: true,
    enableAuditLog: true,
    enableInputSanitization: true,
  },
};

export type BoilerplateConfig = typeof DEFAULT_CONFIG;