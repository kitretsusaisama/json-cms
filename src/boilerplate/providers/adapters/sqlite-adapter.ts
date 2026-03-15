/**
 * SQLite Database Adapter
 * 
 * Implements database operations for SQLite
 */

import { DatabaseAdapter, DatabaseConnection } from '../database-provider';

export class SQLiteConnection implements DatabaseConnection {
  private db: any;
  private connected = false;

  constructor(db: any) {
    this.db = db;
  }

  async connect(): Promise<void> {
    try {
      // SQLite connection is established when the database is opened
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to SQLite: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.all(params || []);
      return result;
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number; insertId?: string }> {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(params || []);
      
      return {
        affectedRows: result.changes || 0,
        insertId: result.lastInsertRowid?.toString()
      };
    } catch (error) {
      throw new Error(`Execute failed: ${error}`);
    }
  }

  async transaction<T>(callback: (connection: DatabaseConnection) => Promise<T>): Promise<T> {
    const transaction = this.db.transaction(async () => {
      return await callback(this);
    });
    
    return transaction();
  }
}

export class SQLiteAdapter implements DatabaseAdapter {
  async createConnection(connectionString: string, options?: Record<string, unknown>): Promise<DatabaseConnection> {
    try {
      // Dynamic import to avoid bundling better-sqlite3 if not used
      const Database = (await import('better-sqlite3')).default;
      
      // Extract file path from connection string
      const dbPath = connectionString.replace('sqlite://', '') || ':memory:';
      
      const db = new Database(dbPath, {
        verbose: options?.verbose as any,
        fileMustExist: false
      });

      // Enable WAL mode for better concurrency
      db.pragma('journal_mode = WAL');
      
      return new SQLiteConnection(db);
    } catch (error) {
      throw new Error(`Failed to create SQLite connection: ${error}`);
    }
  }

  async validateConnection(connection: DatabaseConnection): Promise<boolean> {
    try {
      await connection.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async createTables(connection: DatabaseConnection): Promise<void> {
    const tables = [
      // Tenants table
      `
        CREATE TABLE IF NOT EXISTS tenants (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          name TEXT NOT NULL,
          domain TEXT UNIQUE,
          subdomain TEXT UNIQUE,
          settings TEXT DEFAULT '{}',
          features TEXT DEFAULT '{}',
          limits TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      
      // Users table
      `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          tenant_id TEXT REFERENCES tenants(id),
          roles TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      
      // Pages table
      `
        CREATE TABLE IF NOT EXISTS cms_pages (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          tenant_id TEXT REFERENCES tenants(id),
          slug TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          status TEXT DEFAULT 'draft',
          version INTEGER DEFAULT 1,
          created_by TEXT REFERENCES users(id),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_by TEXT REFERENCES users(id),
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          published_at DATETIME,
          metadata TEXT DEFAULT '{}',
          UNIQUE(tenant_id, slug)
        )
      `,
      
      // Blocks table
      `
        CREATE TABLE IF NOT EXISTS cms_blocks (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          tenant_id TEXT REFERENCES tenants(id),
          block_id TEXT NOT NULL,
          name TEXT NOT NULL,
          category TEXT,
          content TEXT NOT NULL,
          tags TEXT DEFAULT '[]',
          created_by TEXT REFERENCES users(id),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tenant_id, block_id)
        )
      `,
      
      // SEO data table
      `
        CREATE TABLE IF NOT EXISTS cms_seo (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          tenant_id TEXT REFERENCES tenants(id),
          type TEXT NOT NULL,
          reference_id TEXT NOT NULL,
          title TEXT,
          description TEXT,
          canonical TEXT,
          robots TEXT,
          meta_data TEXT DEFAULT '{}',
          structured_data TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tenant_id, type, reference_id)
        )
      `,
      
      // Components table
      `
        CREATE TABLE IF NOT EXISTS cms_components (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          tenant_id TEXT REFERENCES tenants(id),
          component_key TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT,
          props TEXT DEFAULT '{}',
          schema TEXT DEFAULT '{}',
          metadata TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tenant_id, component_key)
        )
      `,
      
      // Settings table
      `
        CREATE TABLE IF NOT EXISTS cms_settings (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          tenant_id TEXT REFERENCES tenants(id),
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          category TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tenant_id, key)
        )
      `
    ];

    for (const table of tables) {
      await connection.execute(table);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_cms_pages_tenant_slug ON cms_pages(tenant_id, slug)',
      'CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON cms_pages(status)',
      'CREATE INDEX IF NOT EXISTS idx_cms_pages_updated_at ON cms_pages(updated_at)',
      'CREATE INDEX IF NOT EXISTS idx_cms_blocks_tenant_id ON cms_blocks(tenant_id, block_id)',
      'CREATE INDEX IF NOT EXISTS idx_cms_blocks_category ON cms_blocks(category)',
      'CREATE INDEX IF NOT EXISTS idx_cms_seo_tenant_type_ref ON cms_seo(tenant_id, type, reference_id)',
      'CREATE INDEX IF NOT EXISTS idx_cms_components_tenant_key ON cms_components(tenant_id, component_key)',
      'CREATE INDEX IF NOT EXISTS idx_cms_settings_tenant_key ON cms_settings(tenant_id, key)'
    ];

    for (const index of indexes) {
      await connection.execute(index);
    }

    // Create triggers for updated_at timestamps
    const triggers = [
      `
        CREATE TRIGGER IF NOT EXISTS update_tenants_updated_at 
        AFTER UPDATE ON tenants
        BEGIN
          UPDATE tenants SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `,
      `
        CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
        AFTER UPDATE ON users
        BEGIN
          UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `,
      `
        CREATE TRIGGER IF NOT EXISTS update_cms_pages_updated_at 
        AFTER UPDATE ON cms_pages
        BEGIN
          UPDATE cms_pages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `,
      `
        CREATE TRIGGER IF NOT EXISTS update_cms_blocks_updated_at 
        AFTER UPDATE ON cms_blocks
        BEGIN
          UPDATE cms_blocks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `,
      `
        CREATE TRIGGER IF NOT EXISTS update_cms_seo_updated_at 
        AFTER UPDATE ON cms_seo
        BEGIN
          UPDATE cms_seo SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `,
      `
        CREATE TRIGGER IF NOT EXISTS update_cms_components_updated_at 
        AFTER UPDATE ON cms_components
        BEGIN
          UPDATE cms_components SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `,
      `
        CREATE TRIGGER IF NOT EXISTS update_cms_settings_updated_at 
        AFTER UPDATE ON cms_settings
        BEGIN
          UPDATE cms_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `
    ];

    for (const trigger of triggers) {
      await connection.execute(trigger);
    }
  }

  async dropTables(connection: DatabaseConnection): Promise<void> {
    // Drop triggers first
    const triggers = [
      'update_cms_settings_updated_at',
      'update_cms_components_updated_at',
      'update_cms_seo_updated_at',
      'update_cms_blocks_updated_at',
      'update_cms_pages_updated_at',
      'update_users_updated_at',
      'update_tenants_updated_at'
    ];

    for (const trigger of triggers) {
      await connection.execute(`DROP TRIGGER IF EXISTS ${trigger}`);
    }

    // Drop tables
    const tables = [
      'cms_settings',
      'cms_components',
      'cms_seo',
      'cms_blocks', 
      'cms_pages',
      'users',
      'tenants'
    ];

    for (const table of tables) {
      await connection.execute(`DROP TABLE IF EXISTS ${table}`);
    }
  }
}