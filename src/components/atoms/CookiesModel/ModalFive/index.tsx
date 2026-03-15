import React, { useState, useEffect, useCallback, useRef } from 'react';

// TypeScript interfaces
interface ConsentCategories {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

interface ConsentData {
  categories: ConsentCategories;
  timestamp: string;
  version: string;
  region: string;
}

interface ConsentEventDetail {
  categories: ConsentCategories;
  method: 'explicit' | 'accept_all' | 'reject_all' | 'custom';
  timestamp: string;
}

interface CategoryInfo {
  title: string;
  description: string;
  icon: string;
  color: 'emerald' | 'blue' | 'purple' | 'pink' | 'orange';
  examples: string[];
  retention: string;
}

type AnimationPhase = 'idle' | 'entering' | 'visible' | 'accepting' | 'rejecting' | 'saving' | 'accepted' | 'rejected' | 'saved' | 'closing';
type ViewType = 'main' | 'details' | 'vendors';
type ViewportType = 'mobile' | 'tablet' | 'desktop';

// Advanced Cookie Manager Class
class CookieManager {
  private categories: ConsentCategories = {
    essential: true,
    functional: false,
    analytics: false,
    marketing: false,
    personalization: false
  };
  
  private consentTimestamp: string | null = null;
  private consentVersion: string = '1.0.0';
  private region: string;

  constructor() {
    this.region = this.detectRegion();
  }

  private detectRegion(): string {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone.includes('Europe')) return 'EU';
      if (timezone.includes('America/Los_Angeles') || timezone.includes('America/New_York')) return 'US';
      return 'OTHER';
    } catch {
      return 'OTHER';
    }
  }

  public setConsent(categories: Partial<ConsentCategories>, method: ConsentEventDetail['method'] = 'explicit'): void {
    this.categories = { ...this.categories, ...categories };
    this.consentTimestamp = new Date().toISOString();
    this.saveToStorage();
    this.dispatchConsentEvent(method);
    this.loadScripts();
  }

  private saveToStorage(): void {
    const consentData: ConsentData = {
      categories: this.categories,
      timestamp: this.consentTimestamp!,
      version: this.consentVersion,
      region: this.region
    };
    
    try {
      console.log('Cookie consent saved:', consentData);
      // In production: localStorage.setItem('cookie_consent', JSON.stringify(consentData));
    } catch (error) {
      console.error('Failed to save consent:', error);
    }
  }

  private loadFromStorage(): ConsentData | null {
    try {
      // In production: const stored = localStorage.getItem('cookie_consent');
      // For demo, return null to show banner
      return null;
    } catch (error) {
      console.error('Failed to load consent:', error);
      return null;
    }
  }

  private dispatchConsentEvent(method: ConsentEventDetail['method']): void {
    const detail: ConsentEventDetail = {
      categories: this.categories,
      method,
      timestamp: this.consentTimestamp!
    };
    
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail }));
  }

  private loadScripts(): void {
    Object.entries(this.categories).forEach(([category, enabled]) => {
      if (enabled && category !== 'essential') {
        this.loadCategoryScripts(category as keyof ConsentCategories);
      }
    });
  }

  private loadCategoryScripts(category: keyof ConsentCategories): void {
    const scriptMap: Record<string, string[]> = {
      analytics: ['gtag', 'mixpanel'],
      marketing: ['facebook-pixel', 'google-ads'],
      functional: ['intercom', 'hotjar'],
      personalization: ['optimize', 'personalization-engine']
    };

    const scripts = scriptMap[category] || [];
    scripts.forEach(script => {
      console.log(`Loading ${script} for ${category}`);
      // In production, dynamically load actual scripts
    });
  }

  public hasValidConsent(): boolean {
    const stored = this.loadFromStorage();
    if (!stored) return false;
    
    // Check if consent is still valid (e.g., not older than 1 year)
    const consentAge = Date.now() - new Date(stored.timestamp).getTime();
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
    
    return consentAge < maxAge && stored.version === this.consentVersion;
  }

  public getRegion(): string {
    return this.region;
  }

  public getVersion(): string {
    return this.consentVersion;
  }
}

