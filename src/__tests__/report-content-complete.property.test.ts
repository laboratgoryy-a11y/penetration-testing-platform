import * as fc from 'fast-check';
import { Pool } from 'pg';
import { 
  ReportGenerator, 
  ReportFormat, 
  ReportMetadata
} from '../services/ReportGenerator';
import * as fs from 'fs';

/**
 * اختبار خاصية لمحتوى التقرير الكامل
 * 
 * **الخاصية 12: محتوى التقرير الكامل**
 * **يتحقق من: المتطلبات 2.2**
 * 
 * الخاصية: لأي تقرير ثغرات، يجب أن يحتوي على:
 * - وصف كل ثغرة
 * - مستوى الخطورة
 * - خطوات إعادة الإنتاج (الموقع)
 * - توصيات الإصلاح
 * 
 * Property: For any vulnerability report, it must contain:
 * - Description of each vulnerability
 * - Severity level
 * - Reproduction steps (location)
 * - Remediation recommendations
 */

// Mock fs module
jest.mock('fs');

describe('Property Test: محتوى التقرير الكامل', () => {
  beforeEach(() => {
    // Setup mock filesystem
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation();
    (fs.writeFileSync as jest.Mock).mockImplementation();
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test content'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 2.2**
   * 
   * Property: All vulnerability reports contain complete information
   * 
   * For any vulnerability report:
   * - WHEN a report is generated for vulnerabilities
   * - THEN each vulnerability MUST have a description
   * - AND each vulnerability MUST have a severity level
   * - AND each vulnerability MUST have reproduction steps (location)
   * - AND each vulnerability MUST have remediation recommendations
   */
  test('property: vulnerability reports contain complete information for all vulnerabilities', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary vulnerability data
        fc.record({
          sessionId: fc.uuid(),
          target: fc.webUrl(),
          totalRequests: fc.integer({ min: 1, max: 1000 }),
          vulnerabilities: fc.array(
            fc.record({
              type: fc.constantFrom('SQL_INJECTION', 'XSS', 'CSRF', 'DIRECTORY_TRAVERSAL', 'COMMAND_INJECTION'),
              severity: fc.constantFrom('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
              location: fc.webUrl(),
              description: fc.string({ minLength: 20, maxLength: 200 }),
              evidence: fc.string({ minLength: 10, maxLength: 100 }),
              remediation: fc.string({ minLength: 20, maxLength: 200 }),
              cvssScore: fc.option(fc.float({ min: 0, max: 10, noNaN: true }), { nil: undefined }),
            }),
            { minLength: 1, maxLength: 15 } // At least 1 vulnerability to test
          ),
        }),
        // Test with text-based formats that we can inspect
        fc.constantFrom('HTML', 'JSON', 'CSV') as fc.Arbitrary<ReportFormat>,
        async (scanData, format) => {
          // Setup: Create mock database
          const mockDb = {
            query: jest.fn().mockImplementation((query: string, _params?: any[]) => {
              if (query.includes('scan_sessions')) {
                return Promise.resolve({
                  rows: [{
                    id: scanData.sessionId,
                    target_url: scanData.target,
                    started_at: new Date('2024-01-01T10:00:00Z'),
                    completed_at: new Date('2024-01-01T12:00:00Z'),
                    total_requests: scanData.totalRequests,
                  }],
                });
              }
              if (query.includes('vulnerabilities')) {
                return Promise.resolve({
                  rows: scanData.vulnerabilities.map(v => ({
                    type: v.type,
                    severity: v.severity,
                    location: v.location,
                    description: v.description,
                    evidence: v.evidence,
                    remediation: v.remediation,
                    cvss_score: v.cvssScore,
                  })),
                });
              }
              if (query.includes('INSERT INTO reports')) {
                return Promise.resolve({ rows: [] });
              }
              return Promise.resolve({ rows: [] });
            }),
          } as unknown as Pool;

          const metadata: ReportMetadata = {
            title: 'Vulnerability Report',
            author: 'Security Analyst',
            organization: 'Test Organization',
            confidentialityLevel: 'CONFIDENTIAL',
          };

          // Execute: Generate report
          const reportGenerator = new ReportGenerator(mockDb, './test-reports');
          const report = await reportGenerator.generateWebScanReport(
            scanData.sessionId,
            format,
            metadata
          );

          // Property checks: Report must contain complete information for ALL vulnerabilities
          
          // 1. Report must be generated
          if (!report || !report.content) {
            return false;
          }

          const content = report.content.toString();

          // 2. For each vulnerability, verify all required fields are present in the report
          for (const vuln of scanData.vulnerabilities) {
            // Check 1: Description must be present
            if (!content.includes(vuln.description)) {
              console.log(`Missing description for ${vuln.type}: ${vuln.description}`);
              return false;
            }

            // Check 2: Severity level must be present
            if (!content.includes(vuln.severity)) {
              console.log(`Missing severity for ${vuln.type}: ${vuln.severity}`);
              return false;
            }

            // Check 3: Location (reproduction steps) must be present
            // For location, we need to check if the URL path is present
            // Extract the path from the location URL
            try {
              const locationUrl = new URL(vuln.location);
              const locationPath = locationUrl.pathname + locationUrl.search;
              
              // The report should contain either the full URL or at least the path
              if (!content.includes(vuln.location) && !content.includes(locationPath)) {
                console.log(`Missing location for ${vuln.type}: ${vuln.location}`);
                return false;
              }
            } catch (e) {
              // If location is not a valid URL, check for the string directly
              if (!content.includes(vuln.location)) {
                console.log(`Missing location for ${vuln.type}: ${vuln.location}`);
                return false;
              }
            }

            // Check 4: Remediation recommendations must be present
            if (!content.includes(vuln.remediation)) {
              console.log(`Missing remediation for ${vuln.type}: ${vuln.remediation}`);
              return false;
            }
          }

          // 3. Verify the report structure contains all vulnerability types
          for (const vuln of scanData.vulnerabilities) {
            if (!content.includes(vuln.type)) {
              console.log(`Missing vulnerability type: ${vuln.type}`);
              return false;
            }
          }

          // Property holds: All vulnerabilities have complete information
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.2**
   * 
   * Property: Reports include executive summary and statistics
   * 
   * For any vulnerability report with vulnerabilities:
   * - WHEN a report is generated
   * - THEN the report MUST include an executive summary
   * - AND the report MUST include total vulnerability count
   * - AND the report MUST include severity breakdown statistics
   */
  test('property: reports include executive summary and statistics', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary vulnerability data with at least some vulnerabilities
        fc.record({
          sessionId: fc.uuid(),
          target: fc.webUrl(),
          totalRequests: fc.integer({ min: 1, max: 1000 }),
          vulnerabilities: fc.array(
            fc.record({
              type: fc.constantFrom('SQL_INJECTION', 'XSS', 'CSRF', 'DIRECTORY_TRAVERSAL'),
              severity: fc.constantFrom('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
              location: fc.webUrl(),
              description: fc.string({ minLength: 20, maxLength: 200 }),
              evidence: fc.string({ minLength: 10, maxLength: 100 }),
              remediation: fc.string({ minLength: 20, maxLength: 200 }),
              cvssScore: fc.option(fc.float({ min: 0, max: 10, noNaN: true }), { nil: undefined }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
        }),
        fc.constantFrom('HTML', 'JSON') as fc.Arbitrary<ReportFormat>,
        async (scanData, format) => {
          // Setup: Create mock database
          const mockDb = {
            query: jest.fn().mockImplementation((query: string, _params?: any[]) => {
              if (query.includes('scan_sessions')) {
                return Promise.resolve({
                  rows: [{
                    id: scanData.sessionId,
                    target_url: scanData.target,
                    started_at: new Date('2024-01-01T10:00:00Z'),
                    completed_at: new Date('2024-01-01T12:00:00Z'),
                    total_requests: scanData.totalRequests,
                  }],
                });
              }
              if (query.includes('vulnerabilities')) {
                return Promise.resolve({
                  rows: scanData.vulnerabilities.map(v => ({
                    type: v.type,
                    severity: v.severity,
                    location: v.location,
                    description: v.description,
                    evidence: v.evidence,
                    remediation: v.remediation,
                    cvss_score: v.cvssScore,
                  })),
                });
              }
              if (query.includes('INSERT INTO reports')) {
                return Promise.resolve({ rows: [] });
              }
              return Promise.resolve({ rows: [] });
            }),
          } as unknown as Pool;

          const metadata: ReportMetadata = {
            title: 'Comprehensive Vulnerability Report',
            author: 'Security Team',
            organization: 'Test Corp',
            confidentialityLevel: 'CONFIDENTIAL',
          };

          // Execute: Generate report
          const reportGenerator = new ReportGenerator(mockDb, './test-reports');
          const report = await reportGenerator.generateWebScanReport(
            scanData.sessionId,
            format,
            metadata
          );

          if (!report || !report.content) {
            return false;
          }

          const content = report.content.toString();

          // Calculate expected statistics
          const totalVulns = scanData.vulnerabilities.length;
          const criticalCount = scanData.vulnerabilities.filter(v => v.severity === 'CRITICAL').length;

          // Property checks:
          
          // 1. Report must contain total vulnerability count
          if (!content.includes(totalVulns.toString())) {
            console.log(`Missing total vulnerability count: ${totalVulns}`);
            return false;
          }

          // 2. Report must contain severity breakdown
          // Check for critical count if there are critical vulnerabilities
          if (criticalCount > 0 && !content.includes(criticalCount.toString())) {
            console.log(`Missing critical count: ${criticalCount}`);
            return false;
          }

          // 3. Report must contain summary indicators
          // For HTML, check for summary-related keywords
          if (format === 'HTML') {
            const hasSummaryIndicator = 
              content.includes('ملخص') || 
              content.includes('summary') || 
              content.includes('Summary') ||
              content.includes('إحصائيات') ||
              content.includes('statistics');
            
            if (!hasSummaryIndicator) {
              console.log('Missing summary section indicator');
              return false;
            }
          }

          // 4. For JSON format, verify structure includes summary data
          if (format === 'JSON') {
            try {
              const parsed = JSON.parse(content);
              if (!parsed.summary || typeof parsed.summary.totalVulnerabilities !== 'number') {
                console.log('Missing or invalid summary structure in JSON');
                return false;
              }
            } catch (e) {
              console.log('Invalid JSON format');
              return false;
            }
          }

          // Property holds: Report includes summary and statistics
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.2**
   * 
   * Property: Reports include evidence for each vulnerability
   * 
   * For any vulnerability with evidence:
   * - WHEN a report is generated
   * - THEN the report MUST include the evidence for each vulnerability
   * - AND the evidence MUST be associated with the correct vulnerability
   */
  test('property: reports include evidence for each vulnerability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sessionId: fc.uuid(),
          target: fc.webUrl(),
          totalRequests: fc.integer({ min: 1, max: 500 }),
          vulnerabilities: fc.array(
            fc.record({
              type: fc.constantFrom('SQL_INJECTION', 'XSS', 'CSRF'),
              severity: fc.constantFrom('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
              location: fc.webUrl(),
              description: fc.string({ minLength: 20, maxLength: 150 }),
              // Ensure evidence is always present and meaningful
              evidence: fc.string({ minLength: 15, maxLength: 100 }),
              remediation: fc.string({ minLength: 20, maxLength: 150 }),
              cvssScore: fc.option(fc.float({ min: 0, max: 10, noNaN: true }), { nil: undefined }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        fc.constantFrom('HTML', 'JSON') as fc.Arbitrary<ReportFormat>,
        async (scanData, format) => {
          // Setup mock database
          const mockDb = {
            query: jest.fn().mockImplementation((query: string, _params?: any[]) => {
              if (query.includes('scan_sessions')) {
                return Promise.resolve({
                  rows: [{
                    id: scanData.sessionId,
                    target_url: scanData.target,
                    started_at: new Date('2024-01-01T10:00:00Z'),
                    completed_at: new Date('2024-01-01T12:00:00Z'),
                    total_requests: scanData.totalRequests,
                  }],
                });
              }
              if (query.includes('vulnerabilities')) {
                return Promise.resolve({
                  rows: scanData.vulnerabilities.map(v => ({
                    type: v.type,
                    severity: v.severity,
                    location: v.location,
                    description: v.description,
                    evidence: v.evidence,
                    remediation: v.remediation,
                    cvss_score: v.cvssScore,
                  })),
                });
              }
              if (query.includes('INSERT INTO reports')) {
                return Promise.resolve({ rows: [] });
              }
              return Promise.resolve({ rows: [] });
            }),
          } as unknown as Pool;

          const metadata: ReportMetadata = {
            title: 'Evidence Report',
            author: 'Analyst',
            organization: 'Security Org',
            confidentialityLevel: 'CONFIDENTIAL',
          };

          // Execute
          const reportGenerator = new ReportGenerator(mockDb, './test-reports');
          const report = await reportGenerator.generateWebScanReport(
            scanData.sessionId,
            format,
            metadata
          );

          if (!report || !report.content) {
            return false;
          }

          const content = report.content.toString();

          // Property check: Each vulnerability's evidence must be in the report
          for (const vuln of scanData.vulnerabilities) {
            if (!content.includes(vuln.evidence)) {
              console.log(`Missing evidence for ${vuln.type}: ${vuln.evidence}`);
              return false;
            }
          }

          // Property holds: All evidence is included
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
