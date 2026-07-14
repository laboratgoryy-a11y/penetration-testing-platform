import express from 'express';
import request from 'supertest';

const registerRunnerMock = jest.fn();
const authenticateRunnerMock = jest.fn();
const heartbeatMock = jest.fn();
const claimNextJobMock = jest.fn();
const transitionJobMock = jest.fn();
const appendJobLogMock = jest.fn();
const addArtifactMock = jest.fn();
const putObjectMock = jest.fn();

jest.mock('../../core/runners/RunnerService', () => ({
  RunnerService: jest.fn().mockImplementation(() => ({
    registerRunner: registerRunnerMock,
    authenticateRunner: authenticateRunnerMock,
    heartbeat: heartbeatMock,
  })),
}));

jest.mock('../../core/jobs/JobService', () => ({
  JobService: jest.fn().mockImplementation(() => ({
    claimNextJob: claimNextJobMock,
    transitionJob: transitionJobMock,
    appendJobLog: appendJobLogMock,
    addArtifact: addArtifactMock,
  })),
}));

jest.mock('../../core/storage/ObjectStorageService', () => ({
  ObjectStorageService: jest.fn().mockImplementation(() => ({
    putObject: putObjectMock,
  })),
}));

describe('runners routes', () => {
  const router = require('../../api/routes/runners.routes').default;
  const app = express();
  app.use(express.json());
  app.use('/runners', router);

  beforeEach(() => {
    registerRunnerMock.mockReset();
    authenticateRunnerMock.mockReset();
    heartbeatMock.mockReset();
    claimNextJobMock.mockReset();
    transitionJobMock.mockReset();
    appendJobLogMock.mockReset();
    addArtifactMock.mockReset();
    putObjectMock.mockReset();
  });

  it('registers a runner and returns an access token', async () => {
    registerRunnerMock.mockResolvedValue({
      runnerId: 'runner-1',
      token: 'runner-token',
    });

    const response = await request(app).post('/runners/register').send({
      registrationSecret: 'secret',
      manifest: {
        runnerName: 'runner-1',
        os: 'linux',
        arch: 'x64',
        capabilities: ['WEB_SCAN'],
        tools: ['nmap'],
      },
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.runnerId).toBe('runner-1');
    expect(response.body.data.token).toBe('runner-token');
  });

  it('claims a job for an authenticated runner', async () => {
    authenticateRunnerMock.mockResolvedValue({
      runnerId: 'runner-1',
      runnerName: 'runner-1',
      os: 'linux',
      arch: 'x64',
      capabilities: ['WEB_SCAN'],
      tools: ['nmap'],
    });
    claimNextJobMock.mockResolvedValue({
      job: {
        id: 'job-1',
        jobType: 'WEB_SCAN',
        status: 'claimed',
      },
      unsupportedReason: null,
    });

    const response = await request(app)
      .post('/runners/jobs/claim')
      .set('Authorization', 'Bearer runner-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.job.id).toBe('job-1');
  });

  it('accepts non-terminal runner status transitions via the status endpoint', async () => {
    authenticateRunnerMock.mockResolvedValue({
      runnerId: 'runner-1',
      runnerName: 'runner-1',
      os: 'linux',
      arch: 'x64',
      capabilities: ['WEB_SCAN'],
      tools: ['nmap'],
    });
    transitionJobMock.mockResolvedValue({
      id: 'job-1',
      status: 'running',
    });

    const response = await request(app)
      .post('/runners/jobs/job-1/status')
      .set('Authorization', 'Bearer runner-token')
      .send({
        status: 'running',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.job.status).toBe('running');
  });

  it('stores uploaded runner artifacts and persists their metadata', async () => {
    authenticateRunnerMock.mockResolvedValue({
      runnerId: 'runner-1',
      runnerName: 'runner-1',
      os: 'linux',
      arch: 'x64',
      capabilities: ['WEB_SCAN'],
      tools: ['nmap'],
    });
    putObjectMock.mockResolvedValue({
      objectKey: 'jobs/job-1/runner-output.txt',
      contentType: 'text/plain',
      sizeBytes: 11,
    });

    const response = await request(app)
      .post('/runners/jobs/job-1/artifacts')
      .set('Authorization', 'Bearer runner-token')
      .field('artifactType', 'REPORT')
      .field('metadata', JSON.stringify({ section: 'summary' }))
      .attach('artifact', Buffer.from('hello world'), {
        filename: 'runner-output.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(putObjectMock).toHaveBeenCalledTimes(1);
    expect(addArtifactMock).toHaveBeenCalledWith({
      jobId: 'job-1',
      runnerId: 'runner-1',
      artifactType: 'REPORT',
      fileName: 'runner-output.txt',
      objectKey: 'jobs/job-1/runner-output.txt',
      sizeBytes: 11,
      contentType: 'text/plain',
      metadata: {
        section: 'summary',
      },
    });
  });
});
