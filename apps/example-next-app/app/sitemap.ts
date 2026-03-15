import { MetadataRoute } from 'next';
import { generateSitemapEntries } from '@workspace/lib/seo';

/**
 * Generate sitemap for the application
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Define your application routes here
  const routes = [
    '/',
    '/about',
    '/contact',
    '/blog',
    // Add more routes as needed
  ];

  // Generate sitemap entries for all routes and languages
  const entries = routes.flatMap(route =>
    generateSitemapEntries(route, {
      lastModified: new Date(),
      changeFrequency: route === '/' ? 'daily' : 'weekly',
      priority: route === '/' ? 1.0 : 0.8,
    })
  );

  return entries;
}