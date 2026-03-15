"use client";

import { Button } from "@/components/atoms/Button";
import { BackButton } from "@/components/atoms/Button/BackButton";
import { usePageTranslation } from "@/hooks/usePageTranslation";
import { motion } from "framer-motion";

export function ClientNotFound({ lang: _lang }: { lang: string }): JSX.Element {
  const { t, isLoading } = usePageTranslation("not-found");

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-center">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-6 text-center text-white">
      {/* Background edge gradient auras */}
      <div className="absolute inset-0 -z-10 bg-black" />
      <div className="absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-purple-900/30 via-cyan-900/20 to-fuchsia-900/30 blur-3xl animate-pulse" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_70%)]" />

      <motion.div
        className="flex flex-col items-center text-center space-y-10"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Futuristic 404 */}
        <h1 className="text-8xl font-extrabold tracking-tight sm:text-9xl bg-gradient-to-r from-white via-neutral-400 to-white bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(255,255,255,0.08)]">
          404
        </h1>

        {/* Title */}
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-200 sm:text-4xl">
          {t("title")}
        </h2>

        {/* Description */}
        <p className="max-w-xl text-lg leading-relaxed text-neutral-400 sm:text-xl">
          {t("description")}
        </p>

        {/* Edge-based Buttons */}
        <div className="mt-6 flex gap-4">
          <Button
            href="/"
            size="lg"
            className="rounded-xl border border-transparent bg-gradient-to-r from-white via-neutral-200 to-white px-8 py-3 text-black shadow-lg transition hover:opacity-90"
          >
            {t("goHome")}
          </Button>

          <BackButton className="rounded-xl border border-neutral-700 bg-gradient-to-r from-neutral-900 to-neutral-800 px-8 py-3 text-neutral-300 transition hover:border-neutral-500 hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]" />
        </div>
      </motion.div>
    </div>
  );
}
