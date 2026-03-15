import useSWR from "swr";
import { SeoRecord, SeoType } from "@/types/seo";

const fetcher = async (url: string): Promise<SeoRecord> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch SEO data: ${response.statusText}`);
  }
  return response.json();
};

interface UseSeoReturn {
  seo: SeoRecord | undefined;
  isLoading: boolean;
  isError: Error | undefined;
  mutate: () => Promise<SeoRecord | undefined>;
}

export function useSeo(type: SeoType, id: string): UseSeoReturn {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/seo/${type}/${id}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    seo: data,
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for updating SEO data
interface UseUpdateSeoReturn {
  updateSeo: (type: SeoType, id: string, data: Partial<SeoRecord>) => Promise<SeoRecord>;
}

export function useUpdateSeo(): UseUpdateSeoReturn {
  const updateSeo = async (type: SeoType, id: string, data: Partial<SeoRecord>) => {
    const response = await fetch(`/api/seo/${type}/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("admin-token") || ""}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update SEO: ${response.statusText}`);
    }

    return response.json();
  };

  return { updateSeo };
} 