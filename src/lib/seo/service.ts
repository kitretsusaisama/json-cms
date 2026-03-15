import type { SeoRecord } from "@/types/seo";
import { readOne, upsert } from "./adapter.json";

export const getSeo = (entity: SeoRecord["type"], id: string): Promise<SeoRecord | null> => readOne(entity, id);
export const setSeo = (entity: SeoRecord["type"], data: SeoRecord): Promise<SeoRecord> => upsert(entity, data);
