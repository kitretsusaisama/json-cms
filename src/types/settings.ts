import { z } from "zod";

// App Configuration Schema
export const AppSettingsSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  domain: z.string().url().or(z.string()),
  environment: z.enum(["development", "staging", "production"]),
  features: z.object({
    seo: z.boolean(),
    jsonPages: z.boolean(),
    pwa: z.boolean(),
    ai: z.boolean(),
    analytics: z.boolean(),
    auth: z.boolean().optional(),
    payments: z.boolean().optional(),
    blog: z.boolean().optional(),
    commerce: z.boolean().optional(),
  }),
  security: z.object({
    csp: z.boolean(),
    hsts: z.boolean(),
    rateLimit: z.boolean(),
    auditLog: z.boolean(),
    cors: z.object({
      origins: z.array(z.string()),
      credentials: z.boolean(),
    }).optional(),
    helmet: z.object({
      enabled: z.boolean(),
      contentSecurityPolicy: z.boolean(),
      hsts: z.boolean(),
    }).optional(),
  }),
  performance: z.object({
    cache: z.boolean(),
    compression: z.boolean(),
    minification: z.boolean(),
    cdn: z.string().optional(),
    imageCdn: z.string().optional(),
  }),
  i18n: z.object({
    defaultLocale: z.string(),
    supportedLocales: z.array(z.string()),
    fallbackLocale: z.string(),
  }),
  theme: z.object({
    default: z.string(),
    supported: z.array(z.string()),
  }),
  contact: z.object({
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
    supportEmail: z.string().email().optional(),
    businessEmail: z.string().email().optional(),
  }),
  social: z.object({
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    facebook: z.string().optional(),
    instagram: z.string().optional(),
  }),
  limits: z.object({
    maxPageSize: z.number().default(50),
    maxUploadSize: z.number().default(10485760), // 10MB
    rateLimit: z.object({
      requests: z.number().default(100),
      windowMs: z.number().default(900000), // 15 minutes
    }),
  }).optional(),
});

// Analytics Configuration Schema
export const AnalyticsSettingsSchema = z.object({
  providers: z.array(z.object({
    name: z.enum(["google-analytics", "plausible", "mixpanel", "segment", "posthog"]),
    enabled: z.boolean(),
    config: z.record(z.any()),
    dataRetention: z.number().optional(), // days
    anonymizeIp: z.boolean().default(true),
  })),
  gdprCompliant: z.boolean().default(true),
  cookieConsent: z.boolean().default(true),
  trackingConsentRequired: z.boolean().default(true),
});

// SEO Configuration Schema
export const SeoSettingsSchema = z.object({
  siteName: z.string(),
  siteUrl: z.string().url(),
  defaultTitle: z.string(),
  defaultDescription: z.string(),
  titleTemplate: z.string().default("%s | %siteName%"),
  separator: z.string().default("|"),
  robots: z.object({
    index: z.boolean().default(true),
    follow: z.boolean().default(true),
  }),
  openGraph: z.object({
    siteName: z.string(),
    type: z.string().default("website"),
    locale: z.string().default("en_US"),
    images: z.array(z.object({
      url: z.string().url(),
      width: z.number(),
      height: z.number(),
      alt: z.string(),
    })),
  }),
  twitter: z.object({
    handle: z.string(),
    site: z.string(),
    cardType: z.enum(["summary", "summary_large_image", "app", "player"]).default("summary_large_image"),
  }),
  structuredData: z.object({
    organization: z.object({
      name: z.string(),
      url: z.string().url(),
      logo: z.string().url(),
      sameAs: z.array(z.string().url()).optional(),
    }).optional(),
    website: z.object({
      url: z.string().url(),
      potentialAction: z.object({
        target: z.string(),
        queryInput: z.string(),
      }).optional(),
    }).optional(),
  }).optional(),
});

// Theme Configuration Schema
export const ThemeSettingsSchema = z.object({
  mode: z.enum(["light", "dark", "auto"]),
  primary: z.string().optional(),
  secondary: z.string().optional(),
  accent: z.string().optional(),
  background: z.string().optional(),
  surface: z.string().optional(),
  radius: z.number().min(0).max(24).default(8),
  fonts: z.object({
    sans: z.string().default("Inter"),
    serif: z.string().default("Merriweather"),
    mono: z.string().default("JetBrains Mono"),
  }).optional(),
  customCss: z.string().optional(),
});

