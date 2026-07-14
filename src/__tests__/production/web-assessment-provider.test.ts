import http from 'http';

describe('WebAssessmentProvider', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/about') {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
        });
        res.end(`
          <html>
            <body>
              <h1>About</h1>
              <form action="/submit" method="post">
                <input type="text" name="email" />
              </form>
            </body>
          </html>
        `);
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
      });
      res.end(`
        <html>
          <body>
            <h1>Home</h1>
            <a href="/about">About</a>
          </body>
        </html>
      `);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to start test server');
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it('crawls a target, produces evidence-based findings, and uploads a scan artifact', async () => {
    const { WebAssessmentProvider } = require('../../runner/WebAssessmentProvider');
    const uploadArtifact = jest.fn().mockResolvedValue(undefined);
    const appendLog = jest.fn().mockResolvedValue(undefined);

    const provider = new WebAssessmentProvider();
    const result = await provider.execute({
      job: {
        id: 'job-1',
        jobType: 'WEB_SCAN',
        payload: {
          target: {
            url: baseUrl,
          },
          config: {
            maxDepth: 1,
            maxRequests: 5,
          },
        },
      },
      appendLog,
      uploadArtifact,
    });

    expect(result.summary).toEqual(
      expect.objectContaining({
        urlsScanned: 2,
        totalRequests: 2,
      })
    );
    expect(result.summary.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'MISSING_SECURITY_HEADER',
          confidence: 'high',
          evidence: expect.arrayContaining([
            expect.objectContaining({
              type: 'http_response',
            }),
          ]),
        }),
      ])
    );
    expect(uploadArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactType: 'SCAN_RESULTS',
        contentType: 'application/json',
        fileName: 'web-scan-job-1.json',
      })
    );
  });
});
