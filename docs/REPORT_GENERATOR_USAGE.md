# Report Generator Usage Guide

## Overview

The ReportGenerator service provides comprehensive reporting capabilities for all penetration testing operations. It supports multiple output formats (PDF, HTML, JSON, CSV) and automatically stores reports in both the database and filesystem.

## Features

- **Multiple Report Types**: Web scans, phishing campaigns, network analysis, and compliance reports
- **Multiple Formats**: PDF, HTML, JSON, and CSV
- **Comprehensive Content**: Includes executive summaries, detailed findings, statistics, and remediation recommendations
- **Automatic Storage**: Reports are saved to both database and filesystem
- **Report Management**: List, retrieve, and delete reports

## Installation

The ReportGenerator is already included in the services. Import it as follows:

```typescript
import { ReportGenerator } from './services/ReportGenerator';
import { Pool } from 'pg';

const db = new Pool({ /* database config */ });
const reportGenerator = new ReportGenerator(db, './reports');
```

## Usage Examples

### 1. Generate Web Scan Report

```typescript
const metadata = {
  title: 'Web Application Security Assessment',
  author: 'Security Team',
  organization: 'ACME Corp',
  confidentialityLevel: 'CONFIDENTIAL' as const,
};

// Generate PDF report
const pdfReport = await reportGenerator.generateWebScanReport(
  'scan-session-id',
  'PDF',
  metadata
);

// Generate HTML report
const htmlReport = await reportGenerator.generateWebScanReport(
  'scan-session-id',
  'HTML',
  metadata
);

// Generate JSON report for API consumption
const jsonReport = await reportGenerator.generateWebScanReport(
  'scan-session-id',
  'JSON',
  metadata
);

// Generate CSV for data analysis
const csvReport = await reportGenerator.generateWebScanReport(
  'scan-session-id',
  'CSV',
  metadata
);
```

### 2. Generate Phishing Campaign Report

```typescript
const metadata = {
  title: 'Q1 2024 Security Awareness Campaign',
  author: 'Security Team',
  organization: 'ACME Corp',
  confidentialityLevel: 'INTERNAL' as const,
};

const report = await reportGenerator.generatePhishingReport(
  'campaign-id',
  'PDF',
  metadata
);

console.log(`Report generated: ${report.id}`);
```

### 3. Generate Network Analysis Report

```typescript
const metadata = {
  title: 'Wireless Network Security Assessment',
  author: 'Network Security Team',
  organization: 'ACME Corp',
  confidentialityLevel: 'RESTRICTED' as const,
};

const report = await reportGenerator.generateNetworkReport(
  'network-session-id',
  'HTML',
  metadata
);
```

### 4. Generate Compliance Report

```typescript
const metadata = {
  title: 'Monthly Compliance Report - January 2024',
  author: 'Compliance Officer',
  organization: 'ACME Corp',
  confidentialityLevel: 'RESTRICTED' as const,
};

const startDate = new Date('2024-01-01');
const endDate = new Date('2024-01-31');

const report = await reportGenerator.generateComplianceReport(
  startDate,
  endDate,
  'PDF',
  metadata
);
```

## Report Management

### Retrieve a Report

```typescript
const report = await reportGenerator.getReport('report-id');

if (report) {
  console.log(`Report type: ${report.type}`);
  console.log(`Format: ${report.format}`);
  console.log(`Generated: ${report.generatedAt}`);
  
  // Access content
  if (Buffer.isBuffer(report.content)) {
    // PDF content
    fs.writeFileSync('output.pdf', report.content);
  } else {
    // HTML, JSON, or CSV content
    fs.writeFileSync('output.html', report.content);
  }
}
```

### List Reports