// Email Configuration Schema
export const EmailSettingsSchema = z.object({
  provider: z.enum(["smtp", "sendgrid", "mailgun", "ses", "postmark"]).default("smtp"),
  config: z.record(z.any()),
  templates: z.array(z.object({
    id: z.string(),
    name: z.string(),
    subject: z.string(),
    htmlTemplate: z.string().optional(),
    textTemplate: z.string().optional(),
    variables: z.array(z.string()).optional(),
  })),
  defaultFrom: z.object({
    email: z.string().email(),
    name: z.string(),
  }),
  replyTo: z.string().email().optional(),
  deliverySettings: z.object({
    retryAttempts: z.number().default(3),
    retryDelay: z.number().default(1000),
    batchSize: z.number().default(100),
  }).optional(),
});

// Internationalization Schema
export const I18nSettingsSchema = z.object({
  locales: z.array(z.string()),
  defaultLocale: z.string(),
  fallbackLocale: z.string(),
  dateFormats: z.record(z.string()).optional(),
  numberFormats: z.record(z.object({
    style: z.enum(["decimal", "currency", "percent"]),
    currency: z.string().optional(),
  })).optional(),
  rtlLocales: z.array(z.string()).optional(),
});

// Currency Configuration Schema
export const CurrencySettingsSchema = z.object({
  default: z.string().length(3), // ISO 4217
  supported: z.array(z.string().length(3)),
  exchangeRateProvider: z.enum(["fixer", "openexchangerates", "exchangerate-api"]).optional(),
  formatting: z.record(z.object({
    symbol: z.string(),
    symbolFirst: z.boolean().default(true),
    spaceBetweenAmountAndSymbol: z.boolean().default(false),
    decimalPlaces: z.number().default(2),
  })).optional(),
});

// Payment Configuration Schema
export const PaymentSettingsSchema = z.object({
  providers: z.array(z.object({
    name: z.enum(["stripe", "paypal", "square", "razorpay", "mollie"]),
    enabled: z.boolean(),
    config: z.record(z.any()),
    supportedMethods: z.array(z.string()),
    webhookUrl: z.string().url().optional(),
  })),
  defaultCurrency: z.string().length(3),
  taxCalculation: z.object({
    enabled: z.boolean().default(false),
    provider: z.string().optional(),
  }).optional(),
});

// Notification Settings Schema
export const NotificationSettingsSchema = z.object({
  channels: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    push: z.boolean().default(false),
    slack: z.boolean().default(false),
    discord: z.boolean().default(false),
  }),
  providers: z.array(z.object({
    type: z.enum(["email", "sms", "push", "slack", "discord", "webhook"]),
    name: z.string(),
    enabled: z.boolean(),
    config: z.record(z.any()),
  })),
  templates: z.array(z.object({
    id: z.string(),
    name: z.string(),
    channels: z.array(z.string()),
    priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    template: z.record(z.string()), // channel -> template
  })),
});

// Integration Settings Schema
export const IntegrationSettingsSchema = z.object({
  apis: z.array(z.object({
    name: z.string(),
    type: z.enum(["rest", "graphql", "webhook", "queue"]),
    enabled: z.boolean(),
    config: z.record(z.any()),
    authentication: z.object({
      type: z.enum(["none", "apikey", "bearer", "basic", "oauth2"]),
      credentials: z.record(z.string()).optional(),
    }).optional(),
    rateLimit: z.object({
      requests: z.number(),
      window: z.number(),
    }).optional(),
  })),
  webhooks: z.object({
    enabled: z.boolean().default(false),
    endpoints: z.array(z.object({
      name: z.string(),
      url: z.string().url(),
      events: z.array(z.string()),
      secret: z.string().optional(),
      enabled: z.boolean().default(true),
    })),
  }).optional(),
});

// Type exports
export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type AnalyticsSettings = z.infer<typeof AnalyticsSettingsSchema>;
export type SeoSettings = z.infer<typeof SeoSettingsSchema>;
export type ThemeSettings = z.infer<typeof ThemeSettingsSchema>;
export type EmailSettings = z.infer<typeof EmailSettingsSchema>;
export type I18nSettings = z.infer<typeof I18nSettingsSchema>;
export type CurrencySettings = z.infer<typeof CurrencySettingsSchema>;
export type PaymentSettings = z.infer<typeof PaymentSettingsSchema>;
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;
export type IntegrationSettings = z.infer<typeof IntegrationSettingsSchema>;

// Unified settings schema
export const AllSettingsSchema = z.object({
  app: AppSettingsSchema,
  analytics: AnalyticsSettingsSchema,
  seo: SeoSettingsSchema,
  theme: ThemeSettingsSchema,
  emails: EmailSettingsSchema,
  i18n: I18nSettingsSchema,
  currency: CurrencySettingsSchema,
  payments: PaymentSettingsSchema,
  notifications: NotificationSettingsSchema,
  integrations: IntegrationSettingsSchema,
});

export type AllSettings = z.infer<typeof AllSettingsSchema>;
