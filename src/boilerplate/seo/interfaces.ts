/**
 * SEO Management System Interfaces
 */

import { SeoRecord, SeoType } from '@/types/seo';
import { PageV2 } from '@/types/composer';

export interface SEOManager {
  generateMetadata(pageData: PageV2, context: RequestContext): Promise<SEOMetadata>;
  optimizePage(pageId: string, content: string): Promise<SEOOptimization>;
  validateSEO(seoData: SeoRecord): Promise<ValidationResult>;
  generateStructuredData(pageData: PageV2): Promise<StructuredDataResult[]>;
  getHealthScore(pageId: string): Promise<SEOHealthScore>;
}

export interface RequestContext {
  tenantId?: string;
  userId?: string;
  locale?: string;
  domain?: string;
}

export interface SEOMetadata {
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  meta: MetaTag[];
  openGraph?: OpenGraphData;
  twitter?: TwitterData;
  structuredData: StructuredDataResult[];
}

export interface SEOOptimization {
  score: number;
  suggestions: SEOSuggestion[];
  issues: SEOIssue[];
  improvements: SEOImprovement[];
}

export interface SEOSuggestion {
  type: 'title' | 'description' | 'keywords' | 'structure' | 'performance';
  priority: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  impact: number;
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  element?: string;
  fix?: string;
}

export interface SEOImprovement {
  category: string;
  description: string;
  implementation: string;
  expectedImpact: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

export interface StructuredDataResult {
  type: string;
  data: Record<string, unknown>;
  jsonLd: string;
  isValid: boolean;
  errors?: string[];
}

export interface SEOHealthScore {
  overall: number;
  categories: {
    technical: number;
    content: number;
    performance: number;
    accessibility: number;
  };
  issues: SEOIssue[];
  recommendations: SEOSuggestion[];
}

export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface OpenGraphData {
  type: string;
  title?: string;
  description?: string;
  url?: string;
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  }>;
}

export interface TwitterData {
  card?: string;
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
}

export interface SEOAnalysisOptions {
  includePerformance?: boolean;
  includeAccessibility?: boolean;
  includeStructuredData?: boolean;
  locale?: string;
}

export interface ContentAnalysis {
  wordCount: number;
  readabilityScore: number;
  keywordDensity: Record<string, number>;
  headingStructure: HeadingAnalysis[];
  imageAnalysis: ImageAnalysis[];
}

export interface HeadingAnalysis {
  level: number;
  text: string;
  hasKeywords: boolean;
  position: number;
}

export interface ImageAnalysis {
  src: string;
  alt?: string;
  hasAlt: boolean;
  isOptimized: boolean;
  size?: number;
}