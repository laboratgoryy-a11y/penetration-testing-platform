import fs from 'fs';
import path from 'path';

describe('reports frontend contract', () => {
  it('downloads reports directly instead of showing a placeholder message', () => {
    const filePath = path.resolve(__dirname, '../../../public/js/reports.js');
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).not.toContain('تنزيله المباشر لم يُفعّل بعد');
    expect(source).toContain('this.apiClient.downloadReport(reportId, format)');
  });
});
