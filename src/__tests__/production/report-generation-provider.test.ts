describe('ReportGenerationProvider', () => {
  it('uploads a generated JSON report artifact for report jobs', async () => {
    const { ReportGenerationProvider } = require('../../runner/ReportGenerationProvider');
    const uploadArtifact = jest.fn().mockResolvedValue(undefined);
    const appendLog = jest.fn().mockResolvedValue(undefined);

    const provider = new ReportGenerationProvider();
    const result = await provider.execute({
      job: {
        id: 'job-1',
        jobType: 'REPORT_GENERATION',
        payload: {
          reportType: 'SCAN',
          format: 'JSON',
          sourceJobId: 'scan-job-1',
          metadata: {
            entityType: 'scan',
            entityId: 'scan-job-1',
          },
          sourceJob: {
            id: 'scan-job-1',
            status: 'completed',
            resultSummary: {
              findings: [{ type: 'missing-header' }],
            },
          },
        },
      },
      appendLog,
      uploadArtifact,
    });

    expect(uploadArtifact).toHaveBeenCalledTimes(1);
    expect(uploadArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactType: 'REPORT',
        fileName: 'scan-job-1-scan-report.json',
        contentType: 'application/json',
      })
    );

    const artifactPayload = uploadArtifact.mock.calls[0][0];
    expect(typeof artifactPayload.body).toBe('string');
    expect(JSON.parse(artifactPayload.body)).toEqual(
      expect.objectContaining({
        reportType: 'SCAN',
        sourceJobId: 'scan-job-1',
      })
    );
    expect(result.summary).toEqual(
      expect.objectContaining({
        artifactType: 'REPORT',
        format: 'JSON',
        reportType: 'SCAN',
      })
    );
  });
});
