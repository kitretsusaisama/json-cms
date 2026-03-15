// Analytics configuration

export const analyticsConfig = {
  // Google Analytics ID (GA4)
  gaId: process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXXXXXX',
  
  // Google Tag Manager ID
  gtmId: process.env.NEXT_PUBLIC_GTM_ID || 'GTM-XXXXXXXXX',
  
  // Enable/disable analytics in development
  enableInDevelopment: false,
};

// Helper to determine if analytics should be enabled
export function isAnalyticsEnabled(): boolean {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return !isDevelopment || analyticsConfig.enableInDevelopment;
}