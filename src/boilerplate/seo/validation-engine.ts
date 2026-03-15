/**
 * SEO Validation Engine
 * Validates SEO data against best practices and requirements
 */

import { SeoRecord } from '@/types/seo';
import { ValidationResult, ValidationError, ValidationWarning } from './interfaces';

export class ValidationEngine {
  private readonly TITLE_MIN_LENGTH = 30;
  private readonly TITLE_MAX_LENGTH = 60;
  private readonly DESCRIPTION_MIN_LENGTH = 120;
  private readonly DESCRIPTION_MAX_LENGTH = 160;

  /**
   * Validate SEO record against best practices
   */
  async validate(seoData: SeoRecord): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate title
    this.validateTitle(seoData.title, errors, warnings);

    // Validate description
    this.validateDescription(seoData.description, errors, warnings);

    // Validate canonical URL
    this.validateCanonical(seoData.canonical, errors, warnings);

    // Validate robots directive
    this.validateRobots(seoData.robots, errors, warnings);

    // Validate OpenGraph data
    this.validateOpenGraph(seoData.openGraph, errors, warnings);

    // Validate Twitter data
    this.validateTwitter(seoData.twitter, errors, warnings);

    // Validate structured data
    this.validateStructuredData(seoData.structuredData, errors, warnings);

