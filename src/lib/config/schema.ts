import { z } from "zod";

export const AppSettings = z.object({ name: z.string(), baseUrl: z.string().url().optional(), featureFlags: z.array(z.string()).default([]) });
export const ThemeSettings = z.object({ mode: z.enum(["light", "dark"]).default("light"), radius: z.number().default(8) });
export const I18nSettings = z.object({ locales: z.array(z.string()).default(["en"]), default: z.string().default("en") });
export const CurrencySettings = z.object({ default: z.string().default("USD") });
export const PaymentsSettings = z.object({ providers: z.array(z.string()).default([]), testMode: z.boolean().default(true) });
export const EmailsSettings = z.object({ templates: z.array(z.object({ id: z.string(), subject: z.string(), html: z.string().optional(), text: z.string().optional() })).default([]) });
export const SeoSettings = z.object({ siteName: z.string().default("Albata") });
export const AnalyticsSettings = z.object({ providers: z.array(z.string()).default([]) });
export const NotificationsSettings = z.object({ channels: z.array(z.string()).default([]) });
export const IntegrationsSettings = z.object({ webhooks: z.array(z.string()).default([]) });
export const ReportsSettings = z.object({ reports: z.array(z.object({ id: z.string(), title: z.string() })).default([]) });
