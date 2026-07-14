import { JobRecord } from '../core/types';

export interface RunnerExecutionContext {
  job: JobRecord;
  appendLog: (level: string, message: string, metadata?: Record<string, unknown>) => Promise<void>;
  updateStatus?: (
    status: 'running' | 'artifact_uploading',
    payload?: {
      resultSummary?: Record<string, unknown>;
      errorCode?: string;
      errorMessage?: string;
    }
  ) => Promise<void>;
  uploadArtifact: (input: {
    artifactType: string;
    fileName: string;
    contentType: string;
    body: Buffer | Uint8Array | string;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
}

export interface ProviderResult {
  summary?: Record<string, unknown>;
}

export interface WebAssessmentProvider {
  execute(context: RunnerExecutionContext): Promise<ProviderResult>;
}

export interface IpScanProvider {
  execute(context: RunnerExecutionContext): Promise<ProviderResult>;
}

export interface WirelessAssessmentProvider {
  execute(context: RunnerExecutionContext): Promise<ProviderResult>;
}

export interface PhishingDispatchProvider {
  execute(context: RunnerExecutionContext): Promise<ProviderResult>;
}

export interface ReportGenerationProvider {
  execute(context: RunnerExecutionContext): Promise<ProviderResult>;
}

export interface ArtifactCollector {
  collect(context: RunnerExecutionContext): Promise<void>;
}
