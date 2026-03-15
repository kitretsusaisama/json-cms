'use client';

import React from 'react';
import { useLanguage } from '../../../providers/language-provider';
import { useLayout } from '../../layouts/LayoutProvider';

export function LanguageSwitcher(): JSX.Element {
  const { language, setLanguage, languageNames, supportedLanguages } = useLanguage();
  const { isLanguageMenuOpen, toggleLanguageMenu } = useLayout();

  return (
    <div className="relative">
      <button
        onClick={toggleLanguageMenu}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        aria-expanded={isLanguageMenuOpen}
        aria-haspopup="true"
      >
        <span>{languageNames[language]}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${isLanguageMenuOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isLanguageMenuOpen && (
        <div className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-neutral-800 dark:ring-neutral-700">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {supportedLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setLanguage(lang);
                  toggleLanguageMenu();
                }}
                className={`block w-full px-4 py-2 text-left text-sm ${
                  language === lang
                    ? 'bg-neutral-100 font-medium text-primary-600 dark:bg-neutral-700 dark:text-primary-400'
                    : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-700'
                }`}
                role="menuitem"
              >
                {languageNames[lang]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