    // Calculate score based on validation results
    const score = this.calculateValidationScore(errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score
    };
  }

  /**
   * Validate title field
   */
  private validateTitle(title: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!title || title.trim().length === 0) {
      errors.push({
        field: 'title',
        message: 'Title is required',
        code: 'TITLE_REQUIRED'
      });
      return;
    }

    const titleLength = title.length;

    if (titleLength < this.TITLE_MIN_LENGTH) {
      warnings.push({
        field: 'title',
        message: `Title is too short (${titleLength} characters)`,
        suggestion: `Consider expanding to ${this.TITLE_MIN_LENGTH}-${this.TITLE_MAX_LENGTH} characters`
      });
    }

    if (titleLength > this.TITLE_MAX_LENGTH) {
      warnings.push({
        field: 'title',
        message: `Title is too long (${titleLength} characters)`,
        suggestion: `Consider shortening to ${this.TITLE_MIN_LENGTH}-${this.TITLE_MAX_LENGTH} characters`
      });
    }

    // Check for duplicate words
    const words = title.toLowerCase().split(/\s+/);
    const duplicates = words.filter((word, index) => words.indexOf(word) !== index);
    if (duplicates.length > 0) {
      warnings.push({
        field: 'title',
        message: 'Title contains duplicate words',
        suggestion: 'Remove duplicate words to improve clarity'
      });
    }
  }

  /**
   * Validate description field
   */
  private validateDescription(description: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!description || description.trim().length === 0) {
      errors.push({
        field: 'description',
        message: 'Description is required',
        code: 'DESCRIPTION_REQUIRED'
      });
      return;
    }

    const descLength = description.length;

    if (descLength < this.DESCRIPTION_MIN_LENGTH) {
      warnings.push({
        field: 'description',
        message: `Description is too short (${descLength} characters)`,
        suggestion: `Consider expanding to ${this.DESCRIPTION_MIN_LENGTH}-${this.DESCRIPTION_MAX_LENGTH} characters`
      });
    }

    if (descLength > this.DESCRIPTION_MAX_LENGTH) {
      warnings.push({
        field: 'description',
        message: `Description is too long (${descLength} characters)`,
        suggestion: `Consider shortening to ${this.DESCRIPTION_MIN_LENGTH}-${this.DESCRIPTION_MAX_LENGTH} characters`
      });
    }
  } 
 /**
   * Validate canonical URL
   */
  private validateCanonical(canonical: string | undefined, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (canonical) {
      try {
        new URL(canonical);
      } catch {
        errors.push({
          field: 'canonical',
          message: 'Canonical URL is not valid',
          code: 'INVALID_CANONICAL_URL'
        });
      }
    }
  }

  /**
   * Validate robots directive
   */
  private validateRobots(robots: string | undefined, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (robots) {
      const validDirectives = [
        'index', 'noindex', 'follow', 'nofollow', 'noarchive', 
        'nosnippet', 'noimageindex', 'nocache', 'notranslate'
      ];
      
      const directives = robots.toLowerCase().split(',').map(d => d.trim());
      const invalidDirectives = directives.filter(directive => {
        // Check for basic directives
        if (validDirectives.includes(directive)) return false;
        
        // Check for max-snippet, max-image-preview, max-video-preview
        if (directive.startsWith('max-snippet:') || 
            directive.startsWith('max-image-preview:') || 
            directive.startsWith('max-video-preview:')) {
          return false;
        }
        
        return true;
      });

      if (invalidDirectives.length > 0) {
        warnings.push({
          field: 'robots',
          message: `Invalid robots directives: ${invalidDirectives.join(', ')}`,
          suggestion: 'Use valid robots directives'
        });
      }
    }
  }

  /**
   * Validate OpenGraph data
   */
  private validateOpenGraph(openGraph: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (openGraph) {
      if (openGraph.url) {
        try {
          new URL(openGraph.url);
        } catch {
          errors.push({
            field: 'openGraph.url',
            message: 'OpenGraph URL is not valid',
            code: 'INVALID_OG_URL'
          });
        }
      }

      if (openGraph.images && Array.isArray(openGraph.images)) {
        openGraph.images.forEach((image: any, index: number) => {
          if (image.url) {
            try {
              new URL(image.url);
            } catch {
              errors.push({
                field: `openGraph.images[${index}].url`,
                message: 'OpenGraph image URL is not valid',
                code: 'INVALID_OG_IMAGE_URL'
              });
            }
          }
        });
      }
    }
  }

  /**
   * Validate Twitter data
   */
  private validateTwitter(twitter: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (twitter) {
      const validCards = ['summary', 'summary_large_image', 'app', 'player'];
      
      if (twitter.card && !validCards.includes(twitter.card)) {
        errors.push({
          field: 'twitter.card',
          message: `Invalid Twitter card type: ${twitter.card}`,
          code: 'INVALID_TWITTER_CARD'
        });
      }

      if (twitter.image) {
        try {
          new URL(twitter.image);
        } catch {
          errors.push({
            field: 'twitter.image',
            message: 'Twitter image URL is not valid',
            code: 'INVALID_TWITTER_IMAGE_URL'
          });
        }
      }
    }
  }

  /**
   * Validate structured data
   */
  private validateStructuredData(structuredData: any[], errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (structuredData && Array.isArray(structuredData)) {
      structuredData.forEach((data, index) => {
        if (typeof data !== 'object' || data === null) {
          errors.push({
            field: `structuredData[${index}]`,
            message: 'Structured data must be an object',
            code: 'INVALID_STRUCTURED_DATA_TYPE'
          });
          return;
        }

        // Check for required @context and @type
        if (!data['@context']) {
          errors.push({
            field: `structuredData[${index}].@context`,
            message: 'Structured data missing @context',
            code: 'MISSING_STRUCTURED_DATA_CONTEXT'
          });
        }

        if (!data['@type']) {
          errors.push({
            field: `structuredData[${index}].@type`,
            message: 'Structured data missing @type',
            code: 'MISSING_STRUCTURED_DATA_TYPE'
          });
        }

        // Validate common structured data types
        this.validateSpecificStructuredDataType(data, index, errors, warnings);
      });
    }
  }

  /**
   * Validate specific structured data types
   */
  private validateSpecificStructuredDataType(
    data: any, 
    index: number, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    const type = data['@type'];

    switch (type) {
      case 'WebSite':
        if (!data.name) {
          errors.push({
            field: `structuredData[${index}].name`,
            message: 'WebSite structured data missing name',
            code: 'MISSING_WEBSITE_NAME'
          });
        }
        if (!data.url) {
          errors.push({
            field: `structuredData[${index}].url`,
            message: 'WebSite structured data missing url',
            code: 'MISSING_WEBSITE_URL'
          });
        }
        break;

      case 'Article':
        if (!data.headline) {
          errors.push({
            field: `structuredData[${index}].headline`,
            message: 'Article structured data missing headline',
            code: 'MISSING_ARTICLE_HEADLINE'
          });
        }
        break;

      case 'Product':
        if (!data.name) {
          errors.push({
            field: `structuredData[${index}].name`,
            message: 'Product structured data missing name',
            code: 'MISSING_PRODUCT_NAME'
          });
        }
        break;

      case 'Organization':
        if (!data.name) {
          errors.push({
            field: `structuredData[${index}].name`,
            message: 'Organization structured data missing name',
            code: 'MISSING_ORGANIZATION_NAME'
          });
        }
        break;
    }
  }

  /**
   * Calculate validation score
   */
  private calculateValidationScore(errors: ValidationError[], warnings: ValidationWarning[]): number {
    let score = 100;

    // Deduct points for errors (more severe)
    score -= errors.length * 15;

    // Deduct points for warnings (less severe)
    score -= warnings.length * 5;

    return Math.max(0, Math.min(100, score));
  }
}