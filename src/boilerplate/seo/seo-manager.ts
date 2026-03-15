/**
 * Centralized SEO Manager
 * Extends existing SEO functionality with comprehensive management features
 */

import { Metadata } from 'next';
import { PageV2 } from '@/types/composer';
import { SeoRecord, SeoType } from '@/types/seo';
import { getSeoWithDefaults } from '@/lib/seo-store';
import { generateStructuredData } from '@/lib/seo/structured-data';
import { 
  SEOManager, 
  RequestContext, 
  SEOMetadata, 
  SEOOptimization,
  ValidationResult,
  StructuredDataResult,
  SEOHealthScore
} from './interfaces';
import { OptimizationEngine } from './optimization-engine';
import { StructuredDataGenerator } from './structured-data-generator';
import { ValidationEngine } from './validation-engine';
import { HealthChecker } from './health-checker';

export class CentralizedSEOManager implements SEOManager {
  private optimizationEngine: OptimizationEngine;
  private structuredDataGenerator: StructuredDataGenerator;
  private validationEngine: ValidationEngine;
  private healthChecker: HealthChecker;

  constructor() {
    this.optimizationEngine = new OptimizationEngine();
    this.structuredDataGenerator = new StructuredDataGenerator();
    this.validationEngine = new ValidationEngine();
    this.healthChecker = new HealthChecker();
  }

  /**
   * Generate comprehensive metadata for a page
   */
  async generateMetadata(pageData: PageV2, context: RequestContext): Promise<SEOMetadata> {
    // Get SEO record with tenant context
    const seoRecord = await this.getSEORecord(pageData.slug || 'default', context);
    
    // Generate structured data from page content
    const structuredData = await this.generateStructuredData(pageData);
    
    // Build comprehensive metadata
    const metadata: SEOMetadata = {
      title: seoRecord?.title || this.generateTitleFromPage(pageData),
      description: seoRecord?.description || this.generateDescriptionFromPage(pageData),
      canonical: seoRecord?.canonical || this.generateCanonicalUrl(pageData, context),
      robots: seoRecord?.robots || 'index,follow',
      meta: seoRecord?.meta || [],
      openGraph: seoRecord?.openGraph ? {
        type: seoRecord.openGraph.type,
        title: seoRecord.openGraph.title,
        description: seoRecord.openGraph.description,
        url: seoRecord.openGraph.url,
        images: seoRecord.openGraph.images
      } : undefined,
      twitter: seoRecord?.twitter ? {
        card: seoRecord.twitter.card,
        site: seoRecord.twitter.site,
        creator: seoRecord.twitter.creator,
        title: seoRecord.twitter.title,
        description: seoRecord.twitter.description,
        image: seoRecord.twitter.image
      } : undefined,
      structuredData
    };

    return metadata;
  }

  /**
   * Optimize page SEO with scoring and suggestions
   */
  async optimizePage(pageId: string, content: string): Promise<SEOOptimization> {
    return this.optimizationEngine.analyzePage(pageId, content);
  } 
 /**
   * Validate SEO data
   */
  async validateSEO(seoData: SeoRecord): Promise<ValidationResult> {
    return this.validationEngine.validate(seoData);
  }

  /**
   * Generate structured data from page content
   */
  async generateStructuredData(pageData: PageV2): Promise<StructuredDataResult[]> {
    return this.structuredDataGenerator.generateFromPage(pageData);
  }

  /**
   * Get comprehensive health score for a page
   */
  async getHealthScore(pageId: string): Promise<SEOHealthScore> {
    return this.healthChecker.analyzePageHealth(pageId);
  }

  /**
   * Get SEO record with tenant context
   */
  private async getSEORecord(slug: string, context: RequestContext): Promise<SeoRecord | null> {
    // In multi-tenant setup, we could modify the slug to include tenant context
    const tenantSlug = context.tenantId ? `${context.tenantId}:${slug}` : slug;
    return getSeoWithDefaults('page', tenantSlug);
  }

  /**
   * Generate title from page data if no SEO record exists
   */
  private generateTitleFromPage(pageData: PageV2): string {
    // Extract title from page components or use slug
    const titleComponent = pageData.components?.find(c => 
      c.componentType === 'hero' || c.componentType === 'header'
    );
    
    if (titleComponent?.props?.title) {
      return titleComponent.props.title;
    }
    
    return pageData.slug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Page';
  }

  /**
   * Generate description from page data if no SEO record exists
   */
  private generateDescriptionFromPage(pageData: PageV2): string {
    // Extract description from page components
    const descComponent = pageData.components?.find(c => 
      c.props?.description || c.props?.subtitle
    );
    
    if (descComponent?.props?.description) {
      return descComponent.props.description;
    }
    
    if (descComponent?.props?.subtitle) {
      return descComponent.props.subtitle;
    }
    
    return 'Page description';
  }

  /**
   * Generate canonical URL for page
   */
  private generateCanonicalUrl(pageData: PageV2, context: RequestContext): string {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const path = pageData.slug === 'home' ? '/' : `/${pageData.slug}`;
    
    if (context.locale && context.locale !== 'en') {
      return `${baseUrl}/${context.locale}${path}`;
    }
    
    return `${baseUrl}${path}`;
  }
}