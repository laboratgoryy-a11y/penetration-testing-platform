import {
  assertValidJobTransition,
  type JobLifecycleStatus,
} from '../../core/jobs/jobLifecycle';

describe('assertValidJobTransition', () => {
  it('allows the canonical queued -> claimed -> running -> artifact_uploading -> completed flow', () => {
    const flow: JobLifecycleStatus[] = [
      'queued',
      'claimed',
      'running',
      'artifact_uploading',
      'completed',
    ];

    for (let index = 0; index < flow.length - 1; index += 1) {
      expect(() =>
        assertValidJobTransition(flow[index], flow[index + 1])
      ).not.toThrow();
    }
  });

  it('rejects skipping from queued directly to completed', () => {
    expect(() => assertValidJobTransition('queued', 'completed')).toThrow(
      /invalid job transition/i
    );
  });
});
