import { fetch, FormData } from 'undici';
import { JobRecord, JobStatus, RunnerManifest } from '../core/types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export class RunnerClient {
  constructor(
    private readonly baseUrl: string,
    private token: string | null
  ) {}

  setToken(token: string): void {
    this.token = token;
  }

  async register(
    registrationSecret: string,
    manifest: RunnerManifest
  ): Promise<{ runnerId: string; token: string }> {
    const response = await this.request<{ runnerId: string; token: string }>(
      '/runners/register',
      {
        method: 'POST',
        body: JSON.stringify({
          registrationSecret,
          manifest,
        }),
      }
    );

    return response.data;
  }

  async heartbeat(
    manifest: RunnerManifest,
    systemLoad?: Record<string, unknown>
  ): Promise<void> {
    await this.request('/runners/heartbeat', {
      method: 'POST',
      body: JSON.stringify({
        manifest,
        systemLoad: systemLoad || {},
      }),
    });
  }

  async claimJob(): Promise<{ job: JobRecord | null; unsupportedReason?: string | null }> {
    const response = await this.request<{
      job: JobRecord | null;
      unsupportedReason?: string | null;
    }>('/runners/jobs/claim', {
      method: 'POST',
    });

    return response.data;
  }

  async appendLog(
    jobId: string,
    level: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.request(`/runners/jobs/${jobId}/logs`, {
      method: 'POST',
      body: JSON.stringify({
        level,
        message,
        metadata: metadata || {},
      }),
    });
  }

  async uploadArtifact(
    jobId: string,
    input: {
      artifactType: string;
      fileName: string;
      contentType: string;
      body: Buffer | Uint8Array | string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const form = new FormData();
    const fileBody =
      typeof input.body === 'string' ? input.body : Uint8Array.from(input.body);
    form.set('artifactType', input.artifactType);
    if (input.metadata) {
      form.set('metadata', JSON.stringify(input.metadata));
    }
    form.set(
      'artifact',
      new Blob([fileBody], {
        type: input.contentType,
      }),
      input.fileName
    );

    await this.request(`/runners/jobs/${jobId}/artifacts`, {
      method: 'POST',
      body: form,
    });
  }

  async updateJobStatus(
    jobId: string,
    status: Extract<JobStatus, 'running' | 'artifact_uploading'>,
    payload?: {
      resultSummary?: Record<string, unknown>;
      errorCode?: string;
      errorMessage?: string;
    }
  ): Promise<void> {
    await this.request(`/runners/jobs/${jobId}/status`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        resultSummary: payload?.resultSummary,
        errorCode: payload?.errorCode,
        errorMessage: payload?.errorMessage,
      }),
    });
  }

  async completeJob(
    jobId: string,
    status: Extract<JobStatus, 'completed' | 'failed' | 'cancelled' | 'unsupported'>,
    payload?: {
      resultSummary?: Record<string, unknown>;
      errorCode?: string;
      errorMessage?: string;
    }
  ): Promise<void> {
    await this.request(`/runners/jobs/${jobId}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        resultSummary: payload?.resultSummary,
        errorCode: payload?.errorCode,
        errorMessage: payload?.errorMessage,
      }),
    });
  }

  private async request<T = unknown>(
    path: string,
    init: {
      method: string;
      body?: string | FormData;
    }
  ): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}/api/v1${path}`, {
      method: init.method,
      headers: {
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: init.body,
    });

    const parsed = (await response.json()) as ApiResponse<T>;
    if (!response.ok || !parsed.success) {
      throw new Error(parsed.error?.message || `Runner request failed: ${response.status}`);
    }

    return parsed;
  }
}
