jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      accepted: ['user@example.com'],
      rejected: [],
      messageId: 'message-1',
    }),
  }),
}));

describe('PhishingDispatchProvider', () => {
  const originalEnv = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    EMAIL_FROM_EMAIL: process.env.EMAIL_FROM_EMAIL,
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
  };

  beforeEach(() => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'mailer';
    process.env.SMTP_PASSWORD = 'secret';
    process.env.EMAIL_FROM_EMAIL = 'security@example.com';
    process.env.EMAIL_FROM_NAME = 'Security Team';
    jest.resetModules();
  });

  afterEach(() => {
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  it('sends campaign emails and uploads a delivery artifact', async () => {
    const { PhishingDispatchProvider } = require('../../runner/PhishingDispatchProvider');
    const uploadArtifact = jest.fn().mockResolvedValue(undefined);
    const appendLog = jest.fn().mockResolvedValue(undefined);

    const provider = new PhishingDispatchProvider();
    const result = await provider.execute({
      job: {
        id: 'job-phish-1',
        jobType: 'PHISHING_DISPATCH',
        payload: {
          campaignId: 'campaign-1',
          targets: [
            {
              email: 'user@example.com',
              name: 'User One',
            },
          ],
          emailTemplate: {
            subject: 'Security Awareness Check',
            html: '<p>Hello {{name}}</p>',
            text: 'Hello {{name}}',
          },
        },
      },
      appendLog,
      uploadArtifact,
    });

    expect(result.summary).toEqual(
      expect.objectContaining({
        totalTargets: 1,
        totalSent: 1,
        totalFailed: 0,
      })
    );
    expect(uploadArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactType: 'PHISHING_DISPATCH_LOG',
        fileName: 'phishing-dispatch-job-phish-1.json',
        contentType: 'application/json',
      })
    );
  });
});
