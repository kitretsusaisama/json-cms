/**
 * Migration System Entry Point
 * 
 * Exports all migration-related classes and interfaces for easy consumption.
 */

// Core interfaces
export * from './interfaces';

// Main implementation classes
export { MigrationManager } from './migration-manager';
export { SchemaAnalyzer } from './schema-analyzer';
export { DataTransferManager } from './data-transfer-manager';
export { 
  MigrationStorage,
  FileMigrationStorage,
  DatabaseMigrationStorage 
} from './migration-storage';

// Factory function for creating a complete migration system
import { MigrationManager } from './migration-manager';
import { SchemaAnalyzer } from './schema-analyzer';
import { DataTransferManager } from './data-transfer-manager';
import { FileMigrationStorage, MigrationStorage } from './migration-storage';

export interface MigrationSystemOptions {
  storageType?: 'file' | 'database';
  storageConfig?: {
    directory?: string;
    connectionString?: string;
  };
  transferOptions?: {
    batchSize?: number;
    maxConcurrentBatches?: number;
    retryAttempts?: number;
  };
}

export function createMigrationSystem(options: MigrationSystemOptions = {}): MigrationManager {
  // Create storage instance
  let storage: MigrationStorage;
  
  if (options.storageType === 'database') {
    throw new Error('Database storage not yet implemented');
  } else {
    storage = new FileMigrationStorage(options.storageConfig?.directory);
  }

  // Create component instances
  const schemaAnalyzer = new SchemaAnalyzer();
  const dataTransferManager = new DataTransferManager(options.transferOptions);

  // Create and return migration manager
  return new MigrationManager(schemaAnalyzer, dataTransferManager, storage);
}

// Convenience exports for common use cases
export const createFileMigrationSystem = (storageDir?: string) => 
  createMigrationSystem({ 
    storageType: 'file', 
    storageConfig: { directory: storageDir } 
  });

export const createDatabaseMigrationSystem = (connectionString: string) => 
  createMigrationSystem({ 
    storageType: 'database', 
    storageConfig: { connectionString } 
  });