"use client";
import useSWR from "swr";
import type { SeoRecord } from "@/types/seo";

const fetcher = (url: string): Promise<{ seo: SeoRecord }> => 
  fetch(url, { cache: "no-store" }).then((r) => r.json());

interface UseSeoReturn {
  seo: SeoRecord | null;
  error: Error | null;
  isLoading: boolean;
  refresh: () => void;
}

export function useSeo(entity: string, id: string): UseSeoReturn {
  const key = id ? `/api/seo/${entity}?id=${encodeURIComponent(id)}` : null;
  const { data, error, isLoading, mutate } = useSWR(key, fetcher);
  return { seo: data?.seo ?? null, error, isLoading, refresh: () => mutate() };
}
