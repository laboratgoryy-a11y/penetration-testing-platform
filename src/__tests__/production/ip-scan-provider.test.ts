import { PassThrough } from 'stream';
import { EventEmitter } from 'events';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

describe('IpScanProvider', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('runs nmap, parses XML results, and uploads a real scan artifact', async () => {
    const { spawn } = require('child_process');
    const xmlOutput = `
      <nmaprun>
        <host>
          <status state="up" />
          <address addr="127.0.0.1" addrtype="ipv4" />
          <hostnames>
            <hostname name="localhost" />
          </hostnames>
          <ports>
            <port protocol="tcp" portid="80">
              <state state="open" />
              <service name="http" product="nginx" version="1.24.0" />
              <script id="vuln-test" output="Potential HTTP weakness detected" />
            </port>
          </ports>
          <os>
            <osmatch name="Linux 5.x" accuracy="98" />
          </os>
        </host>
      </nmaprun>
    `;

    spawn.mockImplementation(() => {
      const child = new EventEmitter() as EventEmitter & {
        stdout: PassThrough;
        stderr: PassThrough;
      };
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.stdout.end(xmlOutput);
      child.stderr.end('');
      child.stdout.on('end', () => {
        child.emit('close', 0);
      });
      return child;
    });

    const { IpScanProvider } = require('../../runner/IpScanProvider');
    const uploadArtifact = jest.fn().mockResolvedValue(undefined);
    const appendLog = jest.fn().mockResolvedValue(undefined);

    const provider = new IpScanProvider();
    const result = await provider.execute({
      job: {
        id: 'job-ip-1',
        jobType: 'IP_SCAN',
        payload: {
          target: {
            value: '127.0.0.1',
            type: 'ip',
          },
          config: {
            ports: '80',
          },
        },
      },
      appendLog,
      uploadArtifact,
    });

    expect(spawn).toHaveBeenCalled();
    expect(result.summary).toEqual(
      expect.objectContaining({
        totalHosts: 1,
      })
    );
    expect(result.summary.hosts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ip_address: '127.0.0.1',
          hostname: 'localhost',
          status: 'up',
        }),
      ])
    );
    expect(result.summary.ports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ip_address: '127.0.0.1',
          port: 80,
          service_name: 'http',
          state: 'open',
        }),
      ])
    );
    expect(result.summary.vulnerabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'vuln-test',
          confidence: 'medium',
        }),
      ])
    );
    expect(uploadArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactType: 'SCAN_RESULTS',
        fileName: 'ip-scan-job-ip-1.json',
        contentType: 'application/json',
      })
    );
  });
});
