import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

describe('WirelessAssessmentProvider', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('discovers access points from the native Windows WLAN command and uploads a discovery artifact', async () => {
    const { spawn } = require('child_process');
    const netshOutput = `
Interface name : Wi-Fi
There are 2 networks currently visible.

SSID 1 : GuestNet
    Network type            : Infrastructure
    Authentication          : Open
    Encryption              : None
    BSSID 1                 : aa:bb:cc:dd:ee:ff
         Signal             : 88%
         Radio type         : 802.11n
         Channel            : 6

SSID 2 : CorpSecure
    Network type            : Infrastructure
    Authentication          : WPA2-Personal
    Encryption              : CCMP
    BSSID 1                 : 11:22:33:44:55:66
         Signal             : 70%
         Radio type         : 802.11ac
         Channel            : 36
`;

    spawn.mockImplementation(() => {
      const child = new EventEmitter() as EventEmitter & {
        stdout: PassThrough;
        stderr: PassThrough;
      };
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.stdout.end(netshOutput);
      child.stderr.end('');
      child.stdout.on('end', () => {
        child.emit('close', 0);
      });
      return child;
    });

    const { WirelessAssessmentProvider } = require('../../runner/WirelessAssessmentProvider');
    const uploadArtifact = jest.fn().mockResolvedValue(undefined);
    const appendLog = jest.fn().mockResolvedValue(undefined);

    const provider = new WirelessAssessmentProvider('win32');
    const result = await provider.execute({
      job: {
        id: 'job-wireless-1',
        jobType: 'WIRELESS_DISCOVERY',
        payload: {
          interface: 'Wi-Fi',
        },
      },
      appendLog,
      uploadArtifact,
    });

    expect(spawn).toHaveBeenCalledWith('netsh', ['wlan', 'show', 'networks', 'mode=bssid']);
    expect(result.summary).toEqual(
      expect.objectContaining({
        totalAccessPoints: 2,
        accessPoints: expect.arrayContaining([
          expect.objectContaining({
            ssid: 'GuestNet',
            bssid: 'aa:bb:cc:dd:ee:ff',
            security: 'OPEN',
            channel: 6,
          }),
          expect.objectContaining({
            ssid: 'CorpSecure',
            bssid: '11:22:33:44:55:66',
            security: 'WPA2',
            channel: 36,
          }),
        ]),
      })
    );
    expect(uploadArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactType: 'SCAN_RESULTS',
        fileName: 'wireless-discovery-job-wireless-1.json',
        contentType: 'application/json',
      })
    );
  });

  it('assesses a targeted wireless network with evidence-based findings and uploads a real artifact', async () => {
    const { spawn } = require('child_process');
    const netshOutput = `
Interface name : Wi-Fi
There is 1 network currently visible.

SSID 1 : LegacyLab
    Network type            : Infrastructure
    Authentication          : Open
    Encryption              : WEP
    BSSID 1                 : 00:11:22:33:44:55
         Signal             : 45%
         Radio type         : 802.11g
         Channel            : 11
`;

    spawn.mockImplementation(() => {
      const child = new EventEmitter() as EventEmitter & {
        stdout: PassThrough;
        stderr: PassThrough;
      };
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.stdout.end(netshOutput);
      child.stderr.end('');
      child.stdout.on('end', () => {
        child.emit('close', 0);
      });
      return child;
    });

    const { WirelessAssessmentProvider } = require('../../runner/WirelessAssessmentProvider');
    const uploadArtifact = jest.fn().mockResolvedValue(undefined);
    const appendLog = jest.fn().mockResolvedValue(undefined);

    const provider = new WirelessAssessmentProvider('win32');
    const result = await provider.execute({
      job: {
        id: 'job-wireless-2',
        jobType: 'WIRELESS_ASSESSMENT',
        payload: {
          target: {
            ssid: 'LegacyLab',
            bssid: '00:11:22:33:44:55',
            },
            config: {
              testTypes: ['TRAFFIC_ANALYSIS'],
            },
          },
        },
      appendLog,
      uploadArtifact,
    });

    expect(result.summary).toEqual(
      expect.objectContaining({
        targetSsid: 'LegacyLab',
        findingCount: 1,
        findings: expect.arrayContaining([
          expect.objectContaining({
            type: 'WEAK_ENCRYPTION',
            confidence: 'high',
            evidence: expect.arrayContaining([
              expect.objectContaining({
                type: 'observation',
              }),
            ]),
          }),
        ]),
      })
    );
    expect(uploadArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactType: 'SCAN_RESULTS',
        fileName: 'wireless-assessment-job-wireless-2.json',
        contentType: 'application/json',
      })
    );
  });

  it('marks advanced requested wireless tests as needing runtime requirements instead of pretending to execute them', async () => {
    const { spawn } = require('child_process');
    const netshOutput = `
Interface name : Wi-Fi
There is 1 network currently visible.

SSID 1 : CorpSecure
    Authentication          : WPA2-Personal
    Encryption              : CCMP
    BSSID 1                 : 00:11:22:33:44:55
         Signal             : 45%
         Channel            : 11
`;

    spawn.mockImplementation(() => {
      const child = new EventEmitter() as EventEmitter & {
        stdout: PassThrough;
        stderr: PassThrough;
      };
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.stdout.end(netshOutput);
      child.stderr.end('');
      child.stdout.on('end', () => {
        child.emit('close', 0);
      });
      return child;
    });

    const { WirelessAssessmentProvider } = require('../../runner/WirelessAssessmentProvider');
    const provider = new WirelessAssessmentProvider('win32');

    const appendLog = jest.fn().mockResolvedValue(undefined);
    const result = await provider.execute({
      job: {
        id: 'job-wireless-3',
        jobType: 'WIRELESS_ASSESSMENT',
        payload: {
          target: {
            ssid: 'CorpSecure',
            bssid: '00:11:22:33:44:55',
          },
          config: {
            testTypes: ['TRAFFIC_ANALYSIS', 'DEAUTH_ATTACK'],
          },
        },
      },
      appendLog,
      uploadArtifact: jest.fn().mockResolvedValue(undefined),
    });

    expect(result.summary?.testExecutionStatus).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'TRAFFIC_ANALYSIS',
          status: 'executed',
        }),
        expect.objectContaining({
          id: 'DEAUTH_ATTACK',
          status: 'needs_requirements',
        }),
      ])
    );
    expect(appendLog).toHaveBeenCalledWith(
      'warning',
      expect.stringContaining('require additional runtime prerequisites'),
      expect.objectContaining({
        deferredTestTypes: ['DEAUTH_ATTACK'],
      })
    );
  });
});
