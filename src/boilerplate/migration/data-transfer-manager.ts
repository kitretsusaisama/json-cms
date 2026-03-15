/**
 * Data Transfer Manager Implementation
 * 
 * Handles batch data transfer with validation, integrity checks,
 * and performance optimization for large-scale migrations.
 */

import { 
  DataTransferManager as IDataTransferManager,
  ContentSource,
  DataBatch,
  ContentItem,
  TransferResult,
  TransferError,
  ValidationResult,
  ValidationError
} from './interfaces';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class DataTransferManager implements IDataTransferManager {
  private batchSize: number;
  private maxConcurrentBatches: number;
  private retryAttempts: number;

  constructor(options: {
    batchSize?: number;
    maxConcurrentBatches?: number;
    retryAttempts?: number;
  } = {}) {
    this.batchSize = options.batchSize || 100;
    this.maxConcurrentBatches = options.maxConcurrentBatches || 5;
    this.retryAttempts = options.retryAttempts || 3;
  }

  async createBatches(source: ContentSource, batchSize?: number): Promise<DataBatch[]> {
    const effectiveBatchSize = batchSize || this.batchSize;
    
    if (source.type === 'file') {
      return this.createBatchesFromFiles(source, effectiveBatchSize);
    } else {
      return this.createBatchesFromDatabase(source, effectiveBatchSize);
    }
  }

  async transferBatch(batch: DataBatch): Promise<TransferResult> {
    const startTime = Date.now();
    const result: TransferResult = {
      batchId: batch.id,
      status: 'success',
      itemsProcessed: 0,
      itemsTotal: batch.items.length,
      errors: [],
      duration: 0
    };

    try {
      // Validate batch before transfer
      const validation = await this.validateBatch(batch);
      if (!validation.valid) {
        result.status = 'failed';
        result.errors = validation.errors.map(err => ({
          itemId: err.item,
          type: 'validation',
          message: err.message,
          recoverable: err.severity === 'warning'
        }));
        return result;
      }

      // Process items with retry logic
      for (const item of batch.items) {
        let attempts = 0;
        let success = false;

        while (attempts < this.retryAttempts && !success) {
          try {
            await this.transferItem(item);
            result.itemsProcessed++;
            success = true;
          } catch (error) {
            attempts++;
            
            if (attempts >= this.retryAttempts) {
              const transferError: TransferError = {
                itemId: item.id,
                type: 'constraint',
                message: `Failed to transfer item after ${attempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
                recoverable: false
              };
              result.errors.push(transferError);
              
              if (result.errors.length > batch.items.length * 0.1) {
                // If more than 10% of items fail, mark batch as failed
                result.status = 'failed';
                break;
              }
            } else {
              // Wait before retry with exponential backoff
              await this.delay(Math.pow(2, attempts) * 1000);
            }
          }
        }
      }

      // Determine final status
      if (result.errors.length === 0) {
        result.status = 'success';
      } else if (result.itemsProcessed > 0) {
        result.status = 'partial';
      } else {
        result.status = 'failed';
      }

      result.duration = Date.now() - startTime;
      return result;

    } catch (error) {
      result.status = 'failed';
      result.duration = Date.now() - startTime;
      result.errors.push({
        itemId: 'batch',
        type: 'constraint',
        message: `Batch transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recoverable: false
      });
      
      return result;
    }
  }

  async validateBatch(batch: DataBatch): Promise<ValidationResult> {
    const validation: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      summary: {
        totalItems: batch.items.length,
        validItems: 0,
        invalidItems: 0,
        missingItems: 0
      }
    };

    // Validate batch integrity
    const calculatedChecksum = this.calculateBatchChecksum(batch);
    if (calculatedChecksum !== batch.checksum) {
      validation.valid = false;
      validation.errors.push({
        type: 'data',
        item: batch.id,
        message: 'Batch checksum mismatch - data may be corrupted',
        severity: 'error'
      });
    }

    // Validate individual items
    for (const item of batch.items) {
      const itemValidation = await this.validateItem(item);
      
      if (itemValidation.valid) {
        validation.summary.validItems++;
      } else {
        validation.summary.invalidItems++;
        validation.valid = false;
        validation.errors.push(...itemValidation.errors);
      }
    }

    // Check for duplicates within batch
    const duplicates = this.findDuplicates(batch.items);
    if (duplicates.length > 0) {
      validation.warnings.push(`Found ${duplicates.length} duplicate items in batch`);
      
      for (const duplicate of duplicates) {
        validation.errors.push({
          type: 'data',
          item: duplicate,
          message: 'Duplicate item detected in batch',
          severity: 'warning'
        });
      }
    }

    return validation;
  }

  private async createBatchesFromFiles(source: ContentSource, batchSize: number): Promise<DataBatch[]> {
    const batches: DataBatch[] = [];
    const config = source.config as any; // FileSourceConfig
    
    // Process each content type
    const contentTypes = ['pages', 'blocks', 'seo', 'settings'];
    
    for (const contentType of contentTypes) {
      const pattern = config.patterns[contentType];
      if (!pattern) continue;
      
      const files = await glob(path.join(config.basePath, pattern));
      const items: ContentItem[] = [];
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const data = JSON.parse(content);
          
          const item: ContentItem = {
            id: this.generateItemId(file, data),
            type: contentType,
            data,
            metadata: {
              source: file,
              checksum: this.calculateChecksum(JSON.stringify(data)),
              size: Buffer.byteLength(content, 'utf-8'),
              dependencies: this.extractDependencies(data)
            }
          };
          
          items.push(item);
        } catch (error) {
          console.warn(`Failed to process file ${file}:`, error);
        }
      }
      
      // Create batches for this content type
      const typeBatches = this.createBatchesFromItems(items, contentType, batchSize);
      batches.push(...typeBatches);
    }
    
    return batches;
  }

  private async createBatchesFromDatabase(source: ContentSource, batchSize: number): Promise<DataBatch[]> {
    // This would query the database and create batches
    // Implementation depends on the specific database provider
    throw new Error('Database source batching not yet implemented');
  }

  private createBatchesFromItems(items: ContentItem[], type: string, batchSize: number): DataBatch[] {
    const batches: DataBatch[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batchItems = items.slice(i, i + batchSize);
      const batch: DataBatch = {
        id: uuidv4(),
        type: type as any,
        items: batchItems,
        size: batchItems.reduce((sum, item) => sum + item.metadata.size, 0),
        checksum: this.calculateBatchChecksum({ items: batchItems } as DataBatch)
      };
      
      batches.push(batch);
    }
    
    return batches;
  }

  private generateItemId(filePath: string, data: any): string {
    // Try to use existing ID from data, otherwise generate from file path
    if (data.id) return data.id;
    if (data.slug) return data.slug;
    
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName;
  }

  private calculateChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private calculateBatchChecksum(batch: { items: ContentItem[] }): string {
    const itemChecksums = batch.items
      .map(item => item.metadata.checksum)
      .sort()
      .join('');
    
    return this.calculateChecksum(itemChecksums);
  }

  private extractDependencies(data: any): string[] {
    const dependencies: string[] = [];
    
    // Recursively find references to other content
    this.findReferences(data, dependencies);
    
    return [...new Set(dependencies)]; // Remove duplicates
  }

  private findReferences(obj: any, dependencies: string[]): void {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.findReferences(item, dependencies);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        // Look for ID references
        if (key.endsWith('Id') || key.endsWith('_id')) {
          if (typeof value === 'string') {
            dependencies.push(value);
          }
        }
        
        // Look for component references
        if (key === 'componentType' && typeof value === 'string') {
          dependencies.push(value);
        }
        
        // Look for block references
        if (key === 'blockId' && typeof value === 'string') {
          dependencies.push(value);
        }
        
        this.findReferences(value, dependencies);
      }
    }
  }

  private async validateItem(item: ContentItem): Promise<ValidationResult> {
    const validation: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      summary: {
        totalItems: 1,
        validItems: 0,
        invalidItems: 0,
        missingItems: 0
      }
    };

    try {
      // Validate item structure
      if (!item.id || !item.type || !item.data) {
        validation.valid = false;
        validation.errors.push({
          type: 'schema',
          item: item.id || 'unknown',
          message: 'Item missing required fields (id, type, or data)',
          severity: 'error'
        });
      }

      // Validate checksum
      const calculatedChecksum = this.calculateChecksum(JSON.stringify(item.data));
      if (calculatedChecksum !== item.metadata.checksum) {
        validation.valid = false;
        validation.errors.push({
          type: 'data',
          item: item.id,
          message: 'Item checksum mismatch - data may be corrupted',
          severity: 'error'
        });
      }

      // Validate data structure based on type
      await this.validateItemData(item, validation);

      if (validation.valid) {
        validation.summary.validItems = 1;
      } else {
        validation.summary.invalidItems = 1;
      }

    } catch (error) {
      validation.valid = false;
      validation.errors.push({
        type: 'validation',
        item: item.id,
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
      validation.summary.invalidItems = 1;
    }

    return validation;
  }

  private async validateItemData(item: ContentItem, validation: ValidationResult): Promise<void> {
    switch (item.type) {
      case 'pages':
        this.validatePageData(item.data, validation);
        break;
      case 'blocks':
        this.validateBlockData(item.data, validation);
        break;
      case 'seo':
        this.validateSeoData(item.data, validation);
        break;
      case 'settings':
        this.validateSettingsData(item.data, validation);
        break;
      default:
        validation.warnings.push(`Unknown item type: ${item.type}`);
    }
  }

  private validatePageData(data: any, validation: ValidationResult): void {
    // Validate page-specific structure
    if (!data.slug) {
      validation.valid = false;
      validation.errors.push({
        type: 'schema',
        item: data.id || 'unknown',
        field: 'slug',
        message: 'Page missing required slug field',
        severity: 'error'
      });
    }

    if (data.blocks && !Array.isArray(data.blocks)) {
      validation.valid = false;
      validation.errors.push({
        type: 'schema',
        item: data.id || 'unknown',
        field: 'blocks',
        message: 'Page blocks must be an array',
        severity: 'error'
      });
    }
  }

  private validateBlockData(data: any, validation: ValidationResult): void {
    // Validate block-specific structure
    if (!data.componentType) {
      validation.valid = false;
      validation.errors.push({
        type: 'schema',
        item: data.id || 'unknown',
        field: 'componentType',
        message: 'Block missing required componentType field',
        severity: 'error'
      });
    }
  }

  private validateSeoData(data: any, validation: ValidationResult): void {
    // Validate SEO-specific structure
    if (!data.title && !data.description) {
      validation.warnings.push('SEO data missing both title and description');
    }
  }

  private validateSettingsData(data: any, validation: ValidationResult): void {
    // Validate settings-specific structure
    if (typeof data !== 'object') {
      validation.valid = false;
      validation.errors.push({
        type: 'schema',
        item: 'settings',
        message: 'Settings data must be an object',
        severity: 'error'
      });
    }
  }

  private findDuplicates(items: ContentItem[]): string[] {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    
    for (const item of items) {
      if (seen.has(item.id)) {
        duplicates.push(item.id);
      } else {
        seen.add(item.id);
      }
    }
    
    return duplicates;
  }

  private async transferItem(item: ContentItem): Promise<void> {
    // This would implement the actual transfer logic
    // For now, we'll simulate the transfer
    console.log(`Transferring item: ${item.id} (${item.type})`);
    
    // Simulate processing time
    await this.delay(10);
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Simulated transfer failure');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}