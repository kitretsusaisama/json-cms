import { MetadataRoute } from 'next';
import { generateRobots } from '@workspace/lib/seo';

/**
 * Generate robots.txt for the application
 */
export default function robots(): MetadataRoute.Robots {
  return generateRobots();
}