/**
 * MongoDB Database Adapter
 * 
 * Implements database operations for MongoDB
 */

import { DatabaseAdapter, DatabaseConnection } from '../database-provider';

export class MongoDBConnection implements DatabaseConnection {
  private client: any;
  private db: any;
  private connected = false;

  constructor(client: any, dbName: string) {
    this.client = client;
    this.db = client.db(dbName);
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to MongoDB: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async query(collection: string, filter?: unknown): Promise<unknown[]> {
    try {
      const result = await this.db.collection(collection).find(filter || {}).toArray();
      return result;
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }

  async execute(operation: string, params?: unknown[]): Promise<{ affectedRows: number; insertId?: string }> {
    try {
      // Parse MongoDB operation from SQL-like syntax
      const { collection, operation: op, data, filter } = this.parseOperation(operation, params);
      
      let result: any;
      
      switch (op) {
        case 'INSERT':
          result = await this.db.collection(collection).insertOne(data);
          return {
            affectedRows: result.insertedCount || 0,
            insertId: result.insertedId?.toString()
          };
          
        case 'UPDATE':
          result = await this.db.collection(collection).updateMany(filter, { $set: data });
          return {
            affectedRows: result.modifiedCount || 0
          };
          
        case 'DELETE':
          result = await this.db.collection(collection).deleteMany(filter);
          return {
            affectedRows: result.deletedCount || 0
          };
          
        default:
          throw new Error(`Unsupported operation: ${op}`);
      }
    } catch (error) {
      throw new Error(`Execute failed: ${error}`);
    }
  }

  async transaction<T>(callback: (connection: DatabaseConnection) => Promise<T>): Promise<T> {
    const session = this.client.startSession();
    
    try {
      session.startTransaction();
      const result = await callback(this);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  // MongoDB-specific methods
  async findOne(collection: string, filter: unknown): Promise<unknown> {
    return await this.db.collection(collection).findOne(filter);
  }

  async insertOne(collection: string, document: unknown): Promise<{ insertedId: string }> {
    const result = await this.db.collection(collection).insertOne(document);
    return { insertedId: result.insertedId.toString() };
  }

  async updateOne(collection: string, filter: unknown, update: unknown): Promise<{ modifiedCount: number }> {
    const result = await this.db.collection(collection).updateOne(filter, { $set: update });
    return { modifiedCount: result.modifiedCount };
  }

  async deleteOne(collection: string, filter: unknown): Promise<{ deletedCount: number }> {
    const result = await this.db.collection(collection).deleteOne(filter);
    return { deletedCount: result.deletedCount };
  }

  async find(collection: string, filter: unknown, options?: { limit?: number; skip?: number; sort?: unknown }): Promise<unknown[]> {
    let cursor = this.db.collection(collection).find(filter);
    
    if (options?.sort) {
      cursor = cursor.sort(options.sort);
    }
    
    if (options?.skip) {
      cursor = cursor.skip(options.skip);
    }
    
    if (options?.limit) {
      cursor = cursor.limit(options.limit);
    }
    
    return await cursor.toArray();
  }

  async countDocuments(collection: string, filter: unknown): Promise<number> {
    return await this.db.collection(collection).countDocuments(filter);
  }

  private parseOperation(operation: string, params?: unknown[]): {
    collection: string;
    operation: string;
    data?: unknown;
    filter?: unknown;
  } {
    // This is a simplified parser for converting SQL-like operations to MongoDB operations
    // In a real implementation, you'd want a more robust parser
    
    const upperOp = operation.toUpperCase();
    
    if (upperOp.includes('INSERT INTO')) {
      const match = operation.match(/INSERT INTO (\w+)/i);
      const collection = match?.[1] || 'unknown';
      return {
        collection,
        operation: 'INSERT',
        data: params?.[0]
      };
    }
    
    if (upperOp.includes('UPDATE')) {
      const match = operation.match(/UPDATE (\w+)/i);
      const collection = match?.[1] || 'unknown';
      return {
        collection,
        operation: 'UPDATE',
        data: params?.[0],
        filter: params?.[1]
      };
    }
    
    if (upperOp.includes('DELETE FROM')) {
      const match = operation.match(/DELETE FROM (\w+)/i);
      const collection = match?.[1] || 'unknown';
      return {
        collection,
        operation: 'DELETE',
        filter: params?.[0]
      };
    }
    
    throw new Error(`Unsupported operation: ${operation}`);
  }
}

export class MongoDBAdapter implements DatabaseAdapter {
  async createConnection(connectionString: string, options?: Record<string, unknown>): Promise<DatabaseConnection> {
    try {
      // Dynamic import to avoid bundling mongodb if not used
      const { MongoClient } = await import('mongodb');
      
      const client = new MongoClient(connectionString, {
        maxPoolSize: options?.poolSize as number || 10,
        serverSelectionTimeoutMS: options?.timeout as number || 30000,
        ssl: options?.ssl as boolean || false
      });

      // Extract database name from connection string
      const url = new URL(connectionString);
      const dbName = url.pathname.slice(1) || 'cms';

      return new MongoDBConnection(client, dbName);
    } catch (error) {
      throw new Error(`Failed to create MongoDB connection: ${error}`);
    }
  }

  async validateConnection(connection: DatabaseConnection): Promise<boolean> {
    try {
      const mongoConnection = connection as MongoDBConnection;
      await mongoConnection.findOne('test', {});
      return true;
    } catch {
      return false;
    }
  }

  async createTables(connection: DatabaseConnection): Promise<void> {
    const mongoConnection = connection as MongoDBConnection;
    
    // Create collections and indexes
    const collections = [
      'tenants',
      'users', 
      'cms_pages',
      'cms_blocks',
      'cms_seo',
      'cms_components',
      'cms_settings'
    ];

    for (const collectionName of collections) {
      try {
        await mongoConnection.db.createCollection(collectionName);
      } catch (error) {
        // Collection might already exist, ignore error
      }
    }

    // Create indexes
    const indexes = [
      // Tenants indexes
      { collection: 'tenants', index: { domain: 1 }, options: { unique: true, sparse: true } },
      { collection: 'tenants', index: { subdomain: 1 }, options: { unique: true, sparse: true } },
      
      // Users indexes
      { collection: 'users', index: { email: 1 }, options: { unique: true } },
      { collection: 'users', index: { tenant_id: 1 } },
      
      // Pages indexes
      { collection: 'cms_pages', index: { tenant_id: 1, slug: 1 }, options: { unique: true } },
      { collection: 'cms_pages', index: { status: 1 } },
      { collection: 'cms_pages', index: { updated_at: -1 } },
      
      // Blocks indexes
      { collection: 'cms_blocks', index: { tenant_id: 1, block_id: 1 }, options: { unique: true } },
      { collection: 'cms_blocks', index: { category: 1 } },
      
      // SEO indexes
      { collection: 'cms_seo', index: { tenant_id: 1, type: 1, reference_id: 1 }, options: { unique: true } },
      
      // Components indexes
      { collection: 'cms_components', index: { tenant_id: 1, component_key: 1 }, options: { unique: true } },
      
      // Settings indexes
      { collection: 'cms_settings', index: { tenant_id: 1, key: 1 }, options: { unique: true } }
    ];

    for (const { collection, index, options } of indexes) {
      try {
        await mongoConnection.db.collection(collection).createIndex(index, options);
      } catch (error) {
        console.warn(`Failed to create index on ${collection}:`, error);
      }
    }
  }

  async dropTables(connection: DatabaseConnection): Promise<void> {
    const mongoConnection = connection as MongoDBConnection;
    
    const collections = [
      'cms_settings',
      'cms_components',
      'cms_seo', 
      'cms_blocks',
      'cms_pages',
      'users',
      'tenants'
    ];

    for (const collection of collections) {
      try {
        await mongoConnection.db.collection(collection).drop();
      } catch (error) {
        // Collection might not exist, ignore error
      }
    }
  }
}