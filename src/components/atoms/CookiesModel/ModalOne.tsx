"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function CookieConsentOne(): JSX.Element {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          role="dialog"
          aria-modal="true"
          aria-hidden="false"
          aria-describedby="cm__desc"
          aria-labelledby="cm__title"
          className="fixed bottom-6 right-6 z-50 w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200/40 bg-white/80 shadow-[0_8px_40px_rgba(0,0,0,0.15)] backdrop-blur-xl dark:border-neutral-700/40 dark:bg-neutral-900/70"
        >
          <div className="p-6">
            {/* Texts */}
            <div className="space-y-3">
              <h2
                id="cm__title"
                className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
              >
                🍪 Yes, we use cookies
              </h2>
              <p
                id="cm__desc"
                className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400"
              >
                This website utilizes cookies to enable essential site
                functionality and analytics. You may change your settings at any
                time or accept the default settings. You may close this banner
                to continue with only essential cookies.
                <br />
                Read more in our{" "}
                <a
                  href="/legal/cookies"
                  target="_blank"
                  className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  privacy & cookie statement
                </a>
                .
              </p>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl bg-gradient-to-r from-neutral-900 to-neutral-700 px-5 py-2 text-sm font-medium text-white shadow-md transition hover:opacity-90 dark:from-white dark:to-neutral-200 dark:text-black"
                  data-role="all"
                >
                  Accept all
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl border border-neutral-300/50 bg-neutral-100/60 px-5 py-2 text-sm font-medium text-neutral-700 backdrop-blur-sm transition hover:bg-neutral-200/70 dark:border-neutral-600/50 dark:bg-neutral-800/40 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
                  data-role="necessary"
                >
                  Reject all
                </button>
              </div>
              <button
                type="button"
                className="rounded-xl px-5 py-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                data-role="show"
              >
                Manage preferences
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CookieConsentOne;
