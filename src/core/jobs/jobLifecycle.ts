export type JobLifecycleStatus =
  | 'queued'
  | 'claimed'
  | 'running'
  | 'artifact_uploading'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'unsupported';

const VALID_TRANSITIONS: Record<JobLifecycleStatus, JobLifecycleStatus[]> = {
  queued: ['claimed', 'cancelled', 'unsupported'],
  claimed: ['running', 'cancelled', 'failed', 'unsupported'],
  running: ['artifact_uploading', 'completed', 'failed', 'cancelled', 'unsupported'],
  artifact_uploading: ['completed', 'failed', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
  unsupported: [],
};

export function assertValidJobTransition(
  currentStatus: JobLifecycleStatus,
  nextStatus: JobLifecycleStatus
): void {
  if (!VALID_TRANSITIONS[currentStatus].includes(nextStatus)) {
    throw new Error(
      `Invalid job transition from ${currentStatus} to ${nextStatus}`
    );
  }
}
