import os from 'os';
import { JobRecord, RunnerManifest, RunnerOperatingSystem } from '../core/types';
import { UnsupportedCapabilityError } from '../core/types';
import { RunnerClient } from './RunnerClient';
import {
  discoverRunnerCapabilities,
  discoverRunnerTools,
} from './tooling';
import {
  ArtifactCollector,
  IpScanProvider,
  PhishingDispatchProvider,
  ProviderResult,
  ReportGenerationProvider,
  RunnerExecutionContext,
  WebAssessmentProvider,
  WirelessAssessmentProvider,
} from './providers';
import { ReportGenerationProvider as DefaultReportGenerationProvider } from './ReportGenerationProvider';
import { IpScanProvider as DefaultIpScanProvider } from './IpScanProvider';
import { PhishingDispatchProvider as DefaultPhishingDispatchProvider } from './PhishingDispatchProvider';
import { WebAssessmentProvider as DefaultWebAssessmentProvider } from './WebAssessmentProvider';
import { WirelessAssessmentProvider as DefaultWirelessAssessmentProvider } from './WirelessAssessmentProvider';

interface ProviderRegistry {
  artifactCollector?: ArtifactCollector;
  webAssessmentProvider?: WebAssessmentProvider;
  ipScanProvider?: IpScanProvider;
  wirelessAssessmentProvider?: WirelessAssessmentProvider;
  phishingDispatchProvider?: PhishingDispatchProvider;
  reportGenerationProvider?: ReportGenerationProvider;
}

function getRunnerOs(): RunnerOperatingSystem {
  switch (process.platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'macos';
    default:
      return 'linux';
  }
}