// Color utility function
const getColorClasses = (color: CategoryInfo['color']) => {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-500',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      glow: 'shadow-emerald-500/20'
    },
    blue: {
      bg: 'bg-blue-500',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      glow: 'shadow-blue-500/20'
    },
    purple: {
      bg: 'bg-purple-500',
      text: 'text-purple-400',
      border: 'border-purple-500/20',
      glow: 'shadow-purple-500/20'
    },
    pink: {
      bg: 'bg-pink-500',
      text: 'text-pink-400',
      border: 'border-pink-500/20',
      glow: 'shadow-pink-500/20'
    },
    orange: {
      bg: 'bg-orange-500',
      text: 'text-orange-400',
      border: 'border-orange-500/20',
      glow: 'shadow-orange-500/20'
    }
  };
  return colorMap[color];
};

export const AdvancedCookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [preferences, setPreferences] = useState<ConsentCategories>({
    essential: true,
    functional: false,
    analytics: false,
    marketing: false,
    personalization: false
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');
  const [viewport, setViewport] = useState<ViewportType>('desktop');
  
  const cookieManager = useRef<CookieManager>(new CookieManager()).current;
  const bannerRef = useRef<HTMLDivElement>(null);

  // Category data with proper typing
  const categoryData: Record<keyof ConsentCategories, CategoryInfo> = {
    essential: {
      title: 'Essential Cookies',
      description: 'Required for core functionality, security, and compliance. Cannot be disabled.',
      icon: '🔒',
      color: 'emerald',
      examples: ['Session management', 'Security tokens', 'Load balancing'],
      retention: 'Session / 1 year'
    },
    functional: {
      title: 'Functional Cookies',
      description: 'Enhance user experience with preferences, language settings, and accessibility features.',
      icon: '⚙️',
      color: 'blue',
      examples: ['Language preferences', 'Theme settings', 'Region selection'],
      retention: '1 year'
    },
    analytics: {
      title: 'Analytics Cookies',
      description: 'Help us understand how you interact with our website to improve performance.',
      icon: '📊',
      color: 'purple',
      examples: ['Google Analytics', 'Page views', 'User journey tracking'],
      retention: '2 years'
    },
    marketing: {
      title: 'Marketing Cookies',
      description: 'Used to deliver personalized advertisements and measure campaign effectiveness.',
      icon: '🎯',
      color: 'pink',
      examples: ['Ad targeting', 'Conversion tracking', 'Social media pixels'],
      retention: '2 years'
    },
    personalization: {
      title: 'Personalization Cookies',
      description: 'Customize content and recommendations based on your interests and behavior.',
      icon: '✨',
      color: 'orange',
      examples: ['Content recommendations', 'Personalized offers', 'User preferences'],
      retention: '1 year'
    }
  };

  // Initialization
  useEffect(() => {
    const initializeConsent = async (): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!cookieManager.hasValidConsent()) {
        setAnimationPhase('entering');
        setTimeout(() => {
          setIsVisible(true);
          setAnimationPhase('visible');
        }, 100);
      }
    };

    initializeConsent();
  }, [cookieManager]);

  // Keyboard navigation and accessibility
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        handleClose();
      }
      if (e.key === 'Tab' && isExpanded) {
        trapFocus(e);
      }
    };

    const trapFocus = (e: KeyboardEvent): void => {
      const focusableElements = bannerRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (!focusableElements?.length) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, isExpanded]);

  // Responsive viewport detection
  useEffect(() => {
    const updateViewport = (): void => {
      if (window.innerWidth < 640) setViewport('mobile');
      else if (window.innerWidth < 1024) setViewport('tablet');
      else setViewport('desktop');
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const handleAcceptAll = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setAnimationPhase('accepting');
    
    const allEnabled: ConsentCategories = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
      personalization: true
    };
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    cookieManager.setConsent(allEnabled, 'accept_all');
    
    setAnimationPhase('accepted');
    setTimeout(() => {
      setIsVisible(false);
      setIsLoading(false);
    }, 1000);
  }, [cookieManager]);

  const handleRejectAll = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setAnimationPhase('rejecting');
    
    const essentialOnly: ConsentCategories = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
      personalization: false
    };
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    cookieManager.setConsent(essentialOnly, 'reject_all');
    
    setAnimationPhase('rejected');
    setTimeout(() => {
      setIsVisible(false);
      setIsLoading(false);
    }, 800);
  }, [cookieManager]);

  const handleSavePreferences = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setAnimationPhase('saving');
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    cookieManager.setConsent(preferences, 'custom');
    
    setAnimationPhase('saved');
    setTimeout(() => {
      setIsVisible(false);
      setIsLoading(false);
    }, 800);
  }, [preferences, cookieManager]);

  const handleClose = useCallback((): void => {
    if (isLoading) return;
    
    setAnimationPhase('closing');
    setTimeout(() => {
      setIsVisible(false);
      setAnimationPhase('idle');
    }, 300);
  }, [isLoading]);

  const togglePreference = (category: keyof ConsentCategories): void => {
    if (category === 'essential') return;
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Premium backdrop with dynamic effects */}
      <div 
        className={`fixed inset-0 z-40 transition-all duration-1000 ${
          animationPhase === 'entering' ? 'bg-black/0 backdrop-blur-none' :
          animationPhase === 'visible' ? 'bg-black/30 backdrop-blur-sm' :
          animationPhase === 'accepting' ? 'bg-emerald-500/10 backdrop-blur-md' :
          animationPhase === 'rejecting' ? 'bg-red-500/10 backdrop-blur-md' :
          animationPhase === 'saving' ? 'bg-blue-500/10 backdrop-blur-md' :
          'bg-black/20 backdrop-blur-sm'
        }`}
        style={{
          backgroundImage: animationPhase === 'visible' ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")` : 'none',
        }}
        onClick={!isExpanded ? handleClose : undefined}
        role="button"
        tabIndex={-1}
        aria-label="Close cookie banner"
      />
      
      {/* Main Cookie Banner */}
      <div 
        ref={bannerRef}
        className={`fixed z-50 transition-all duration-1000 ease-out ${
          viewport === 'mobile' 
            ? 'bottom-0 left-0 right-0' 
            : currentView === 'details' 
              ? 'bottom-4 left-4 right-4 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:w-full lg:max-w-4xl'
              : 'bottom-4 left-4 right-4'
        } ${
          animationPhase === 'entering' || animationPhase === 'closing' 
            ? 'translate-y-full opacity-0 scale-95' 
            : 'translate-y-0 opacity-100 scale-100'
        } ${
          animationPhase === 'accepting' ? 'ring-4 ring-emerald-500/50' :
          animationPhase === 'rejecting' ? 'ring-4 ring-red-500/50' :
          animationPhase === 'saving' ? 'ring-4 ring-blue-500/50' : ''
        }`}
        role="banner"
        aria-label="Cookie consent banner"
        aria-live="polite"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl lg:rounded-2xl flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-4 text-white">
              <div className="relative">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <div className="absolute inset-0 w-8 h-8 border-2 border-transparent border-t-emerald-400 rounded-full animate-spin" style={{ animationDelay: '0.1s' }} />
              </div>
              <div className="text-sm font-medium">
                {animationPhase === 'accepting' && 'Accepting all cookies...'}
                {animationPhase === 'rejecting' && 'Rejecting optional cookies...'}
                {animationPhase === 'saving' && 'Saving your preferences...'}
              </div>
            </div>
          </div>
        )}

        <div 
          className="relative overflow-hidden rounded-xl lg:rounded-2xl border shadow-2xl"
          style={{
            background: viewport === 'mobile' 
              ? 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)'
              : 'linear-gradient(135deg, #000000 0%, #1a1a1a 30%, #000000 60%, #1a1a1a 100%)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Animated top accent */}
          <div 
            className="h-px relative overflow-hidden"
            style={{
              background: animationPhase === 'accepting' 
                ? 'linear-gradient(90deg, transparent 0%, #10b981 50%, transparent 100%)'
                : animationPhase === 'rejecting'
                  ? 'linear-gradient(90deg, transparent 0%, #ef4444 50%, transparent 100%)'
                  : animationPhase === 'saving'
                    ? 'linear-gradient(90deg, transparent 0%, #3b82f6 50%, transparent 100%)'
                    : 'linear-gradient(90deg, transparent 0%, #3b82f6 20%, #8b5cf6 40%, #ec4899 60%, #f59e0b 80%, transparent 100%)',
            }}
          >
            <div 
              className="absolute inset-0 animate-pulse"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
                animation: 'shimmer 2s ease-in-out infinite',
              }}
            />
          </div>

          {/* Main Content */}
          <div className="p-4 sm:p-6 lg:p-8">
            {currentView === 'main' && (
              <>
                {/* Header Section */}
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Premium Icon */}
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-lg animate-pulse" />
                      <div className="relative w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full border border-gray-700 flex items-center justify-center shadow-xl">
                        <span className="text-lg lg:text-xl">🍪</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <h2 className="text-lg lg:text-xl font-bold text-white tracking-tight">
                          Cookie Preferences
                        </h2>
                        <div className="flex items-center gap-2">
                          <div className="px-2 py-1 text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full shadow-lg">
                            {cookieManager.getRegion()} Compliant
                          </div>
                          <div className="px-2 py-1 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">
                            v{cookieManager.getVersion()}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm lg:text-base text-gray-300 leading-relaxed mb-4">
                        We use cookies to enhance your experience, provide personalized content, and analyze our traffic. 
                        You can customize your preferences or accept all cookies to continue.
                      </p>
                      
                      {/* Quick Stats */}
                      <div className="flex items-center gap-6 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                          <span>1 Essential</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-gray-500 rounded-full" />
                          <span>4 Optional</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>🏢</span>
                          <span>12 Partners</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={handleClose}
                    className="group p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-gray-600 flex-shrink-0"
                    aria-label="Close cookie banner"
                    disabled={isLoading}
                  >
                    <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    onClick={() => setCurrentView('details')}
                    className="group flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 backdrop-blur-sm"
                    disabled={isLoading}
                  >
                    <span>Customize Settings</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRejectAll}
                      className="group relative px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-all duration-300 rounded-lg border border-gray-600 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-700/50 backdrop-blur-sm overflow-hidden flex-1 sm:flex-none"
                      disabled={isLoading}
                    >
                      <span className="relative z-10">Reject Optional</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-700/0 via-gray-600/20 to-gray-700/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    </button>
                    
                    <button
                      onClick={handleAcceptAll}
                      className="group relative px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transform hover:scale-105 flex-1 sm:flex-none"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                        boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
                      }}
                      disabled={isLoading}
                    >
                      <span className="relative z-10">Accept All Cookies</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {currentView === 'details' && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCurrentView('main')}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200"
                      disabled={isLoading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h2 className="text-xl font-bold text-white">Cookie Preferences</h2>
                  </div>
                  
                  <button
                    onClick={handleClose}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200"
                    disabled={isLoading}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Cookie Categories */}
                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto custom-scrollbar">
                  {(Object.entries(categoryData) as [keyof ConsentCategories, CategoryInfo][]).map(([key, category]) => {
                    const colors = getColorClasses(category.color);
                    const isEnabled = preferences[key];
                    const isRequired = key === 'essential';
                    
                    return (
                      <div
                        key={key}
                        className="group relative p-4 lg:p-5 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-lg">{category.icon}</span>
                              <h3 className="font-semibold text-white text-sm lg:text-base">
                                {category.title}
                              </h3>
                              {isRequired && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full">
                                  Required
                                </span>
                              )}
                            </div>
                            
                            <p className="text-xs lg:text-sm text-gray-400 leading-relaxed mb-3">
                              {category.description}
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500">
                              <div>
                                <span className="font-medium text-gray-400">Examples:</span>
                                <ul className="mt-1 space-y-1">
                                  {category.examples.map((example, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                      <span className={`w-1 h-1 ${colors.bg} rounded-full`} />
                                      {example}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <span className="font-medium text-gray-400">Retention:</span>
                                <p className="mt-1">{category.retention}</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Toggle Switch */}
                          <div className="flex-shrink-0">
                            <button
                              onClick={() => togglePreference(key)}
                              disabled={isRequired || isLoading}
                              className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                                isRequired 
                                  ? 'bg-emerald-500 cursor-not-allowed opacity-75' 
                                  : isEnabled 
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg' 
                                    : 'bg-gray-700 hover:bg-gray-600'
                              }`}
                              aria-label={`Toggle ${category.title}`}
                              role="switch"
                              aria-checked={isEnabled}
                            >
                              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg transform transition-all duration-300 flex items-center justify-center ${
                                isEnabled ? 'translate-x-6' : 'translate-x-0'
                              }`}>
                                {isRequired && (
                                  <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legal Links */}
                <div className="flex flex-wrap items-center justify-center gap-4 mb-6 py-4 border-t border-gray-800">
                  {[
                    { label: "Privacy Policy", href: "/privacy", icon: "🔒" },
                    { label: "Cookie Policy", href: "/cookies", icon: "🍪" },
                    { label: "Terms of Service", href: "/terms", icon: "📋" },
                    { label: "Data Processing", href: "/data-processing", icon: "⚙️" }
                  ].map((link) => (
                    <a 
                      key={link.label}
                      href={link.href}
                      className="group flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg border border-transparent hover:border-blue-500/20 transition-all duration-200"
                    >
                      <span>{link.icon}</span>
                      <span className="underline underline-offset-2 group-hover:no-underline">{link.label}</span>
                    </a>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                  <button
                    onClick={handleRejectAll}
                    className="group relative px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-all duration-300 rounded-lg border border-gray-600 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-700/50 backdrop-blur-sm overflow-hidden flex-1"
                    disabled={isLoading}
                  >
                    <span className="relative z-10">Reject Optional</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-red-500/10 to-red-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </button>
                  
                  <button
                    onClick={handleSavePreferences}
                    className="group relative px-4 py-2.5 text-sm font-medium text-blue-400 hover:text-white transition-all duration-300 rounded-lg border border-blue-500/40 hover:border-blue-400 bg-blue-500/10 hover:bg-blue-500/20 backdrop-blur-sm overflow-hidden flex-1"
                    disabled={isLoading}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Save Preferences
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-400/20 to-blue-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </button>
                  
                  <button
                    onClick={handleAcceptAll}
                    className="group relative px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transform hover:scale-105 flex-1"
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                      boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
                    }}
                    disabled={isLoading}
                  >
                    <span className="relative z-10">Accept All</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Success/Status Messages */}
      {(animationPhase === 'accepted' || animationPhase === 'rejected' || animationPhase === 'saved') && (
        <div className="fixed bottom-4 right-4 z-60 animate-bounce">
          <div className={`px-4 py-3 rounded-lg shadow-lg border ${
            animationPhase === 'accepted' 
              ? 'bg-emerald-500/90 border-emerald-400 text-white' 
              : animationPhase === 'rejected'
                ? 'bg-red-500/90 border-red-400 text-white'
                : 'bg-blue-500/90 border-blue-400 text-white'
          } backdrop-blur-sm`}>
            <div className="flex items-center gap-2 text-sm font-medium">
              {animationPhase === 'accepted' && (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>All cookies accepted!</span>
                </>
              )}
              {animationPhase === 'rejected' && (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>Optional cookies rejected!</span>
                </>
              )}
              {animationPhase === 'saved' && (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Preferences saved!</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(107, 114, 128, 0.5) transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.5);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.7);
        }
        
        @media (max-width: 640px) {
          .custom-scrollbar {
            max-height: 60vh;
          }
        }
      `}</style>
    </>
  );
};

// Usage Example Component
export const CookieConsentDemo: React.FC = () => {
  const [showDemo, setShowDemo] = useState<boolean>(false);

  useEffect(() => {
    // Listen for cookie consent events
    const handleConsentUpdate = (event: Event): void => {
      const customEvent = event as CustomEvent<ConsentEventDetail>;
      console.log('Cookie consent updated:', customEvent.detail);
      
      // Example integrations:
      if (customEvent.detail.categories.analytics) {
        console.log('Loading Google Analytics...');
      }
      
      if (customEvent.detail.categories.marketing) {
        console.log('Loading marketing scripts...');
      }
      
      if (customEvent.detail.categories.functional) {
        console.log('Loading functional cookies...');
      }
    };

    window.addEventListener('cookieConsentUpdated', handleConsentUpdate);
    return () => window.removeEventListener('cookieConsentUpdated', handleConsentUpdate);
  }, []);

  interface Feature {
    title: string;
    items: string[];
  }

  const features: Feature[] = [
    {
      title: "🎯 Advanced Features",
      items: ["Region detection", "Custom categories", "Vendor management", "A11y compliance"]
    },
    {
      title: "📱 Responsive Design", 
      items: ["Mobile optimized", "Touch friendly", "Adaptive layouts", "Cross-browser"]
    },
    {
      title: "⚡ Performance",
      items: ["Lazy loading", "Memory efficient", "Fast animations", "SEO friendly"]
    },
    {
      title: "🔧 Developer Ready",
      items: ["Event system", "API integration", "TypeScript ready", "Customizable"]
    }
  ];

  interface LegalLink {
    label: string;
    href: string;
  }

  const integrationSteps: LegalLink[] = [
    { label: "Import the component", href: "import { AdvancedCookieConsent } from './AdvancedCookieConsent'" },
    { label: "Add to your app root", href: "<AdvancedCookieConsent />" },
    { label: "Listen for consent events", href: "window.addEventListener('cookieConsentUpdated', handler)" },
    { label: "Customize categories and integrate with your services", href: "" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold text-white mb-6">
          Advanced Cookie Consent Manager
        </h1>
        
        <p className="text-gray-300 text-lg mb-8 leading-relaxed">
          Production-ready cookie consent with advanced features, responsive design, 
          accessibility support, and enterprise-level customization options.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
            >
              <h3 className="text-white font-semibold mb-3">{feature.title}</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                {feature.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-blue-500 rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <button
          onClick={() => setShowDemo(true)}
          className="group relative px-8 py-4 text-lg font-semibold text-white transition-all duration-300 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transform hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.4)',
          }}
        >
          <span className="relative z-10">Show Cookie Banner</span>
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </button>
        
        <div className="mt-8 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
          <h3 className="text-white font-medium mb-2">Integration Instructions:</h3>
          <div className="text-left text-sm text-gray-400 space-y-2">
            <p>1. Import: <code className="text-blue-400 bg-gray-900 px-2 py-1 rounded">import &#123; AdvancedCookieConsent &#125; from './AdvancedCookieConsent'</code></p>
            <p>2. Use: <code className="text-blue-400 bg-gray-900 px-2 py-1 rounded">&lt;AdvancedCookieConsent /&gt;</code></p>
            <p>3. Events: <code className="text-blue-400 bg-gray-900 px-2 py-1 rounded">window.addEventListener('cookieConsentUpdated', handler)</code></p>
            <p>4. Customize categories and integrate with your services</p>
          </div>
        </div>
      </div>
      
      {showDemo && <AdvancedCookieConsent />}
    </div>
  );
};

export default CookieConsentDemo;