import {
  getUnsupportedReason,
  supportsJob,
  type RunnerCapabilityManifest,
  type QueuedJob,
} from '../../core/runners/capabilityMatcher';

describe('supportsJob', () => {
  const manifest: RunnerCapabilityManifest = {
    os: 'windows',
    capabilities: ['WEB_SCAN', 'IP_SCAN', 'PHISHING_DISPATCH'],
    tools: ['nmap'],
  };

  it('accepts a job when the runner advertises all required capabilities', () => {
    const job: QueuedJob = {
      id: 'job-1',
      jobType: 'IP_SCAN',
      requiredOs: null,
      requiredCapabilities: ['IP_SCAN'],
      requiredTools: ['nmap'],
    };

    expect(supportsJob(manifest, job)).toBe(true);
    expect(getUnsupportedReason(manifest, job)).toBeNull();
  });

  it('rejects a job when the runner OS does not match the requirement', () => {
    const job: QueuedJob = {
      id: 'job-2',
      jobType: 'WIRELESS_ASSESSMENT',
      requiredOs: 'linux',
      requiredCapabilities: ['WIRELESS_ASSESSMENT'],
      requiredTools: ['aircrack-ng'],
    };

    expect(supportsJob(manifest, job)).toBe(false);
    expect(getUnsupportedReason(manifest, job)).toMatch(/operating system/i);
  });

  it('rejects a job when a tool is missing', () => {
    const job: QueuedJob = {
      id: 'job-3',
      jobType: 'WEB_SCAN',
      requiredOs: 'windows',
      requiredCapabilities: ['WEB_SCAN'],
      requiredTools: ['curl'],
    };

    expect(supportsJob(manifest, job)).toBe(false);
    expect(getUnsupportedReason(manifest, job)).toMatch(/tool/i);
  });
});
