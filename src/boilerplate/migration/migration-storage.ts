/**
 * Migration Storage Implementation
 * 
 * Handles persistence of migration plans, records, and metadata
 * with support for different storage backends.
 */

import { 
  MigrationPlan,
  MigrationRecord,
  MigrationStatus
} from './interfaces';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface MigrationStorage {
  storePlan(plan: MigrationPlan): Promise<void>;
  getPlan(planId: string): Promise<MigrationPlan | null>;
  deletePlan(planId: string): Promise<void>;
  
  storeRecord(record: MigrationRecord): Promise<void>;
  getRecord(migrationId: string): Promise<MigrationRecord | null>;
  updateRecord(migrationId: string, updates: Partial<MigrationRecord>): Promise<void>;
  getAllRecords(): Promise<MigrationRecord[]>;
  deleteRecord(migrationId: string): Promise<void>;
}

export class FileMigrationStorage implements MigrationStorage {
  private storageDir: string;
  private plansDir: string;
  private recordsDir: string;

  constructor(storageDir: string = './.kiro/migrations') {
    this.storageDir = storageDir;
    this.plansDir = path.join(storageDir, 'plans');
    this.recordsDir = path.join(storageDir, 'records');
  }

  async init(): Promise<void> {
    await fs.mkdir(this.storageDir, { recursive: true });
    await fs.mkdir(this.plansDir, { recursive: true });
    await fs.mkdir(this.recordsDir, { recursive: true });
  }

  async storePlan(plan: MigrationPlan): Promise<void> {
    await this.init();
    const filePath = path.join(this.plansDir, `${plan.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(plan, null, 2), 'utf-8');
  }

  async getPlan(planId: string): Promise<MigrationPlan | null> {
    try {
      const filePath = path.join(this.plansDir, `${planId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async deletePlan(planId: string): Promise<void> {
    try {
      const filePath = path.join(this.plansDir, `${planId}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async storeRecord(record: MigrationRecord): Promise<void> {
    await this.init();
    const filePath = path.join(this.recordsDir, `${record.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
  }

  async getRecord(migrationId: string): Promise<MigrationRecord | null> {
    try {
      const filePath = path.join(this.recordsDir, `${migrationId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async updateRecord(migrationId: string, updates: Partial<MigrationRecord>): Promise<void> {
    const existing = await this.getRecord(migrationId);
    if (!existing) {
      throw new Error(`Migration record not found: ${migrationId}`);
    }

    const updated = { ...existing, ...updates };
    await this.storeRecord(updated);
  }

  async getAllRecords(): Promise<MigrationRecord[]> {
    try {
      await this.init();
      const files = await fs.readdir(this.recordsDir);
      const records: MigrationRecord[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(this.recordsDir, file), 'utf-8');
            const record = JSON.parse(content);
            records.push(record);
          } catch (error) {
            console.warn(`Failed to read migration record ${file}:`, error);
          }
        }
      }

      // Sort by start time, newest first
      return records.sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async deleteRecord(migrationId: string): Promise<void> {
    try {
      const filePath = path.join(this.recordsDir, `${migrationId}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

export class DatabaseMigrationStorage implements MigrationStorage {
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  async storePlan(plan: MigrationPlan): Promise<void> {
    // Implementation would store in database
    throw new Error('Database storage not yet implemented');
  }

  async getPlan(planId: string): Promise<MigrationPlan | null> {
    // Implementation would query database
    throw new Error('Database storage not yet implemented');
  }

  async deletePlan(planId: string): Promise<void> {
    // Implementation would delete from database
    throw new Error('Database storage not yet implemented');
  }

  async storeRecord(record: MigrationRecord): Promise<void> {
    // Implementation would store in database
    throw new Error('Database storage not yet implemented');
  }

  async getRecord(migrationId: string): Promise<MigrationRecord | null> {
    // Implementation would query database
    throw new Error('Database storage not yet implemented');
  }

  async updateRecord(migrationId: string, updates: Partial<MigrationRecord>): Promise<void> {
    // Implementation would update database
    throw new Error('Database storage not yet implemented');
  }

  async getAllRecords(): Promise<MigrationRecord[]> {
    // Implementation would query database
    throw new Error('Database storage not yet implemented');
  }

  async deleteRecord(migrationId: string): Promise<void> {
    // Implementation would delete from database
    throw new Error('Database storage not yet implemented');
  }
}