```typescript
// List all reports
const allReports = await reportGenerator.listReports();

// List reports by type
const webScanReports = await reportGenerator.listReports('WEB_SCAN');

// List reports within date range
const recentReports = await reportGenerator.listReports(
  undefined,
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

// List specific type within date range
const complianceReports = await reportGenerator.listReports(
  'COMPLIANCE',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

### Delete a Report

```typescript
await reportGenerator.deleteReport('report-id');
console.log('Report deleted successfully');
```

## Report Content

### Web Scan Report Includes:

- **Executive Summary**: Target URL, scan duration, total requests, vulnerability count
- **Vulnerability Summary**: Count by severity (Critical, High, Medium, Low)
- **Detailed Findings**: For each vulnerability:
  - Type (SQL Injection, XSS, CSRF, etc.)
  - Severity level
  - Location (URL/endpoint)
  - Description
  - Evidence
  - Remediation recommendations
  - CVSS score (if available)

### Phishing Campaign Report Includes:

- **Campaign Summary**: Name, duration, target count
- **Interaction Statistics**: 
  - Emails opened (count and percentage)
  - Links clicked (count and percentage)
  - Credentials entered (count and percentage)
- **Risk Analysis**: Targets categorized by risk level (High, Medium, Low)
- **Target Interactions**: Detailed interaction log for each target

### Network Analysis Report Includes:

- **Network Summary**: SSID, BSSID, test duration
- **Vulnerabilities**: Network security weaknesses found
- **Connected Devices**: MAC addresses, IP addresses, hostnames, vendors
- **Traffic Analysis**: Protocol usage, insecure protocols detected

### Compliance Report Includes:

- **Compliance Summary**: Total operations, authorized vs unauthorized
- **Operations Log**: Complete audit trail with:
  - Operation type
  - Timestamp
  - User ID
  - Target
  - Authorization status
  - Result

## Format Comparison

| Format | Best For | File Size | Human Readable | Machine Readable |
|--------|----------|-----------|----------------|------------------|
| PDF | Official reports, archiving | Large | ✓ | ✗ |
| HTML | Web viewing, sharing | Medium | ✓ | ✓ |
| JSON | API integration, automation | Small | ✗ | ✓ |
| CSV | Data analysis, spreadsheets | Small | ✓ | ✓ |

## Error Handling

```typescript
try {
  const report = await reportGenerator.generateWebScanReport(
    'session-id',
    'PDF',
    metadata
  );
  console.log('Report generated successfully');
} catch (error) {
  if (error.message.includes('not found')) {
    console.error('Session not found');
  } else if (error.message.includes('Unsupported format')) {
    console.error('Invalid format specified');
  } else {
    console.error('Report generation failed:', error);
  }
}
```

## Best Practices

1. **Choose the Right Format**:
   - Use PDF for official reports and long-term archiving
   - Use HTML for quick viewing and sharing
   - Use JSON for API integration and automation
   - Use CSV for data analysis in spreadsheets

2. **Set Appropriate Confidentiality Levels**:
   - PUBLIC: General information, no sensitive data
   - INTERNAL: For internal use only
   - CONFIDENTIAL: Sensitive security information
   - RESTRICTED: Highly sensitive, limited access

3. **Regular Cleanup**:
   - Implement a retention policy for old reports
   - Delete reports that are no longer needed
   - Archive important reports to long-term storage

4. **Metadata Management**:
   - Always provide complete metadata
   - Use consistent naming conventions
   - Include the author and organization information

## Integration with Other Services

### With Web Scanner

```typescript
const scanner = new WebScanner(db, authManager);
const session = await scanner.startScan(userId, target, config);

// Wait for scan to complete
await waitForCompletion(session.sessionId);

// Generate report
const report = await reportGenerator.generateWebScanReport(
  session.sessionId,
  'PDF',
  metadata
);
```

### With Phishing Engine

```typescript
const phishingEngine = new PhishingEngine(db, encryptionService);
const campaignId = await phishingEngine.createCampaign(userId, campaign);
await phishingEngine.launchCampaign(campaignId);

// After campaign completion
await phishingEngine.completeCampaign(campaignId);

// Generate report
const report = await reportGenerator.generatePhishingReport(
  campaignId,
  'HTML',
  metadata
);
```

## Database Schema

The ReportGenerator uses the `reports` table:

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  format VARCHAR(20) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  metadata JSONB,
  generated_by UUID REFERENCES users(id),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);
```

## File Storage

Reports are stored in the configured reports directory (default: `./reports`):

```
./reports/
  ├── report-uuid-1.pdf
  ├── report-uuid-2.html
  ├── report-uuid-3.json
  └── report-uuid-4.csv
```

## Security Considerations

1. **Access Control**: Implement proper authorization checks before generating or accessing reports
2. **Data Sanitization**: All user input is sanitized before inclusion in reports
3. **Confidentiality**: Reports contain sensitive security information and should be protected
4. **Audit Trail**: All report generation is logged for compliance purposes
5. **Secure Storage**: Report files should be stored with appropriate file permissions

## Troubleshooting

### Report Generation Fails

- Verify the session/campaign ID exists
- Check database connectivity
- Ensure the reports directory is writable
- Verify all required data is present

### Missing Content in Reports

- Check that the scan/campaign completed successfully
- Verify vulnerabilities/interactions were recorded
- Review database queries for data retrieval

### File System Errors

- Ensure the reports directory exists and is writable
- Check disk space availability
- Verify file permissions

## Support

For issues or questions about the ReportGenerator:
- Check the test file: `src/__tests__/report-generator.test.ts`
- Review the source code: `src/services/ReportGenerator.ts`
- Consult the design document: `.kiro/specs/penetration-testing-platform/design.md`
