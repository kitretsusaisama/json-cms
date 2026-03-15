/**
 * PostgreSQL Database Adapter
 * 
 * Implements database operations for PostgreSQL
 */

import { DatabaseAdapter, DatabaseConnection } from '../database-provider';

export class PostgreSQLConnection implements DatabaseConnection {
  private client: any;
  private pool: any;
  private connected = false;

  constructor(pool: any) {
    this.pool = pool;
  }

  async connect(): Promise<void> {
    try {
      this.client = await this.pool.connect();
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.release();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    try {
      const result = await this.client.query(sql, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number; insertId?: string }> {
    try {
      const result = await this.client.query(sql, params);
      return {
        affectedRows: result.rowCount || 0,
        insertId: result.rows[0]?.id
      };
    } catch (error) {
      throw new Error(`Execute failed: ${error}`);
    }
  }

  async transaction<T>(callback: (connection: DatabaseConnection) => Promise<T>): Promise<T> {
    try {
      await this.client.query('BEGIN');
      const result = await callback(this);
      await this.client.query('COMMIT');
      return result;
    } catch (error) {
      await this.client.query('ROLLBACK');
      throw error;
    }
  }
}

export class PostgreSQLAdapter implements DatabaseAdapter {
  async createConnection(connectionString: string, options?: Record<string, unknown>): Promise<DatabaseConnection> {
    try {
      // Dynamic import to avoid bundling pg if not used
      const { Pool } = await import('pg');
      
      const pool = new Pool({
        connectionString,
        max: options?.poolSize as number || 10,
        connectionTimeoutMillis: options?.timeout as number || 30000,
        ssl: options?.ssl as boolean || false
      });

      return new PostgreSQLConnection(pool);
    } catch (error) {
      throw new Error(`Failed to create PostgreSQL connection: ${error}`);
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
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          domain VARCHAR(255) UNIQUE,
          subdomain VARCHAR(100) UNIQUE,
          settings JSONB DEFAULT '{}',
          features JSONB DEFAULT '{}',
          limits JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `,
      
      // Users table
      `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255),
          tenant_id UUID REFERENCES tenants(id),
          roles JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `,
      
      // Pages table
      `
        CREATE TABLE IF NOT EXISTS cms_pages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id),
          slug VARCHAR(255) NOT NULL,
          title VARCHAR(500) NOT NULL,
          content JSONB NOT NULL,
          status VARCHAR(20) DEFAULT 'draft',
          version INTEGER DEFAULT 1,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_by UUID REFERENCES users(id),
          updated_at TIMESTAMP DEFAULT NOW(),
          published_at TIMESTAMP,
          metadata JSONB DEFAULT '{}',
          UNIQUE(tenant_id, slug)
        )
      `,
      
      // Blocks table
      `
        CREATE TABLE IF NOT EXISTS cms_blocks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id),
          block_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          content JSONB NOT NULL,
          tags JSONB DEFAULT '[]',
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(tenant_id, block_id)
        )
      `,
      
      // SEO data table
      `
        CREATE TABLE IF NOT EXISTS cms_seo (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id),
          type VARCHAR(50) NOT NULL,
          reference_id VARCHAR(255) NOT NULL,
          title VARCHAR(500),
          description TEXT,
          canonical VARCHAR(500),
          robots VARCHAR(100),
          meta_data JSONB DEFAULT '{}',
          structured_data JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(tenant_id, type, reference_id)
        )
      `,
      
      // Components table
      `
        CREATE TABLE IF NOT EXISTS cms_components (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id),
          component_key VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100),
          props JSONB DEFAULT '{}',
          schema JSONB DEFAULT '{}',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(tenant_id, component_key)
        )
      `,
      
      // Settings table
      `
        CREATE TABLE IF NOT EXISTS cms_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id),
          key VARCHAR(255) NOT NULL,
          value JSONB NOT NULL,
          category VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
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
  }

  async dropTables(connection: DatabaseConnection): Promise<void> {
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
      await connection.execute(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
  }
}