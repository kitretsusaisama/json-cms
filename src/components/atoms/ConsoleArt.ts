/**
 * Professional Console Art Utility for Next.js Applications
 * Server-safe implementation with TypeScript support
 * 
 * @author Your Development Team
 * @version 1.0.0
 * @license MIT
 */

interface ConsoleArtConfig {
  companyName?: string;
  website?: string;
  enableInDevelopment?: boolean;
  enableInProduction?: boolean;
  customMessage?: string;
}

interface BrowserInfo {
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
}

/**
 * Professional Console Art Class for Enterprise Applications
 * Displays branded ASCII art in browser console with cross-browser optimization
 */
class ConsoleArtManager {
  private config: Required<ConsoleArtConfig>;
  private isInitialized: boolean = false;

  constructor(config: ConsoleArtConfig = {}) {
    this.config = {
      companyName: config.companyName || 'Your Company',
      website: config.website || 'https://yourcompany.com',
      enableInDevelopment: config.enableInDevelopment ?? false,
      enableInProduction: config.enableInProduction ?? true,
      customMessage: config.customMessage || ''
    };
  }

  private getBrowserInfo(): BrowserInfo {
    if (typeof window === 'undefined') {
      return { isSafari: false, isChrome: false, isFirefox: false };
    }

    const userAgent = navigator.userAgent.toLowerCase();
    return {
      isSafari: /safari/.test(userAgent) && !/chrome/.test(userAgent),
      isChrome: /chrome/.test(userAgent) && !/edg/.test(userAgent),
      isFirefox: /firefox/.test(userAgent)
    };
  }

  private expandCompressedArt(compressed: string): string {
    return compressed.replace(/(\d+)(\D)/g, (match, count, character) => {
      const repeatCount = parseInt(count, 10);
      return character.repeat(repeatCount);
    });
  }

  private getOptimizedStyles(browserInfo: BrowserInfo): string {
    const baseStyles = [
      'font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
      'display: inline-block',
      'background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      'color: #00ff88',
      'text-shadow: 0 0 10px #00ff88aa',
      'line-height: 1.2',
      'white-space: pre'
    ];

    if (browserInfo.isSafari) {
      baseStyles.push('font-size: 6px', 'padding: 15px', 'border-radius: 8px');
    } else if (browserInfo.isFirefox) {
      baseStyles.push('font-size: 4px', 'padding: 18px', 'border-radius: 12px', 'margin: 8px');
    } else {
      baseStyles.push('font-size: 3px', 'padding: 20px', 'border-radius: 15px', 'margin: 10px');
    }

    return baseStyles.join(';');
  }

  private displayProfessionalBanner(): void {
    const bannerStyles = [
      'background: linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
      'color: white',
      'padding: 12px 24px',
      'border-radius: 8px',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'font-weight: 600',
      'font-size: 14px',
      'margin: 8px 0',
      'text-align: center'
    ].join(';');

    const message = this.config.customMessage || 
      `🚀 Built with precision by ${this.config.companyName} | ${this.config.website}`;
    
    console.info(`%c${message}`, bannerStyles);
    
    // Additional developer message
    const devStyles = [
      'color: #888',
      'font-family: monospace',
      'font-size: 12px',
      'font-style: italic'
    ].join(';');
    
    console.info(
      '%c💡 Interested in our work? We\'re always looking for talented developers!',
      devStyles
    );
  }

  private displayBuildInfo(): void {
    const buildInfo = [
      'color: #666',
      'font-family: monospace',
      'font-size: 11px'
    ].join(';');
    
    const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
    const buildMode = isDevelopment ? 'Development' : 'Production';
    const version = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_VERSION || 'Latest' : 'Latest';
    
    console.info(
      `%c📊 Build: ${buildMode} | Next.js ${version} | ${new Date().toISOString()}`,
      buildInfo
    );
  }

