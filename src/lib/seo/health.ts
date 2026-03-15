import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../logger';
import { BaseSEOSchema } from './schemas/base';
import type { 
  SEOData, 
  SEOHealthCheckResult, 
  MetaTag, 
  StructuredDataItem 
} from './types/interfaces';


const resolveDefaultBaseDir = (): string => {
  const seoDir = path.join(process.cwd(), 'data', 'seo');
  if (existsSync(seoDir)) {
    return seoDir;
  }

  return path.join(process.cwd(), 'data', 'seoData');
};

export class SEOHealthChecker {
  private readonly baseDir: string;
  private results: SEOHealthCheckResult[] = [];

  constructor(baseDir: string = resolveDefaultBaseDir()) {
    this.baseDir = baseDir;
  }

  async checkAll(): Promise<SEOHealthCheckResult[]> {
    this.results = [];
    
    // Check all entity types
    const entityTypes = await fs.readdir(this.baseDir, { withFileTypes: true });
    
    for (const entityType of entityTypes) {
      if (entityType.isDirectory()) {
        await this.checkEntityType(entityType.name);
      }
    }
    
    return this.results;
  }

  private async checkEntityType(entityType: string): Promise<void> {
    const entityDir = path.join(this.baseDir, entityType);
    const files = await fs.readdir(entityDir);
    
    for (const file of files) {
      if (file.endsWith('.json') && !file.startsWith('_')) {
        await this.checkFile(path.join(entityDir, file));
      }
    }
  }

