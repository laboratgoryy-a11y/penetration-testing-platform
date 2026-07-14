import * as fc from 'fast-check';
import { Crawler, CrawlOptions } from '../services/Crawler';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * اختبار خاصية لاحترام ملف robots.txt
 * 
 * **الخاصية 10: احترام ملف robots.txt**
 * **يتحقق من: المتطلبات 1.6**
 * 
 * الخاصية: عندما يكون respectRobotsTxt مفعلاً، يجب على الماسح أن يحترم
 * قواعد robots.txt ولا يزور أي URL محظور في الملف.
 * 
 * For any robots.txt configuration and any set of URLs:
 * - IF respectRobotsTxt is true
 * - AND robots.txt disallows certain paths
 * - THEN the crawler MUST NOT visit those disallowed paths
 */

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Property Test: احترام ملف robots.txt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **يتحقق من: المتطلبات 1.6**
   * 
   * Property: Crawler respects robots.txt disallow rules
   * 
   * For any valid robots.txt with disallow rules and any starting URL:
   * - When respectRobotsTxt is enabled
   * - Then no disallowed URLs should be visited
   */
  test('property: crawler must not visit URLs disallowed by robots.txt', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary domain
        fc.domain(),
        // Generate arbitrary disallowed paths (1-5 paths)
        fc.array(fc.constantFrom('/admin', '/private', '/secret', '/internal', '/api'), {
          minLength: 1,
          maxLength: 5,
        }),
        // Generate arbitrary allowed paths
        fc.array(fc.constantFrom('/public', '/about', '/contact', '/home', '/blog'), {
          minLength: 1,
          maxLength: 3,
        }),
        async (domain, disallowedPaths, allowedPaths) => {
          // Setup: Create robots.txt content
          const robotsTxtContent = `User-agent: *\n${disallowedPaths
            .map((path) => `Disallow: ${path}`)
            .join('\n')}`;

          // Setup: Create mock HTML pages
          const createMockHtml = (links: string[]) => {
            const linkTags = links.map((link) => `<a href="${link}">Link</a>`).join('\n');
            return `<html><body>${linkTags}</body></html>`;
          };

          const baseUrl = `https://${domain}`;
          const startUrl = `${baseUrl}/`;

          // Create links that include both allowed and disallowed paths
          const allLinks = [...allowedPaths, ...disallowedPaths].map(
            (path) => `${baseUrl}${path}`
          );

          // Mock axios responses
          mockedAxios.create = jest.fn().mockReturnValue({
            get: jest.fn().mockImplementation((url: string) => {
              // Mock robots.txt
              if (url.endsWith('/robots.txt')) {
                return Promise.resolve({
                  data: robotsTxtContent,
                  status: 200,
                  headers: { 'content-type': 'text/plain' },
                });
              }

              // Mock HTML pages
              return Promise.resolve({
                data: createMockHtml(allLinks),
                status: 200,
                headers: { 'content-type': 'text/html' },
              });
            }),
          } as any);

          // Execute: Run crawler with respectRobotsTxt enabled
          const crawler = new Crawler({
            maxDepth: 2,
            maxRequests: 100,
            respectRobotsTxt: true,
            delayBetweenRequests: 0, // No delay for testing
          });

          const results = await crawler.crawl(startUrl);

          // Verify: No disallowed URLs should be in the results
          const visitedUrls = results.map((r) => r.url);

          for (const disallowedPath of disallowedPaths) {
            const disallowedUrl = `${baseUrl}${disallowedPath}`;
            const wasVisited = visitedUrls.includes(disallowedUrl);

            // Property: Disallowed URLs must NOT be visited
            if (wasVisited) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **يتحقق من: المتطلبات 1.6**
   * 
   * Property: Crawler visits allowed URLs when robots.txt is respected
   * 
   * For any valid robots.txt with allow rules:
   * - When respectRobotsTxt is enabled
   * - Then allowed URLs should be visited normally
   */
  test('property: crawler visits allowed URLs when respecting robots.txt', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.domain(),
        fc.array(fc.constantFrom('/public', '/about', '/contact', '/home'), {
          minLength: 1,
          maxLength: 3,
        }),
        async (domain, allowedPaths) => {
          // Setup: Create robots.txt that allows these paths
          const robotsTxtContent = `User-agent: *\nDisallow: /admin\nDisallow: /private`;

          const createMockHtml = (links: string[]) => {
            const linkTags = links.map((link) => `<a href="${link}">Link</a>`).join('\n');
            return `<html><body>${linkTags}</body></html>`;
          };

          const baseUrl = `https://${domain}`;
          const startUrl = `${baseUrl}/`;
          const allowedLinks = allowedPaths.map((path) => `${baseUrl}${path}`);

          // Mock axios responses
          mockedAxios.create = jest.fn().mockReturnValue({
            get: jest.fn().mockImplementation((url: string) => {
              if (url.endsWith('/robots.txt')) {
                return Promise.resolve({
                  data: robotsTxtContent,
                  status: 200,
                  headers: { 'content-type': 'text/plain' },
                });
              }

              return Promise.resolve({
                data: createMockHtml(allowedLinks),
                status: 200,
                headers: { 'content-type': 'text/html' },
              });
            }),
          } as any);

          // Execute: Run crawler
          const crawler = new Crawler({
            maxDepth: 1,
            maxRequests: 50,
            respectRobotsTxt: true,
            delayBetweenRequests: 0,
          });

          const results = await crawler.crawl(startUrl);

          // Verify: At least the start URL should be visited
          // (allowed URLs should not be blocked)
          return results.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **يتحقق من: المتطلبات 1.6**
   * 
   * Property: When respectRobotsTxt is false, crawler ignores robots.txt
   * 
   * For any robots.txt configuration:
   * - When respectRobotsTxt is disabled
   * - Then the crawler should not be restricted by robots.txt rules
   */
  test('property: crawler ignores robots.txt when respectRobotsTxt is false', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.domain(),
        fc.array(fc.constantFrom('/admin', '/private', '/api'), {
          minLength: 1,
          maxLength: 3,
        }),
        async (domain, disallowedPaths) => {
          // Setup: Create strict robots.txt
          const robotsTxtContent = `User-agent: *\n${disallowedPaths
            .map((path) => `Disallow: ${path}`)
            .join('\n')}`;

          const createMockHtml = (links: string[]) => {
            const linkTags = links.map((link) => `<a href="${link}">Link</a>`).join('\n');
            return `<html><body>${linkTags}</body></html>`;
          };

          const baseUrl = `https://${domain}`;
          const startUrl = `${baseUrl}/`;
          const allLinks = disallowedPaths.map((path) => `${baseUrl}${path}`);

          // Mock axios responses
          mockedAxios.create = jest.fn().mockReturnValue({
            get: jest.fn().mockImplementation((url: string) => {
              if (url.endsWith('/robots.txt')) {
                return Promise.resolve({
                  data: robotsTxtContent,
                  status: 200,
                  headers: { 'content-type': 'text/plain' },
                });
              }

              return Promise.resolve({
                data: createMockHtml(allLinks),
                status: 200,
                headers: { 'content-type': 'text/html' },
              });
            }),
          } as any);

          // Execute: Run crawler with respectRobotsTxt disabled
          const crawler = new Crawler({
            maxDepth: 1,
            maxRequests: 50,
            respectRobotsTxt: false, // Disabled
            delayBetweenRequests: 0,
          });

          const results = await crawler.crawl(startUrl);

          // Verify: Crawler should visit pages regardless of robots.txt
          // (at least the start page should be visited)
          return results.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **يتحقق من: المتطلبات 1.6**
   * 
   * Property: Crawler handles missing robots.txt gracefully
   * 
   * For any domain without robots.txt:
   * - When respectRobotsTxt is enabled
   * - Then the crawler should proceed normally (allow all)
   */
  test('property: crawler allows all URLs when robots.txt is missing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.domain(),
        fc.array(fc.constantFrom('/page1', '/page2', '/page3'), {
          minLength: 1,
          maxLength: 3,
        }),
        async (domain, paths) => {
          const createMockHtml = (links: string[]) => {
            const linkTags = links.map((link) => `<a href="${link}">Link</a>`).join('\n');
            return `<html><body>${linkTags}</body></html>`;
          };

          const baseUrl = `https://${domain}`;
          const startUrl = `${baseUrl}/`;
          const allLinks = paths.map((path) => `${baseUrl}${path}`);

          // Mock axios responses
          mockedAxios.create = jest.fn().mockReturnValue({
            get: jest.fn().mockImplementation((url: string) => {
              // Simulate missing robots.txt (404 error)
              if (url.endsWith('/robots.txt')) {
                return Promise.reject({
                  response: { status: 404 },
                  message: 'Not Found',
                });
              }

              return Promise.resolve({
                data: createMockHtml(allLinks),
                status: 200,
                headers: { 'content-type': 'text/html' },
              });
            }),
          } as any);

          // Execute: Run crawler
          const crawler = new Crawler({
            maxDepth: 1,
            maxRequests: 50,
            respectRobotsTxt: true,
            delayBetweenRequests: 0,
          });

          const results = await crawler.crawl(startUrl);

          // Verify: Crawler should work normally when robots.txt is missing
          return results.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});
