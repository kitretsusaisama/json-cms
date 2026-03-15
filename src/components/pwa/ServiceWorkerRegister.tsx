"use client";
import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function ServiceWorkerRegister(): null {
  const handleRegistrationError = (error: Error): void => {
    logger.error({
      message: "Service Worker registration failed",
      error,
      component: "ServiceWorkerRegister",
    });
  };
  
  const handleUnregisterError = (error: Error): void => {
    logger.error({
      message: "Service Worker unregistration failed",
      error,
      component: "ServiceWorkerRegister",
    });
  };

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(handleRegistrationError);
    } else if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV !== "production" &&
      "serviceWorker" in navigator
    ) {
      // In dev, ensure no stale SW controls the page
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister().catch(handleUnregisterError));
      });
    }
  }, []);
  return null;
}
