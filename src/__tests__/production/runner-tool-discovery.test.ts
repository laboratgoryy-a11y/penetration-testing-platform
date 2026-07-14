describe('runner tool discovery', () => {
  const originalEmailEnv = {
    SMTP_HOST: process.env.SMTP_HOST,
    EMAIL_FROM_EMAIL: process.env.EMAIL_FROM_EMAIL,
  };

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    if (originalEmailEnv.SMTP_HOST === undefined) {
      delete process.env.SMTP_HOST;
    } else {
      process.env.SMTP_HOST = originalEmailEnv.SMTP_HOST;
    }

    if (originalEmailEnv.EMAIL_FROM_EMAIL === undefined) {
      delete process.env.EMAIL_FROM_EMAIL;
    } else {
      process.env.EMAIL_FROM_EMAIL = originalEmailEnv.EMAIL_FROM_EMAIL;
    }
  });

  it('adds nmap and IP_SCAN when nmap is available on the runner host', () => {
    jest.doMock('child_process', () => ({
      spawnSync: jest.fn().mockReturnValue({
        status: 0,
        error: null,
      }),
    }));

    let tooling: typeof import('../../runner/tooling') | undefined;
    jest.isolateModules(() => {
      tooling = require('../../runner/tooling');
    });

    expect(tooling).toBeDefined();
    const tools = tooling!.discoverRunnerTools([]);
    const capabilities = tooling!.discoverRunnerCapabilities([], tools);

    expect(tools).toContain('nmap');
    expect(capabilities).toContain('IP_SCAN');
  });

  it('adds phishing dispatch when SMTP delivery is configured', () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.EMAIL_FROM_EMAIL = 'security@example.com';

    jest.doMock('child_process', () => ({
      spawnSync: jest.fn().mockReturnValue({
        status: 1,
        error: new Error('missing'),
      }),
    }));

    let tooling: typeof import('../../runner/tooling') | undefined;
    jest.isolateModules(() => {
      tooling = require('../../runner/tooling');
    });

    const tools = tooling!.discoverRunnerTools([]);
    const capabilities = tooling!.discoverRunnerCapabilities([], tools);

    expect(capabilities).toContain('PHISHING_DISPATCH');
  });

  it('adds wireless assessment capability when native Windows WLAN tooling is available', () => {
    jest.doMock('child_process', () => ({
      spawnSync: jest.fn((command: string) => {
        if (command === 'netsh') {
          return {
            status: 0,
            error: null,
          };
        }

        return {
          status: 1,
          error: new Error('missing'),
        };
      }),
    }));

    let tooling: typeof import('../../runner/tooling') | undefined;
    jest.isolateModules(() => {
      tooling = require('../../runner/tooling');
    });

    const tools = tooling!.discoverRunnerTools([], 'win32');
    const capabilities = tooling!.discoverRunnerCapabilities([], tools);

    expect(tools).toContain('netsh-wlan');
    expect(capabilities).toContain('WIRELESS_ASSESSMENT');
  });
});
