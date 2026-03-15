/**
 * SEO Optimization Engine
 * Provides scoring, suggestions, and optimization recommendations
 */

import { 
  SEOOptimization, 
  SEOSuggestion, 
  SEOIssue, 
  SEOImprovement,
  ContentAnalysis,
  HeadingAnalysis,
  ImageAnalysis
} from './interfaces';

export class OptimizationEngine {
  private readonly TITLE_MIN_LENGTH = 30;
  private readonly TITLE_MAX_LENGTH = 60;
  private readonly DESCRIPTION_MIN_LENGTH = 120;
  private readonly DESCRIPTION_MAX_LENGTH = 160;
  private readonly KEYWORD_DENSITY_MAX = 0.03; // 3%

  /**
   * Analyze page content and provide SEO optimization recommendations
   */
  async analyzePage(pageId: string, content: string): Promise<SEOOptimization> {
    const contentAnalysis = this.analyzeContent(content);
    const technicalIssues = this.analyzeTechnicalSEO(content);
    const structureIssues = this.analyzeContentStructure(contentAnalysis);
    
    const allIssues = [...technicalIssues, ...structureIssues];
    const suggestions = this.generateSuggestions(contentAnalysis, allIssues);
    const improvements = this.generateImprovements(contentAnalysis);
    
    const score = this.calculateSEOScore(contentAnalysis, allIssues);

    return {
      score,
      suggestions,
      issues: allIssues,
      improvements
    };
  }

  /**
   * Analyze content for SEO metrics
   */
  private analyzeContent(content: string): ContentAnalysis {
    const wordCount = this.countWords(content);
    const readabilityScore = this.calculateReadabilityScore(content);
    const keywordDensity = this.analyzeKeywordDensity(content);
    const headingStructure = this.analyzeHeadings(content);
    const imageAnalysis = this.analyzeImages(content);

    return {
      wordCount,
      readabilityScore,
      keywordDensity,
      headingStructure,
      imageAnalysis
    };
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Calculate readability score (simplified Flesch Reading Ease)
   */
  private calculateReadabilityScore(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Simplified Flesch Reading Ease formula
    return Math.max(0, Math.min(100, 
      206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
    ));
  }

  /**
   * Count syllables in a word (simplified)
   */
  private countSyllables(word: string): number {
    const vowels = word.toLowerCase().match(/[aeiouy]+/g);
    return vowels ? vowels.length : 1;
  }

  /**
   * Analyze keyword density
   */
  private analyzeKeywordDensity(content: string): Record<string, number> {
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordCount = words.length;
    const frequency: Record<string, number> = {};

    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    const density: Record<string, number> = {};
    Object.entries(frequency).forEach(([word, count]) => {
      density[word] = count / wordCount;
    });

    return density;
  }

  /**
   * Analyze heading structure
   */
  private analyzeHeadings(content: string): HeadingAnalysis[] {
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    const headings: HeadingAnalysis[] = [];
    let match;
    let position = 0;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = parseInt(match[1]);
      const text = match[2].replace(/<[^>]*>/g, '').trim();
      
      headings.push({
        level,
        text,
        hasKeywords: this.containsKeywords(text),
        position: position++
      });
    }

    return headings;
  }

