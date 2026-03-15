'use client';

import { useLanguage } from '@workspace/providers/language-provider';
import Link from 'next/link';

export default function ContactClient(): JSX.Element {
  const { t } = useLanguage();
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="mb-4 text-4xl font-bold">{t('contact.title')}</h1>
      <p className="mb-8 max-w-2xl text-lg">{t('contact.description')}</p>
      
      <div className="w-full max-w-md">
        <form className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-left text-sm font-medium mb-1">
              {t('contact.form.name')}
            </label>
            <input
              type="text"
              id="name"
              className="w-full rounded-md border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-neutral-800"
              placeholder={t('contact.form.namePlaceholder')}
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-left text-sm font-medium mb-1">
              {t('contact.form.email')}
            </label>
            <input
              type="email"
              id="email"
              className="w-full rounded-md border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-neutral-800"
              placeholder={t('contact.form.emailPlaceholder')}
            />
          </div>
          
          <div>
            <label htmlFor="message" className="block text-left text-sm font-medium mb-1">
              {t('contact.form.message')}
            </label>
            <textarea
              id="message"
              rows={4}
              className="w-full rounded-md border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-neutral-800"
              placeholder={t('contact.form.messagePlaceholder')}
            />
          </div>
          
          <button
            type="submit"
            className="w-full rounded-md bg-primary-600 px-6 py-3 text-white hover:bg-primary-700"
          >
            {t('contact.form.submit')}
          </button>
        </form>
      </div>
      
      <Link
        href="/"
        className="mt-8 rounded-md border border-neutral-300 px-6 py-3 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        {t('contact.backToHome')}
      </Link>
    </main>
  );
} 