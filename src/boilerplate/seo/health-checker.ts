/**
 * SEO Health Checker
 * Provides comprehensive health analysis for pages
 */

import { getSeoWithDefaults } from '@/lib/seo-store';
import { SEOHealthScore, SEOIssue, SEOSuggestion, SEOAnalysisOptions } from './interfaces';
import { ValidationEngine } from './validation-engine';
import { OptimizationEngine } from './optimization-engine';

export class HealthChecker {
  private validationEngine: ValidationEngine;
  private optimizationEngine: OptimizationEngine;

  constructor() {
    this.validationEngine = new ValidationEngine();
    this.optimizationEngine = new OptimizationEngine();
  }

  /**
   * Analyze comprehensive health score for a page
   */
  async analyzePageHealth(pageId: string, options: SEOAnalysisOptions = {}): Promise<SEOHealthScore> {
    // Get SEO data for the page
    const seoData = await getSeoWithDefaults('page', pageId);
    
    if (!seoData) {
      return this.generateEmptyHealthScore();
    }

    // Validate SEO data
    const validationResult = await this.validationEngine.validate(seoData);

    // Analyze technical SEO
    const technicalScore = this.analyzeTechnicalSEO(seoData);

    // Analyze content quality
    const contentScore = this.analyzeContentQuality(seoData);

    // Analyze performance indicators
    const performanceScore = options.includePerformance ? 
      await this.analyzePerformance(pageId) : 85;

    // Analyze accessibility
    const accessibilityScore = options.includeAccessibility ? 
      await this.analyzeAccessibility(pageId) : 80;

    // Collect all issues and recommendations
    const issues = this.collectIssues(validationResult, seoData);
    const recommendations = this.generateRecommendations(seoData, validationResult);

    // Calculate overall score
    const overall = Math.round(
      (technicalScore * 0.3 + 
       contentScore * 0.3 + 
       performanceScore * 0.2 + 
       accessibilityScore * 0.2)
    );

    return {
      overall,
      categories: {
        technical: technicalScore,
        content: contentScore,
        performance: performanceScore,
        accessibility: accessibilityScore
      },
      issues,
      recommendations
    };
  }

  /**
   * Analyze technical SEO aspects
   */
  private analyzeTechnicalSEO(seoData: any): number {
    let score = 100;

    // Check title optimization
    if (!seoData.title || seoData.title.length < 30 || seoData.title.length > 60) {
      score -= 15;
    }

    // Check description optimization
    if (!seoData.description || seoData.description.length < 120 || seoData.description.length > 160) {
      score -= 15;
    }

    // Check canonical URL
    if (!seoData.canonical) {
      score -= 10;
    }

    // Check robots directive
    if (!seoData.robots) {
      score -= 5;
    }

    // Check OpenGraph data
    if (!seoData.openGraph || !seoData.openGraph.title || !seoData.openGraph.description) {
      score -= 10;
    }

    // Check Twitter data
    if (!seoData.twitter || !seoData.twitter.card) {
      score -= 10;
    }

    // Check structured data
    if (!seoData.structuredData || seoData.structuredData.length === 0) {
      score -= 15;
    }

    return Math.max(0, score);
  }

  /**
   * Analyze content quality
   */
  private analyzeContentQuality(seoData: any): number {
    let score = 100;

    // Title quality
    if (seoData.title) {
      const titleWords = seoData.title.split(' ').length;
      if (titleWords < 4 || titleWords > 12) {
        score -= 10;
      }
    }

    // Description quality
    if (seoData.description) {
      const descWords = seoData.description.split(' ').length;
      if (descWords < 15 || descWords > 25) {
        score -= 10;
      }
    }

    // Meta tags diversity
    if (seoData.meta && seoData.meta.length > 0) {
      const hasKeywords = seoData.meta.some((tag: any) => tag.name === 'keywords');
      const hasAuthor = seoData.meta.some((tag: any) => tag.name === 'author');
      
      if (!hasKeywords) score -= 5;
      if (!hasAuthor) score -= 5;
    } else {
      score -= 15;
    }

    return Math.max(0, score);
  }  
/**
   * Analyze performance indicators (placeholder implementation)
   */
  private async analyzePerformance(pageId: string): Promise<number> {
    // In a real implementation, this would check:
    // - Page load speed
    // - Core Web Vitals
    // - Image optimization
    // - Resource compression
    
    // For now, return a baseline score
    return 85;
  }