  /**
   * Analyze images for SEO
   */
  private analyzeImages(content: string): ImageAnalysis[] {
    const imageRegex = /<img[^>]*src="([^"]*)"[^>]*(?:alt="([^"]*)")?[^>]*>/gi;
    const images: ImageAnalysis[] = [];
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
      const src = match[1];
      const alt = match[2];
      
      images.push({
        src,
        alt,
        hasAlt: !!alt && alt.trim().length > 0,
        isOptimized: this.isImageOptimized(src),
        size: undefined // Would need actual image analysis
      });
    }

    return images;
  }

  /**
   * Check if text contains important keywords
   */
  private containsKeywords(text: string): boolean {
    const keywords = ['seo', 'optimization', 'content', 'page', 'web'];
    return keywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if image is optimized
   */
  private isImageOptimized(src: string): boolean {
    const optimizedFormats = ['.webp', '.avif'];
    const hasOptimizedFormat = optimizedFormats.some(format => 
      src.toLowerCase().includes(format)
    );
    
    return hasOptimizedFormat || src.includes('/_next/image');
  } 
 /**
   * Analyze technical SEO issues
   */
  private analyzeTechnicalSEO(content: string): SEOIssue[] {
    const issues: SEOIssue[] = [];

    // Check for title tag
    if (!content.includes('<title>')) {
      issues.push({
        type: 'error',
        code: 'MISSING_TITLE',
        message: 'Page is missing a title tag',
        fix: 'Add a <title> tag to the page head'
      });
    }

    // Check for meta description
    if (!content.includes('name="description"')) {
      issues.push({
        type: 'warning',
        code: 'MISSING_META_DESCRIPTION',
        message: 'Page is missing a meta description',
        fix: 'Add a meta description tag'
      });
    }

    // Check for h1 tag
    if (!content.includes('<h1>')) {
      issues.push({
        type: 'warning',
        code: 'MISSING_H1',
        message: 'Page is missing an H1 tag',
        fix: 'Add an H1 tag to the page content'
      });
    }

    return issues;
  }

  /**
   * Analyze content structure issues
   */
  private analyzeContentStructure(analysis: ContentAnalysis): SEOIssue[] {
    const issues: SEOIssue[] = [];

    // Check word count
    if (analysis.wordCount < 300) {
      issues.push({
        type: 'warning',
        code: 'LOW_WORD_COUNT',
        message: `Content is too short (${analysis.wordCount} words)`,
        fix: 'Add more content to reach at least 300 words'
      });
    }

    // Check readability
    if (analysis.readabilityScore < 60) {
      issues.push({
        type: 'info',
        code: 'LOW_READABILITY',
        message: `Content readability score is low (${analysis.readabilityScore.toFixed(1)})`,
        fix: 'Use shorter sentences and simpler words'
      });
    }

    // Check heading structure
    const h1Count = analysis.headingStructure.filter(h => h.level === 1).length;
    if (h1Count === 0) {
      issues.push({
        type: 'error',
        code: 'NO_H1',
        message: 'No H1 heading found in content',
        fix: 'Add an H1 heading to the content'
      });
    } else if (h1Count > 1) {
      issues.push({
        type: 'warning',
        code: 'MULTIPLE_H1',
        message: `Multiple H1 headings found (${h1Count})`,
        fix: 'Use only one H1 heading per page'
      });
    }

    // Check images without alt text
    const imagesWithoutAlt = analysis.imageAnalysis.filter(img => !img.hasAlt);
    if (imagesWithoutAlt.length > 0) {
      issues.push({
        type: 'warning',
        code: 'MISSING_ALT_TEXT',
        message: `${imagesWithoutAlt.length} images missing alt text`,
        fix: 'Add descriptive alt text to all images'
      });
    }

    return issues;
  }

  /**
   * Generate SEO suggestions
   */
  private generateSuggestions(analysis: ContentAnalysis, issues: SEOIssue[]): SEOSuggestion[] {
    const suggestions: SEOSuggestion[] = [];

    // Content length suggestions
    if (analysis.wordCount < 500) {
      suggestions.push({
        type: 'content',
        priority: 'medium',
        message: 'Content could be more comprehensive',
        suggestion: 'Consider expanding content to 500+ words for better SEO',
        impact: 15
      });
    }

    // Readability suggestions
    if (analysis.readabilityScore < 70) {
      suggestions.push({
        type: 'structure',
        priority: 'medium',
        message: 'Content readability could be improved',
        suggestion: 'Use shorter sentences and paragraphs for better readability',
        impact: 10
      });
    }

    // Heading structure suggestions
    const hasH2 = analysis.headingStructure.some(h => h.level === 2);
    if (!hasH2) {
      suggestions.push({
        type: 'structure',
        priority: 'high',
        message: 'Missing H2 headings',
        suggestion: 'Add H2 headings to structure your content better',
        impact: 20
      });
    }

    // Image optimization suggestions
    const unoptimizedImages = analysis.imageAnalysis.filter(img => !img.isOptimized);
    if (unoptimizedImages.length > 0) {
      suggestions.push({
        type: 'performance',
        priority: 'high',
        message: 'Images could be optimized',
        suggestion: 'Use WebP or AVIF format and Next.js Image component',
        impact: 25
      });
    }

    return suggestions;
  }

  /**
   * Generate improvement recommendations
   */
  private generateImprovements(analysis: ContentAnalysis): SEOImprovement[] {
    const improvements: SEOImprovement[] = [];

    improvements.push({
      category: 'Content Quality',
      description: 'Enhance content depth and value',
      implementation: 'Add more detailed explanations, examples, and actionable insights',
      expectedImpact: 30
    });

    improvements.push({
      category: 'Technical SEO',
      description: 'Optimize technical elements',
      implementation: 'Implement structured data, optimize meta tags, and improve page speed',
      expectedImpact: 25
    });

    improvements.push({
      category: 'User Experience',
      description: 'Improve content readability and structure',
      implementation: 'Use clear headings, bullet points, and shorter paragraphs',
      expectedImpact: 20
    });

    return improvements;
  }

  /**
   * Calculate overall SEO score
   */
  private calculateSEOScore(analysis: ContentAnalysis, issues: SEOIssue[]): number {
    let score = 100;

    // Deduct points for issues
    issues.forEach(issue => {
      switch (issue.type) {
        case 'error':
          score -= 15;
          break;
        case 'warning':
          score -= 10;
          break;
        case 'info':
          score -= 5;
          break;
      }
    });

    // Adjust for content quality
    if (analysis.wordCount < 300) score -= 10;
    if (analysis.readabilityScore < 60) score -= 10;
    if (analysis.headingStructure.length < 2) score -= 5;

    return Math.max(0, Math.min(100, score));
  }
}