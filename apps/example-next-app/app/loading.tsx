'use client';

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PreloaderProps {
  brandName?: string;
  minDuration?: number;
  onComplete?: () => void;
}

export default function Preloader({
  brandName = "WS AI",
  minDuration = 2000,
  onComplete,
}: PreloaderProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          {/* Sleek Ring */}
          <motion.div
            className="relative mb-8 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="w-20 h-20 rounded-full border border-neutral-800"
              animate={{ rotate: 360 }}
              transition={{
                repeat: Infinity,
                duration: 10,
                ease: "linear",
              }}
            />
            <motion.div
              className="absolute w-14 h-14 rounded-full border-t-2 border-neutral-200/80"
              animate={{ rotate: -360 }}
              transition={{
                repeat: Infinity,
                duration: 6,
                ease: "linear",
              }}
            />
          </motion.div>

          {/* Brand Text */}
          <motion.div
            className="text-xl font-light tracking-widest"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {brandName}
          </motion.div>

          {/* Subtle tagline */}
          <motion.p
            className="mt-4 text-sm text-neutral-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Loading intelligence…
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}