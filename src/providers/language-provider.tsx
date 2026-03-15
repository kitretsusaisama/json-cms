"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { defaultLanguage, supportedLanguages } from "@/i18n";
import { logger } from "@/lib/logger";

type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, params?: Record<string, string>) => string;
  languageNames: Record<string, string>;
  supportedLanguages: string[];
};

const LanguageContext = createContext<LanguageContextType | null>(null);

const languageNames: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  zh: "Chinese",
};

const translations: Record<string, Record<string, string>> = {
  en: {
    "common.welcome": "Welcome",
    "common.home": "Home",
    "common.about": "About",
    "common.contact": "Contact",
    "common.login": "Login",
    "common.signup": "Sign Up",
    "common.logout": "Logout",
    "home.title": "Enterprise-Grade Next.js Application",
    "home.subtitle": "A production-ready application built for Fortune 500 teams.",
    "home.getStarted": "Get Started",
    "home.learnMore": "Learn More",
  },
  es: {
    "common.welcome": "Bienvenido",
    "common.home": "Inicio",
    "common.about": "Acerca",
    "common.contact": "Contacto",
    "common.login": "Iniciar sesion",
    "common.signup": "Registrarse",
    "common.logout": "Cerrar sesion",
    "home.title": "Aplicacion Next.js empresarial",
    "home.subtitle": "Una aplicacion lista para produccion.",
    "home.getStarted": "Comenzar",
    "home.learnMore": "Saber mas",
  },
  fr: {
    "common.welcome": "Bienvenue",
    "common.home": "Accueil",
    "common.about": "A propos",
    "common.contact": "Contact",
    "common.login": "Connexion",
    "common.signup": "Inscription",
    "common.logout": "Deconnexion",
    "home.title": "Application Next.js entreprise",
    "home.subtitle": "Une application prete pour la production.",
    "home.getStarted": "Commencer",
    "home.learnMore": "En savoir plus",
  },
  de: {
    "common.welcome": "Willkommen",
    "common.home": "Startseite",
    "common.about": "Uber uns",
    "common.contact": "Kontakt",
    "common.login": "Anmelden",
    "common.signup": "Registrieren",
    "common.logout": "Abmelden",
    "home.title": "Next.js-Anwendung fur Unternehmen",
    "home.subtitle": "Eine produktionsreife Anwendung.",
    "home.getStarted": "Loslegen",
    "home.learnMore": "Mehr erfahren",
  },
  zh: {
    "common.welcome": "Huan ying",
    "common.home": "Shou ye",
    "common.about": "Guan yu",
    "common.contact": "Lian xi",
    "common.login": "Deng lu",
    "common.signup": "Zhu ce",
    "common.logout": "Tui chu",
    "home.title": "Qi ye ji Next.js ying yong",
    "home.subtitle": "Mian xiang sheng chan huan jing de ying yong.",
    "home.getStarted": "Kai shi",
    "home.learnMore": "Liao jie geng duo",
  },
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
  lang?: string;
}

export function LanguageProvider({ children, lang }: LanguageProviderProps): React.JSX.Element {
  const initial = lang && supportedLanguages.includes(lang) ? lang : defaultLanguage;
  const [language, setLanguageState] = useState<string>(initial);

  useEffect(() => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; NEXT_LOCALE=`);
    const cookieLang = parts.length === 2 ? parts.pop()?.split(";").shift() : null;
    if (cookieLang && supportedLanguages.includes(cookieLang)) {
      setLanguageState(cookieLang);
    }
  }, []);

  const setLanguage = (nextLanguage: string): void => {
    if (!supportedLanguages.includes(nextLanguage)) {
      logger.warn({
        message: `Language \"${nextLanguage}\" is not supported`,
        supportedLanguages,
      });
      return;
    }

    setLanguageState(nextLanguage);
    document.cookie = `NEXT_LOCALE=${nextLanguage}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Strict`;
  };

  const t = (key: string, params?: Record<string, string>): string => {
    const translation = translations[language]?.[key] ?? translations[defaultLanguage]?.[key] ?? key;
    if (!params) {
      return translation;
    }

    return Object.entries(params).reduce(
      (acc, [paramKey, paramValue]) =>
        acc.replace(new RegExp(`\\{${paramKey}\\}`, "g"), paramValue),
      translation
    );
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, languageNames, supportedLanguages }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
