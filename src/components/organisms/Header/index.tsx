'use client';

import React from 'react';
import Link from 'next/link';
import { useLayout } from '../../layouts/LayoutProvider';
import { LanguageSwitcher } from '../../atoms/LanguageSwitcher';
import { ThemeToggle } from '../../atoms/ThemeToggle';
import { MobileMenuToggle } from '../../atoms/MobileMenuToggle';
import { useLanguage } from '../../../providers/language-provider';

export function Header(): JSX.Element {
  const { theme, toggleTheme, isMobileMenuOpen, toggleMobileMenu } = useLayout();
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-primary-600 dark:text-primary-400"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="font-bold">Albata</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex md:items-center md:gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-neutral-700 transition-colors hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400"
          >
            {t('common.home')}
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-neutral-700 transition-colors hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400"
          >
            {t('common.about')}
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-neutral-700 transition-colors hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400"
          >
            {t('common.contact')}
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Theme Toggle */}
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />

          {/* Mobile Menu Toggle */}
          <MobileMenuToggle isMobileMenuOpen={isMobileMenuOpen} toggleMobileMenu={toggleMobileMenu} />
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="container border-t px-4 py-4 md:hidden">
          <nav className="flex flex-col space-y-4">
            <Link
              href="/"
              className="text-sm font-medium text-neutral-700 transition-colors hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400"
              onClick={() => toggleMobileMenu()}
            >
              {t('common.home')}
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-neutral-700 transition-colors hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400"
              onClick={() => toggleMobileMenu()}
            >
              {t('common.about')}
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-neutral-700 transition-colors hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400"
              onClick={() => toggleMobileMenu()}
            >
              {t('common.contact')}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}