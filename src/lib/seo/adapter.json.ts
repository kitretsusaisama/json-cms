import { SeoRecordSchema, type SeoRecord } from "@/types/seo";
import { fsSeoStore } from "@/lib/seo-store";

// Adapter interface compatible with future DB adapter
export async function readOne(entity: SeoRecord["type"], id: string): Promise<SeoRecord | null> {
  const rec = await fsSeoStore.get(entity, id);
  return rec ? SeoRecordSchema.parse(rec) : null;
}

export async function upsert(entity: SeoRecord["type"], input: unknown): Promise<SeoRecord> {
  const parsed = SeoRecordSchema.parse(input);
  await fsSeoStore.set(parsed.type, parsed.id, parsed);
  return parsed;
}
