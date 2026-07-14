describe('runner built-in capabilities', () => {
  const originalCapabilities = process.env.RUNNER_CAPABILITIES;
  const originalControlPlaneUrl = process.env.CONTROL_PLANE_URL;

  afterEach(() => {
    if (originalCapabilities === undefined) {
      delete process.env.RUNNER_CAPABILITIES;
    } else {
      process.env.RUNNER_CAPABILITIES = originalCapabilities;
    }

    if (originalControlPlaneUrl === undefined) {
      delete process.env.CONTROL_PLANE_URL;
    } else {
      process.env.CONTROL_PLANE_URL = originalControlPlaneUrl;
    }
  });

  it('advertises report generation as a built-in runner capability', () => {
    jest.resetModules();
    jest.dontMock('child_process');
    process.env.RUNNER_CAPABILITIES = '';
    const { buildManifest } = require('../../runner/index');

    const manifest = buildManifest();

    expect(manifest.capabilities).toContain('REPORT_GENERATION');
    expect(manifest.capabilities).toContain('WEB_SCAN');
  });

  it('does not allow a non-test runner to start without an explicit control plane URL', async () => {
    jest.resetModules();
    jest.dontMock('child_process');
    const previousNodeEnv = process.env.NODE_ENV;
    delete process.env.CONTROL_PLANE_URL;
    process.env.NODE_ENV = 'development';

    const { RunnerAgent } = require('../../runner/index');

    await expect(new RunnerAgent().start()).rejects.toThrow(
      /CONTROL_PLANE_URL must be configured/i
    );

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
