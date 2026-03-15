import fs from "node:fs/promises";
import path from "node:path";

async function readJson<T>(...parts: string[]): Promise<T> {
  const file = path.join(process.cwd(), "data", "settings", ...parts);
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw) as T;
}

export const loadSettings = {
  app: (): Promise<unknown> => readJson("app.json"),
  theme: (): Promise<unknown> => readJson("theme.json"),
  i18n: (): Promise<unknown> => readJson("i18n.json"),
  currency: (): Promise<unknown> => readJson("currency.json"),
  payments: (): Promise<unknown> => readJson("payments.json"),
  emails: (): Promise<unknown> => readJson("emails.json"),
  seo: (): Promise<unknown> => readJson("seo.json"),
  analytics: (): Promise<unknown> => readJson("analytics.json"),
  notifications: (): Promise<unknown> => readJson("notifications.json"),
  integrations: (): Promise<unknown> => readJson("integrations.json"),
  reports: (): Promise<unknown> => readJson("reports.json"),
};
