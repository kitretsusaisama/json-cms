"use client";

import { usePageTranslation } from "@workspace/hooks/usePageTranslation";
import Link from "next/link";

export default function AboutClient(): JSX.Element {
  const { t, isLoading } = usePageTranslation("about");

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="animate-pulse">Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="mb-4 text-4xl font-bold">{t("title")}</h1>
      <p className="mb-8 max-w-2xl text-lg">{t("description")}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        <div className="p-6 border border-neutral-200 rounded-lg dark:border-neutral-700">
          <h2 className="text-2xl font-bold mb-3">{t("mission.title")}</h2>
          <p>{t("mission.description")}</p>
        </div>

        <div className="p-6 border border-neutral-200 rounded-lg dark:border-neutral-700">
          <h2 className="text-2xl font-bold mb-3">{t("vision.title")}</h2>
          <p>{t("vision.description")}</p>
        </div>

        <div className="p-6 border border-neutral-200 rounded-lg dark:border-neutral-700 md:col-span-2">
          <h2 className="text-2xl font-bold mb-3">{t("team.title")}</h2>
          <p>{t("team.description")}</p>
        </div>
      </div>

      <Link
        href="/"
        className="mt-8 rounded-md bg-primary-600 px-6 py-3 text-white hover:bg-primary-700"
      >
        {t("backToHome")}
      </Link>
    </main>
  );
}
