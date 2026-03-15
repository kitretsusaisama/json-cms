import { SEOHealthChecker } from '../src/lib/seo/health';
import fs from 'fs/promises';
import path from 'path';

describe('SEOHealthChecker', () => {
  const testDataDir = path.join(__dirname, '..', 'data', 'seo');
  const testEventsDir = path.join(testDataDir, 'event');
  
  beforeAll(async () => {
    // Create test directory structure
    await fs.mkdir(testDataDir, { recursive: true });
    await fs.mkdir(testEventsDir, { recursive: true });
    
    // Create a test event file
    await fs.writeFile(
      path.join(testEventsDir, 'test-event.json'),
      JSON.stringify({
        id: 'test-event',
        type: 'event',
        title: 'Test Event | 2023-12-31 | Albata Events',
        description: 'Join us for Test Event on December 31, 2023',
        canonical: 'https://albata.com/events/test-event',
        robots: 'index,follow',
        alternates: {
          en: 'https://albata.com/events/test-event',
          es: 'https://albata.com/es/eventos/test-event'
        },
        openGraph: {
          type: 'event',
          title: 'Test Event',
          description: 'Join us for Test Event on December 31, 2023',
          url: 'https://albata.com/events/test-event',
          images: [
            {
              url: 'https://albata.com/images/events/test-event.jpg',
              width: 1200,
              height: 630,
              alt: 'Test Event'
            }
          ],
          event: {
            start_time: '2023-12-31T19:00:00Z',
            end_time: '2024-01-01T01:00:00Z',
            location: 'Test Venue',
            price: 'Free'
          }
        },
        twitter: {
          card: 'summary_large_image',
          title: 'Test Event | December 31, 2023',
          description: 'Join us for this event on December 31, 2023',
          image: 'https://albata.com/images/events/test-event-social.jpg'
        },
        structuredData: [
          {
            "@context": "https://schema.org",
            "@type": "Event",
            "name": "Test Event",
            "description": "Join us for this special event",
            "startDate": "2023-12-31T19:00:00Z",
            "endDate": "2024-01-01T01:00:00Z",
            "eventStatus": "EventScheduled",
            "eventAttendanceMode": "OfflineEventAttendanceMode",
            "location": {
              "@type": "Place",
              "name": "Test Venue",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "123 Test St",
                "addressLocality": "Test City",
                "addressRegion": "Test State",
                "postalCode": "12345",
                "addressCountry": "US"
              }
            },
            "image": [
              "https://albata.com/images/events/test-event.jpg"
            ],
            "offers": {
              "@type": "Offer",
              "url": "https://albata.com/events/test-event",
              "price": "0",
              "priceCurrency": "USD",
              "availability": "InStock",
              "validFrom": "2023-01-01T00:00:00Z"
            },
            "performer": {
              "@type": "PerformingGroup",
              "name": "Test Organizer"
            }
          }
        ],
        meta: [
          {
            name: 'keywords',
            content: 'test, event, december 2023'
          },
          {
            name: 'author',
            content: 'Test Organizer'
          }
        ],
        updatedAt: '2023-01-01T00:00:00.000Z'
      }, null, 2)
    );
  });

  afterAll(async () => {
    // Clean up test files
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  it('should validate SEO files and return results', async () => {
    const checker = new SEOHealthChecker(testDataDir);
    const results = await checker.checkAll();
    
    // Should find our test event file
    expect(results.length).toBeGreaterThan(0);
    
    // Find our test event in the results
    const testEventResult = results.find(r => r.file.includes('test-event.json'));
    expect(testEventResult).toBeDefined();
    
    // The test event should be valid
    expect(testEventResult?.isValid).toBe(true);
    expect(testEventResult?.errors).toHaveLength(0);
  });

  it('should detect missing required fields', async () => {
    // Create an invalid event file
    const invalidEvent = {
      id: 'invalid-event',
      type: 'event',
      // Missing required fields like title, description, etc.
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(
      path.join(testEventsDir, 'invalid-event.json'),
      JSON.stringify(invalidEvent, null, 2)
    );
    
    const checker = new SEOHealthChecker(testDataDir);
    const results = await checker.checkAll();
    
    const invalidResult = results.find(r => r.file.includes('invalid-event.json'));
    expect(invalidResult).toBeDefined();
    expect(invalidResult?.isValid).toBe(false);
    expect(invalidResult?.errors.length).toBeGreaterThan(0);
  });

  it('should generate a readable report', async () => {
    const checker = new SEOHealthChecker(testDataDir);
    const results = await checker.checkAll();
    const report = await SEOHealthChecker.generateReport(results);
    
    expect(typeof report).toBe('string');
    expect(report).toContain('SEO Health Check Report');
    expect(report).toContain('Total files checked');
  });
});