function parseCsv(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildManifest(): RunnerManifest {
  const tools = discoverRunnerTools(parseCsv(process.env.RUNNER_TOOLS));
  const capabilities = discoverRunnerCapabilities(
    parseCsv(process.env.RUNNER_CAPABILITIES),
    tools
  );

  return {
    runnerName: process.env.RUNNER_NAME || os.hostname(),
    os: getRunnerOs(),
    arch: process.arch,
    capabilities,
    tools,
    metadata: {
      version: process.env.RUNNER_VERSION || '1.0.0',
    },
  };
}

function getProviderForJob(
  registry: ProviderRegistry,
  job: JobRecord
):
  | WebAssessmentProvider
  | IpScanProvider
  | WirelessAssessmentProvider
  | PhishingDispatchProvider
  | ReportGenerationProvider {
  switch (job.jobType) {
    case 'WEB_SCAN':
      if (!registry.webAssessmentProvider) {
        throw new UnsupportedCapabilityError('No WebAssessmentProvider is configured');
      }
      return registry.webAssessmentProvider;
    case 'IP_SCAN':
      if (!registry.ipScanProvider) {
        throw new UnsupportedCapabilityError('No IpScanProvider is configured');
      }
      return registry.ipScanProvider;
    case 'WIRELESS_DISCOVERY':
    case 'WIRELESS_ASSESSMENT':
      if (!registry.wirelessAssessmentProvider) {
        throw new UnsupportedCapabilityError(
          'No WirelessAssessmentProvider is configured'
        );
      }
      return registry.wirelessAssessmentProvider;
    case 'PHISHING_DISPATCH':
      if (!registry.phishingDispatchProvider) {
        throw new UnsupportedCapabilityError(
          'No PhishingDispatchProvider is configured'
        );
      }
      return registry.phishingDispatchProvider;
    case 'REPORT_GENERATION':
      if (!registry.reportGenerationProvider) {
        throw new UnsupportedCapabilityError(
          'No ReportGenerationProvider is configured'
        );
      }
      return registry.reportGenerationProvider;
    default:
      throw new UnsupportedCapabilityError(`Unsupported job type: ${job.jobType}`);
  }
}

function createDefaultProviderRegistry(): ProviderRegistry {
  return {
    ipScanProvider: new DefaultIpScanProvider(),
    phishingDispatchProvider: new DefaultPhishingDispatchProvider(),
    reportGenerationProvider: new DefaultReportGenerationProvider(),
    webAssessmentProvider: new DefaultWebAssessmentProvider(),
    wirelessAssessmentProvider: new DefaultWirelessAssessmentProvider(),
  };
}

class RunnerAgent {
  private readonly baseUrl: string;
  private readonly registrationSecret: string;
  private readonly manifest: RunnerManifest;
  private readonly providerRegistry: ProviderRegistry;
  private readonly heartbeatIntervalMs: number;
  private readonly pollIntervalMs: number;
  private readonly client: RunnerClient;
  private currentToken: string | null;

  constructor(providerRegistry: ProviderRegistry = createDefaultProviderRegistry()) {
    this.baseUrl = process.env.CONTROL_PLANE_URL || '';
    this.registrationSecret = process.env.RUNNER_REGISTRATION_SECRET || '';
    this.currentToken = process.env.RUNNER_TOKEN || null;
    this.manifest = buildManifest();
    this.providerRegistry = providerRegistry;
    this.heartbeatIntervalMs = parseInt(
      process.env.RUNNER_HEARTBEAT_INTERVAL_MS || '30000',
      10
    );
    this.pollIntervalMs = parseInt(process.env.RUNNER_POLL_INTERVAL_MS || '5000', 10);
    this.client = new RunnerClient(this.baseUrl, this.currentToken);
  }

  async start(): Promise<void> {
    if (!this.baseUrl) {
      throw new Error('CONTROL_PLANE_URL must be configured outside test mode');
    }

    if (!this.currentToken) {
      if (!this.registrationSecret) {
        throw new Error(
          'RUNNER_TOKEN or RUNNER_REGISTRATION_SECRET must be configured'
        );
      }

      const registration = await this.client.register(
        this.registrationSecret,
        this.manifest
      );
      this.currentToken = registration.token;
      this.client.setToken(registration.token);
      console.info(`Runner registered with id ${registration.runnerId}`);
    }

    await this.client.heartbeat(this.manifest, this.collectSystemLoad());
    setInterval(() => {
      this.client
        .heartbeat(this.manifest, this.collectSystemLoad())
        .catch((error) => console.error('Runner heartbeat failed', error));
    }, this.heartbeatIntervalMs);

    for (;;) {
      try {
        const claimed = await this.client.claimJob();
        if (!claimed.job) {
          await this.sleep(this.pollIntervalMs);
          continue;
        }

        await this.handleJob(claimed.job);
      } catch (error) {
        console.error('Runner work loop failed', error);
        await this.sleep(this.pollIntervalMs);
      }
    }
  }

  private async handleJob(job: JobRecord): Promise<void> {
    const context: RunnerExecutionContext = {
      job,
      appendLog: async (level, message, metadata) => {
        await this.client.appendLog(job.id, level, message, metadata);
      },
      updateStatus: async (status, payload) => {
        await this.client.updateJobStatus(job.id, status, payload);
      },
      uploadArtifact: async (input) => {
        await this.client.uploadArtifact(job.id, input);
      },
    };

    try {
      await context.appendLog('info', `Claimed job ${job.id}`, {
        jobType: job.jobType,
      });
      await this.client.updateJobStatus(job.id, 'running');

      const provider = getProviderForJob(this.providerRegistry, job);
      const result = await provider.execute(context);

      if (this.providerRegistry.artifactCollector) {
        await this.client.updateJobStatus(job.id, 'artifact_uploading');
        await this.providerRegistry.artifactCollector.collect(context);
      }

      await this.client.completeJob(job.id, 'completed', {
        resultSummary: this.normalizeProviderResult(result),
      });
    } catch (error) {
      if (error instanceof UnsupportedCapabilityError) {
        await context.appendLog('warning', error.message);
        await this.client.completeJob(job.id, 'unsupported', {
          errorCode: 'UNSUPPORTED_CAPABILITY',
          errorMessage: error.message,
        });
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Unknown runner execution error';
      await context.appendLog('error', message);
      await this.client.completeJob(job.id, 'failed', {
        errorCode: 'EXECUTION_FAILED',
        errorMessage: message,
      });
    }
  }

  private normalizeProviderResult(result: ProviderResult | undefined): Record<string, unknown> {
    return result?.summary || {};
  }

  private collectSystemLoad(): Record<string, unknown> {
    const oneMinuteLoad = os.loadavg()[0];
    return {
      uptimeSeconds: os.uptime(),
      freeMemoryBytes: os.freemem(),
      totalMemoryBytes: os.totalmem(),
      oneMinuteLoad,
      cpuCount: os.cpus().length,
    };
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

if (require.main === module) {
  new RunnerAgent()
    .start()
    .catch((error) => {
      console.error('Runner startup failed', error);
      process.exit(1);
    });
}

export { RunnerAgent };
export { buildManifest };
