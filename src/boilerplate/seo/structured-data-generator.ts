/**
 * Enhanced Structured Data Generator
 * Extends existing structured data functionality with automatic generation from page content
 */

import { PageV2, ComponentInstance } from '@/types/composer';
import { StructuredDataResult } from './interfaces';
import { generateStructuredData } from '@/lib/seo/structured-data';

export class StructuredDataGenerator {
  /**
   * Generate structured data from page content
   */
  async generateFromPage(pageData: PageV2): Promise<StructuredDataResult[]> {
    const results: StructuredDataResult[] = [];

    // Generate WebSite structured data
    const websiteData = this.generateWebsiteData(pageData);
    if (websiteData) {
      results.push(websiteData);
    }

    // Generate BreadcrumbList from page structure
    const breadcrumbData = this.generateBreadcrumbData(pageData);
    if (breadcrumbData) {
      results.push(breadcrumbData);
    }

    // Generate Article data if page contains article content
    const articleData = this.generateArticleData(pageData);
    if (articleData) {
      results.push(articleData);
    }

    // Generate Product data if page contains product information
    const productData = this.generateProductData(pageData);
    if (productData) {
      results.push(productData);
    }

    // Generate Organization data if page contains company information
    const organizationData = this.generateOrganizationData(pageData);
    if (organizationData) {
      results.push(organizationData);
    }

    return results;
  }

  /**
   * Generate WebSite structured data
   */
  private generateWebsiteData(pageData: PageV2): StructuredDataResult | null {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    
    if (!siteUrl) return null;

    const data = {
      name: this.extractSiteName(pageData),
      url: siteUrl,
      description: this.extractSiteDescription(pageData)
    };

    try {
      const jsonLd = generateStructuredData('website', data);
      return {
        type: 'WebSite',
        data,
        jsonLd,
        isValid: true
      };
    } catch (error) {
      return {
        type: 'WebSite',
        data,
        jsonLd: '',
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Generate BreadcrumbList structured data
   */
  private generateBreadcrumbData(pageData: PageV2): StructuredDataResult | null {
    const breadcrumbs = this.extractBreadcrumbs(pageData);
    
    if (!breadcrumbs || breadcrumbs.length === 0) return null;

    const data = { items: breadcrumbs };

    try {
      const jsonLd = generateStructuredData('breadcrumb', data);
      return {
        type: 'BreadcrumbList',
        data,
        jsonLd,
        isValid: true
      };
    } catch (error) {
      return {
        type: 'BreadcrumbList',
        data,
        jsonLd: '',
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Generate Article structured data
   */
  private generateArticleData(pageData: PageV2): StructuredDataResult | null {
    const articleInfo = this.extractArticleInfo(pageData);
    
    if (!articleInfo) return null;

    try {
      const jsonLd = generateStructuredData('article', articleInfo);
      return {
        type: 'Article',
        data: articleInfo,
        jsonLd,
        isValid: true
      };
    } catch (error) {
      return {
        type: 'Article',
        data: articleInfo,
        jsonLd: '',
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Generate Product structured data
   */
  private generateProductData(pageData: PageV2): StructuredDataResult | null {
    const productInfo = this.extractProductInfo(pageData);
    
    if (!productInfo) return null;

    try {
      const jsonLd = generateStructuredData('product', productInfo);
      return {
        type: 'Product',
        data: productInfo,
        jsonLd,
        isValid: true
      };
    } catch (error) {
      return {
        type: 'Product',
        data: productInfo,
        jsonLd: '',
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Generate Organization structured data
   */
  private generateOrganizationData(pageData: PageV2): StructuredDataResult | null {
    const orgInfo = this.extractOrganizationInfo(pageData);
    
    if (!orgInfo) return null;

    try {
      const jsonLd = generateStructuredData('organization', orgInfo);
      return {
        type: 'Organization',
        data: orgInfo,
        jsonLd,
        isValid: true
      };
    } catch (error) {
      return {
        type: 'Organization',
        data: orgInfo,
        jsonLd: '',
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Extract site name from page components
   */
  private extractSiteName(pageData: PageV2): string {
    const headerComponent = this.findComponentByType(pageData, ['header', 'navbar', 'hero']);
    return headerComponent?.props?.siteName || 
           headerComponent?.props?.brandName || 
           'Website';
  }

  /**
   * Extract site description from page components
   */
  private extractSiteDescription(pageData: PageV2): string {
    const heroComponent = this.findComponentByType(pageData, ['hero', 'banner']);
    return heroComponent?.props?.description || 
           heroComponent?.props?.subtitle || 
           'Website description';
  }

  /**
   * Extract breadcrumbs from page structure
   */
  private extractBreadcrumbs(pageData: PageV2): Array<{name: string, url: string}> | null {
    const breadcrumbComponent = this.findComponentByType(pageData, ['breadcrumb', 'breadcrumbs']);
    
    if (breadcrumbComponent?.props?.items) {
      return breadcrumbComponent.props.items;
    }

    // Generate breadcrumbs from slug
    if (pageData.slug && pageData.slug !== 'home') {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const parts = pageData.slug.split('/').filter(Boolean);
      const breadcrumbs = [{ name: 'Home', url: baseUrl }];
      
      let currentPath = '';
      parts.forEach(part => {
        currentPath += `/${part}`;
        breadcrumbs.push({
          name: part.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          url: `${baseUrl}${currentPath}`
        });
      });
      
      return breadcrumbs;
    }

    return null;
  }

  /**
   * Extract article information from page components
   */
  private extractArticleInfo(pageData: PageV2): any | null {
    const articleComponent = this.findComponentByType(pageData, ['article', 'blog-post', 'content']);
    
    if (!articleComponent) return null;

    return {
      title: articleComponent.props?.title || this.extractSiteName(pageData),
      description: articleComponent.props?.description || articleComponent.props?.excerpt,
      author: articleComponent.props?.author,
      datePublished: articleComponent.props?.publishedDate || articleComponent.props?.createdAt,
      dateModified: articleComponent.props?.updatedDate || articleComponent.props?.updatedAt,
      image: articleComponent.props?.featuredImage || articleComponent.props?.image
    };
  }

  /**
   * Extract product information from page components
   */
  private extractProductInfo(pageData: PageV2): any | null {
    const productComponent = this.findComponentByType(pageData, ['product', 'product-detail', 'product-info']);
    
    if (!productComponent) return null;

    return {
      name: productComponent.props?.name || productComponent.props?.title,
      description: productComponent.props?.description,
      brand: productComponent.props?.brand,
      price: productComponent.props?.price,
      currency: productComponent.props?.currency || 'USD',
      availability: productComponent.props?.availability || 'InStock',
      image: productComponent.props?.image || productComponent.props?.featuredImage
    };
  }

  /**
   * Extract organization information from page components
   */
  private extractOrganizationInfo(pageData: PageV2): any | null {
    const aboutComponent = this.findComponentByType(pageData, ['about', 'company-info', 'organization']);
    
    if (!aboutComponent) return null;

    return {
      name: aboutComponent.props?.companyName || aboutComponent.props?.name,
      url: process.env.NEXT_PUBLIC_SITE_URL || '',
      logo: aboutComponent.props?.logo,
      socialLinks: aboutComponent.props?.socialLinks || aboutComponent.props?.socialMedia
    };
  }

  /**
   * Find component by type in page data
   */
  private findComponentByType(pageData: PageV2, types: string[]): ComponentInstance | null {
    if (!pageData.components) return null;

    return pageData.components.find(component => 
      types.some(type => 
        component.componentType.toLowerCase().includes(type.toLowerCase())
      )
    ) || null;
  }
}