  private async checkFile(filePath: string): Promise<void> {
    const result: SEOHealthCheckResult = {
      file: path.relative(process.cwd(), filePath),
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data: SEOData = JSON.parse(content);
      
      // Validate against base schema
      const validation = BaseSEOSchema.safeParse(data);
      
      if (!validation.success) {
        result.isValid = false;
        result.errors = validation.error.issues.map(
          issue => `${issue.path.join('.')}: ${issue.message}`
        );
      }

      // Additional checks
      this.performAdditionalChecks(data, result);
      
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Failed to parse file: ${error instanceof Error ? error.message : String(error)}`);
    }

    this.results.push(result);
  }

  private performAdditionalChecks(data: SEOData, result: SEOHealthCheckResult): void {
    // Check title length
    if (data.title.length > 65) {
      result.warnings.push('Title is longer than recommended 65 characters');
    }

    // Check description length based on entity type
    const minDescLength = data.type === 'landing_page' ? 100 : 120;
    const maxDescLength = data.type === 'landing_page' ? 155 : 160;
    
    if (data.description.length < minDescLength || data.description.length > maxDescLength) {
      result.warnings.push(`Description should be between ${minDescLength}-${maxDescLength} characters`);
    }

    // Check for duplicate title/description
    if (data.title === data.description) {
      result.warnings.push('Title and description should not be identical');
    }

    // Entity-specific validations
    switch (data.type) {
      case 'product':
        this.validateProductSEO(data, result);
        break;
      case 'event':
        this.validateEventSEO(data, result);
        break;
      case 'landing_page':
        this.validateLandingPageSEO(data, result);
        break;
      default:
        this.validateDefaultSEO(data, result);
    }

    // Common validations for all types
    this.validateCommonSEO(data, result);
  }

  private validateCommonSEO(data: SEOData, result: SEOHealthCheckResult): void {
    // Check for OpenGraph image
    if (!data.openGraph?.images?.length && !data.openGraph?.image) {
      result.warnings.push('Missing OpenGraph image');
    }

    // Check for Twitter card when there are images
    if (data.openGraph?.images?.length && !data.twitter?.card) {
      result.warnings.push('Missing Twitter card type');
    }

    // Check for canonical URL
    if (!data.canonical) {
      result.warnings.push('Missing canonical URL');
    } else if (!data.canonical.startsWith('http')) {
      result.warnings.push('Canonical URL should be a full URL');
    }
  }

  private validateProductSEO(data: SEOData, result: SEOHealthCheckResult): void {
    // Check for price in meta
    const hasPrice = data.meta?.some((m: MetaTag) => 
      m.name === 'product:price:amount' || m.property === 'product:price:amount'
    );
    
    if (!hasPrice) {
      result.warnings.push('Missing product price in meta tags');
    }

    // Check for availability
    const hasAvailability = data.meta?.some((m: MetaTag) => 
      m.name === 'product:availability' || m.property === 'product:availability'
    );
    
    if (!hasAvailability) {
      result.warnings.push('Missing product availability in meta tags');
    }
  }

  private validateEventSEO(data: SEOData, result: SEOHealthCheckResult): void {
    // Check for start date
    if (!data.openGraph?.event?.start_time) {
      result.warnings.push('Missing event start time');
    }

    // Check for location or online URL
    const hasLocation = data.openGraph?.event?.location || 
                       data.structuredData?.[0]?.location?.url ||
                       data.structuredData?.[0]?.location?.name;
    
    if (!hasLocation) {
      result.warnings.push('Missing event location or online URL');
    }

    // Check for structured data
    if (!data.structuredData?.some((sd: StructuredDataItem) => 
      sd['@type'] === 'Event'
    )) {
      result.warnings.push('Missing Event structured data');
    }
  }

  private validateLandingPageSEO(data: SEOData, result: SEOHealthCheckResult): void {
    // Check for noindex if it's a campaign-specific page
    if (data.robots?.includes('noindex') && !data.meta?.some((m: MetaTag) => 
      m.name === 'robots' && m.content.includes('noindex')
    )) {
      result.warnings.push('Consider adding noindex to meta robots tag');
    }

    // Check for campaign tracking parameters
    const hasTracking = data.meta?.some((m: MetaTag) => 
      m.name === 'fb:app_id' || 
      m.name === 'p:domain_verify' ||
      m.name?.includes('google-site-verification')
    );
    
    if (!hasTracking) {
      result.warnings.push('Missing campaign tracking parameters');
    }
  }

  private validateDefaultSEO(data: SEOData, result: SEOHealthCheckResult): void {
    // Default validations for other entity types
    if (!data.openGraph?.type) {
      result.warnings.push('Missing OpenGraph type');
    }
  }

  static async generateReport(results: SEOHealthCheckResult[]): Promise<string> {
    const errorCount = results.filter(r => !r.isValid || r.errors.length > 0).length;
    const warningCount = results.reduce((sum, r) => sum + r.warnings.length, 0);
    
    let report = `SEO Health Check Report\n`;
    report += `=================================\n`;
    report += `Total files checked: ${results.length}\n`;
    report += `Files with errors: ${errorCount}\n`;
    report += `Total warnings: ${warningCount}\n\n`;

    for (const result of results) {
      if (!result.isValid || result.errors.length > 0 || result.warnings.length > 0) {
        report += `File: ${result.file}\n`;
        
        if (!result.isValid) {
          report += `❌ Invalid: ${result.errors.join('; ')}\n`;
        } else if (result.warnings.length > 0) {
          report += `⚠️  Warnings:\n`;
          report += result.warnings.map(w => `  • ${w}`).join('\n') + '\n';
        }
        
        report += '\n';
      }
    }

    return report;
  }
}

// CLI usage
if (require.main === module) {
  (async () => {
    const checker = new SEOHealthChecker();
    const results = await checker.checkAll();
    const report = await SEOHealthChecker.generateReport(results);
    
    await fs.writeFile(path.join(process.cwd(), 'seo-health-report.txt'), report, 'utf-8');

    // Log the report using the logger instead of console.log
    logger.info({ message: report });
    
    // Exit with error code if there are any issues
    const hasErrors = results.some(r => !r.isValid || r.errors.length > 0);
    process.exit(hasErrors ? 1 : 0);
  })().catch(error => {
    logger.error({ 
      message: 'Error running SEO health check', 
      error: error instanceof Error ? error : new Error(String(error)) 
    });
    process.exit(1);
  });
}