  /**
   * Analyze accessibility (placeholder implementation)
   */
  private async analyzeAccessibility(pageId: string): Promise<number> {
    // In a real implementation, this would check:
    // - Alt text for images
    // - Heading structure
    // - Color contrast
    // - Keyboard navigation
    
    // For now, return a baseline score
    return 80;
  }

  /**
   * Collect issues from validation and analysis
   */
  private collectIssues(validationResult: any, seoData: any): SEOIssue[] {
    const issues: SEOIssue[] = [];

    // Add validation errors as issues
    if (validationResult.errors) {
      validationResult.errors.forEach((error: any) => {
        issues.push({
          type: 'error',
          code: error.code,
          message: error.message,
          element: error.field,
          fix: this.getFixSuggestion(error.code)
        });
      });
    }

    // Add validation warnings as issues
    if (validationResult.warnings) {
      validationResult.warnings.forEach((warning: any) => {
        issues.push({
          type: 'warning',
          code: `WARNING_${warning.field.toUpperCase()}`,
          message: warning.message,
          element: warning.field,
          fix: warning.suggestion
        });
      });
    }

    // Add technical SEO issues
    if (!seoData.structuredData || seoData.structuredData.length === 0) {
      issues.push({
        type: 'warning',
        code: 'MISSING_STRUCTURED_DATA',
        message: 'Page is missing structured data',
        fix: 'Add relevant structured data (WebSite, Article, etc.)'
      });
    }

    return issues;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(seoData: any, validationResult: any): SEOSuggestion[] {
    const recommendations: SEOSuggestion[] = [];

    // Title recommendations
    if (seoData.title && seoData.title.length < 50) {
      recommendations.push({
        type: 'title',
        priority: 'medium',
        message: 'Title could be more descriptive',
        suggestion: 'Consider adding more descriptive keywords to your title',
        impact: 15
      });
    }

    // Description recommendations
    if (seoData.description && seoData.description.length < 140) {
      recommendations.push({
        type: 'description',
        priority: 'medium',
        message: 'Meta description could be longer',
        suggestion: 'Expand your meta description to better describe the page content',
        impact: 10
      });
    }

    // Structured data recommendations
    if (!seoData.structuredData || seoData.structuredData.length === 0) {
      recommendations.push({
        type: 'structure',
        priority: 'high',
        message: 'Add structured data',
        suggestion: 'Implement structured data to help search engines understand your content',
        impact: 25
      });
    }

    // OpenGraph recommendations
    if (!seoData.openGraph || !seoData.openGraph.images) {
      recommendations.push({
        type: 'structure',
        priority: 'medium',
        message: 'Add OpenGraph images',
        suggestion: 'Add OpenGraph images for better social media sharing',
        impact: 15
      });
    }

    return recommendations;
  }

  /**
   * Get fix suggestion for error codes
   */
  private getFixSuggestion(errorCode: string): string {
    const fixes: Record<string, string> = {
      'TITLE_REQUIRED': 'Add a title to your SEO configuration',
      'DESCRIPTION_REQUIRED': 'Add a meta description to your SEO configuration',
      'INVALID_CANONICAL_URL': 'Ensure the canonical URL is a valid, absolute URL',
      'INVALID_OG_URL': 'Ensure OpenGraph URLs are valid and absolute',
      'INVALID_TWITTER_CARD': 'Use a valid Twitter card type (summary, summary_large_image, etc.)',
      'MISSING_STRUCTURED_DATA_CONTEXT': 'Add @context property to structured data',
      'MISSING_STRUCTURED_DATA_TYPE': 'Add @type property to structured data'
    };

    return fixes[errorCode] || 'Review and fix the identified issue';
  }

  /**
   * Generate empty health score for pages without SEO data
   */
  private generateEmptyHealthScore(): SEOHealthScore {
    return {
      overall: 0,
      categories: {
        technical: 0,
        content: 0,
        performance: 0,
        accessibility: 0
      },
      issues: [{
        type: 'error',
        code: 'NO_SEO_DATA',
        message: 'No SEO data found for this page',
        fix: 'Create SEO configuration for this page'
      }],
      recommendations: [{
        type: 'structure',
        priority: 'high',
        message: 'Set up SEO for this page',
        suggestion: 'Create comprehensive SEO configuration including title, description, and structured data',
        impact: 100
      }]
    };
  }
}