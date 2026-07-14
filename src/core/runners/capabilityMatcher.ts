import { JobType, RunnerOperatingSystem } from '../types';

export interface RunnerCapabilityManifest {
  os: RunnerOperatingSystem;
  capabilities: string[];
  tools: string[];
}

export interface QueuedJob {
  id: string;
  jobType: JobType | string;
  requiredOs: RunnerOperatingSystem | null;
  requiredCapabilities: string[];
  requiredTools: string[];
}

export function getUnsupportedReason(
  manifest: RunnerCapabilityManifest,
  job: QueuedJob
): string | null {
  if (job.requiredOs && manifest.os !== job.requiredOs) {
    return `Runner operating system ${manifest.os} does not satisfy required operating system ${job.requiredOs}`;
  }

  for (const capability of job.requiredCapabilities) {
    if (!manifest.capabilities.includes(capability)) {
      return `Runner is missing required capability ${capability}`;
    }
  }

  for (const tool of job.requiredTools) {
    if (!manifest.tools.includes(tool)) {
      return `Runner is missing required tool ${tool}`;
    }
  }

  return null;
}

export function supportsJob(
  manifest: RunnerCapabilityManifest,
  job: QueuedJob
): boolean {
  return getUnsupportedReason(manifest, job) === null;
}