  public display(): void {
    // Server-side safety check
    if (typeof window === 'undefined') {
      return;
    }

    // Prevent multiple initializations
    if (this.isInitialized) {
      return;
    }

    try {
      const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
      const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

      // Environment check
      if (isDevelopment && !this.config.enableInDevelopment) return;
      if (isProduction && !this.config.enableInProduction) return;

      const browserInfo = this.getBrowserInfo();
      
      // Professional ASCII art (compressed format)
      const compressedArt = "▄4█20▄4 4█22 65█4▀93█▄549 4█24 67█4▀95█549 4█9 ▄3█▌12 12█13 █13 ▌12 5█10 5█13 █9 3█8 52█549 4█7 6█▌12 12█7 3#7 ▐4 7▀▌4 6▀█4 6▄4 █7 3#7 ▐7 █6 52█549 4█5 8█▌12 12█13 █13 ▌12 ▌4 6█4 █13 █16 52█549 4█4 ▐8█▌12 12█7 6█7 ╙█4 7▀▌4 8█12 4█7 6█7 ╟█7 ▐▄6 ▄▌7 52█549 4█4 9█▌12 12█7▄7█7▄█13▄▌4▄10█5▄6 5▄6█7▄7█7▄█4▄4█4▄4█4▄52█549 4█4 9█▌12 164█549 4█5 8█▌12 15█4▀5 4▀4█4▀5 4▀6█4 6█4 6█13 5█4▀5 4▀5█▌13 ▌7 █7 4█▀6 ║▌12 6█549 4█6 7█▌12 12█▌12 ╙4█13 4█4 6█4 6█4 7▄█13 ╟▌13 ▌7 █▌7 6█▀7 █▌7 7▄6█549 4█7 ▀5█▌12 12█4 7█7▄╫4 7█4 █4 6█4 6█12 ▐▌4 7█7▄7█4 7█▌7 4█▌7 4█▀7 4█▌12 6█549 4█6 ▀6█▌12 12█4 7▀7 █4 7▀7 4█11 █11 ▐4 7▀▌4 7▀7 7█4 7█▌7 5█▌7 ▀7 5█▌7 7▀6█549 4█26 13█▄10 ▄6█▄9 ▄5█11 █11 ▐13 4█▄10 ▄4█4 7█▌7 6█▌7 6█▌12 6█549 ▀194█▀";
      
      const expandedArt = this.expandCompressedArt(compressedArt);
      const styles = this.getOptimizedStyles(browserInfo);
      
      // Clear console in development for better visibility
      if (isDevelopment) {
        console.clear();
      }
      
      // Display main ASCII art
      console.info(`%c${expandedArt}`, styles);
      
      // Display professional banner
      this.displayProfessionalBanner();
      
      // Performance and build info
      this.displayBuildInfo();

      this.isInitialized = true;

    } catch (error) {
      // Graceful error handling - don't break the application
      console.warn('Console art display failed:', error);
    }
  }

  public updateConfig(newConfig: Partial<ConsoleArtConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.isInitialized = false; // Allow re-initialization with new config
  }
}

/**
 * Utility function to initialize console art
 * Server-safe and can be called from anywhere
 */
export const initializeConsoleArt = (config?: ConsoleArtConfig): void => {
  // Server-side safety check
  if (typeof window === 'undefined') {
    return;
  }

  // Create manager and display
  const manager = new ConsoleArtManager(config);
  
  // Delay execution to ensure proper console initialization
  setTimeout(() => {
    manager.display();
  }, 100);
};

/**
 * Client-side script for manual initialization
 * Use this in _document.tsx or inject via script tag
 */
export const getConsoleArtScript = (config?: ConsoleArtConfig): string => {
  return `
    (function() {
      if (typeof window === 'undefined') return;
      
      const config = ${JSON.stringify(config || {})};
      const manager = new (${ConsoleArtManager.toString()})(config);
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          setTimeout(function() { manager.display(); }, 100);
        });
      } else {
        setTimeout(function() { manager.display(); }, 100);
      }
    })();
  `;
};

// Default export
export default ConsoleArtManager;

// Named exports for convenience
export { ConsoleArtManager };
export type { ConsoleArtConfig, BrowserInfo };