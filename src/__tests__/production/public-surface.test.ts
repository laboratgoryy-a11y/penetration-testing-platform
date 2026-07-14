import fs from 'fs';
import path from 'path';

describe('public production surface', () => {
  const publicDir = path.resolve(__dirname, '../../../public');
  const bannedFiles = [
    'clear-cache-and-test.html',
    'clear-cache.html',
    'clear-storage.html',
    'demo.html',
    'reset-and-test.html',
    'start-faraa-scan.html',
    'test-database.html',
    'test-faraa-net.html',
    'test-login-simple.html',
    'test-network-analyzer.html',
    'test-network-fix.html',
    'ui-enhancements-demo.html',
  ];

  it('does not ship demo and test-only public pages', () => {
    for (const fileName of bannedFiles) {
      expect(fs.existsSync(path.join(publicDir, fileName))).toBe(false);
    }
  });
});
