import fs from 'fs';
import path from 'path';

function collectFiles(directory: string, extension: string): string[] {
  return fs
    .readdirSync(directory, {
      withFileTypes: true,
    })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectFiles(entryPath, extension);
      }

      return entry.isFile() && entry.name.endsWith(extension) ? [entryPath] : [];
    });
}

describe('runtime logging contract', () => {
  it('does not leave console.log debug statements in production runtime paths', () => {
    const files = [
      path.resolve(__dirname, '../../index.ts'),
      path.resolve(__dirname, '../../runner/index.ts'),
      ...collectFiles(path.resolve(__dirname, '../../../public/js'), '.js'),
      ...collectFiles(path.resolve(__dirname, '../../../public'), '.html'),
    ];

    for (const filePath of files) {
      const source = fs.readFileSync(filePath, 'utf8');
      expect(source).not.toContain('console.log(');
    }
  });
});
