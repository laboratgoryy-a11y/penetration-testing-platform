export type Action = 'READ' | 'WRITE' | 'DELETE' | 'EXECUTE';

export type OperationType =
  | 'WEB_SCAN'
  | 'PHISHING_CAMPAIGN'
  | 'NETWORK_ANALYSIS'
  | 'IP_SCAN'
  | 'REPORT_GENERATION';

export type RunnerOperatingSystem = 'windows' | 'linux' | 'macos';

export type JobType =
  | 'WEB_SCAN'
  | 'IP_SCAN'
  | 'WIRELESS_DISCOVERY'
  | 'WIRELESS_ASSESSMENT'
  | 'PHISHING_DISPATCH'
  | 'REPORT_GENERATION';

export type JobStatus =
  | 'queued'
  | 'claimed'
  | 'running'
  | 'artifact_uploading'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'unsupported';

export type DetectionConfidence = 'high' | 'medium' | 'low';

export interface FindingEvidence {
  type: 'http_response' | 'request' | 'response_fragment' | 'artifact' | 'observation';
  description: string;
  value?: string;
}

export interface AuthenticatedUser {
  userId: string;
  username: string;
  roles: string[];
}

export interface AuthTokenSet {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface TokenValidation {
  valid: boolean;
  userId?: string;
  username?: string;
  roles?: string[];
  expiresAt?: Date;
  jti?: string;
}

export interface AuthorizationScope {
  domains?: string[];
  ipRanges?: string[];
  networks?: Array<{ ssid?: string; bssid?: string }>;
  emailDomains?: string[];
}

export interface AuthorizationRecord {
  id: string;
  userId: string;
  organizationName: string;
  scope: AuthorizationScope;
  validFrom: Date;
  validUntil: Date;
  signedBy: string;
  digitalSignature: string;
  allowedOperations: OperationType[];
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  createdAt: Date;
  revokedAt?: Date | null;
  revocationReason?: string | null;
}

export interface JobRecord {
  id: string;
  jobType: JobType;
  status: JobStatus;
  requestedBy: string;
  authorizationId: string | null;
  targetType: string | null;
  targetValue: string | null;
  payload: Record<string, unknown>;
  requiredOs: RunnerOperatingSystem | null;
  requiredCapabilities: string[];
  requiredTools: string[];
  runnerId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  resultSummary: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  claimedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
}

export interface RunnerManifest {
  runnerName: string;
  os: RunnerOperatingSystem;
  arch: string;
  capabilities: string[];
  tools: string[];
  metadata?: Record<string, unknown>;
}

export interface JobArtifactRecord {
  id: string;
  jobId: string;
  runnerId: string | null;
  artifactType: string;
  fileName: string;
  objectKey: string;
  sizeBytes: number;
  contentType: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface ReportRecord {
  id: string;
  jobId: string | null;
  generatedBy: string;
  reportType: string;
  format: string;
  status: 'queued' | 'ready' | 'failed';
  artifactId: string | null;
  metadata: Record<string, unknown> | null;
  generatedAt: Date;
}

export class UnsupportedCapabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedCapabilityError';
  }
}
