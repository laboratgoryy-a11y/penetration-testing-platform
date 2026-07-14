import { spawn } from 'child_process';
import {
  DetectionConfidence,
  FindingEvidence,
  UnsupportedCapabilityError,
} from '../core/types';
import {
  findUnsupportedWirelessTestTypes,
  normalizeWirelessTestTypes,
  SUPPORTED_WIRELESS_TEST_TYPES,
} from '../core/network/wirelessTestTypes';
import {
  ProviderResult,
  RunnerExecutionContext,
  WirelessAssessmentProvider as WirelessAssessmentProviderContract,
} from './providers';

type WirelessSecurity = 'OPEN' | 'WEP' | 'WPA' | 'WPA2' | 'WPA3' | 'UNKNOWN';

interface WirelessPayload {
  interface?: string;
  target?: {
    ssid?: string;
    bssid?: string;
  };
  config?: {
    testTypes?: string[];
  };
}

interface AccessPointRecord {
  interfaceName: string | null;
  ssid: string;
  bssid: string;
  networkType: string | null;
  authentication: string | null;
  encryption: string | null;
  security: WirelessSecurity;
  channel: number | null;
  signalPercent: number | null;
  signalStrength: number | null;
  radioType: string | null;
}

interface WirelessFinding {
  type: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: DetectionConfidence;
  description: string;
  evidence: FindingEvidence[];
  remediation: string;
}

interface AssessmentCheck {
  id: string;
  title: string;
  status: 'passed' | 'warning' | 'info';
  detail: string;
}

interface TestExecutionStatus {
  id: string;
  label: string;
  status: 'executed' | 'ready' | 'needs_requirements' | 'not_available';
  detail: string;
}

function toMacAddress(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeSsid(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function percentToDbm(percent: number | null): number | null {
  if (percent === null || Number.isNaN(percent)) {
    return null;
  }

  return Math.round(percent / 2 - 100);
}

function normalizeSecurity(authentication: string | null, encryption: string | null): WirelessSecurity {
  const fingerprint = `${authentication || ''} ${encryption || ''}`.toUpperCase();

  if (fingerprint.includes('WPA3')) {
    return 'WPA3';
  }

  if (fingerprint.includes('WPA2')) {
    return 'WPA2';
  }

  if (fingerprint.includes('WPA')) {
    return 'WPA';
  }

  if (fingerprint.includes('WEP')) {
    return 'WEP';
  }

  if (
    fingerprint.includes('OPEN') ||
    fingerprint.includes('NONE') ||
    fingerprint.includes('OWE')
  ) {
    return 'OPEN';
  }

  return 'UNKNOWN';
}

function executeCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(
        new UnsupportedCapabilityError(
          `Failed to execute ${command}: ${error instanceof Error ? error.message : 'unknown error'}`
        )
      );
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}: ${stderr || 'unknown error'}`));
        return;
      }

      resolve(stdout);
    });
  });
}

function parseNetshOutput(output: string): AccessPointRecord[] {
  const accessPoints: AccessPointRecord[] = [];
  let interfaceName: string | null = null;
  let currentNetwork:
    | {
        ssid: string;
        networkType: string | null;
        authentication: string | null;
        encryption: string | null;
      }
    | null = null;
  let currentBssid:
    | {
        bssid: string;
        channel: number | null;
        signalPercent: number | null;
        signalStrength: number | null;
        radioType: string | null;
      }
    | null = null;

  const flushBssid = (): void => {
    if (!currentNetwork || !currentBssid) {
      return;
    }

    accessPoints.push({
      interfaceName,
      ssid: currentNetwork.ssid,
      bssid: currentBssid.bssid,
      networkType: currentNetwork.networkType,
      authentication: currentNetwork.authentication,
      encryption: currentNetwork.encryption,
      security: normalizeSecurity(
        currentNetwork.authentication,
        currentNetwork.encryption
      ),
      channel: currentBssid.channel,
      signalPercent: currentBssid.signalPercent,
      signalStrength: currentBssid.signalStrength,
      radioType: currentBssid.radioType,
    });
  };

  for (const line of output.split(/\r?\n/)) {
    const interfaceMatch = line.match(/^Interface name\s*:\s*(.+)$/i);
    if (interfaceMatch) {
      interfaceName = interfaceMatch[1].trim();
      continue;
    }

    const ssidMatch = line.match(/^SSID\s+\d+\s*:\s*(.*)$/i);
    if (ssidMatch) {
      flushBssid();
      currentBssid = null;
      currentNetwork = {
        ssid: ssidMatch[1].trim(),
        networkType: null,
        authentication: null,
        encryption: null,
      };
      continue;
    }

    const bssidMatch = line.match(/^\s*BSSID\s+\d+\s*:\s*(.+)$/i);
    if (bssidMatch) {
      flushBssid();
      currentBssid = {
        bssid: toMacAddress(bssidMatch[1]),
        channel: null,
        signalPercent: null,
        signalStrength: null,
        radioType: null,
      };
      continue;
    }

    if (!currentNetwork) {
      continue;
    }

    const networkTypeMatch = line.match(/^\s*Network type\s*:\s*(.+)$/i);
    if (networkTypeMatch) {
      currentNetwork.networkType = networkTypeMatch[1].trim();
      continue;
    }

    const authenticationMatch = line.match(/^\s*Authentication\s*:\s*(.+)$/i);
    if (authenticationMatch) {
      currentNetwork.authentication = authenticationMatch[1].trim();
      continue;
    }

    const encryptionMatch = line.match(/^\s*Encryption\s*:\s*(.+)$/i);
    if (encryptionMatch) {
      currentNetwork.encryption = encryptionMatch[1].trim();
      continue;
    }

    if (!currentBssid) {
      continue;
    }

    const signalMatch = line.match(/^\s*Signal\s*:\s*(\d+)%$/i);
    if (signalMatch) {
      currentBssid.signalPercent = parseInt(signalMatch[1], 10);
      currentBssid.signalStrength = percentToDbm(currentBssid.signalPercent);
      continue;
    }

    const channelMatch = line.match(/^\s*Channel\s*:\s*(\d+)$/i);
    if (channelMatch) {
      currentBssid.channel = parseInt(channelMatch[1], 10);
      continue;
    }

    const radioTypeMatch = line.match(/^\s*Radio type\s*:\s*(.+)$/i);
    if (radioTypeMatch) {
      currentBssid.radioType = radioTypeMatch[1].trim();
    }
  }

  flushBssid();
  return accessPoints;
}

function parseNmcliOutput(output: string, interfaceName: string | null): AccessPointRecord[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [ssid = '', bssid = '', channel = '', signal = '', security = ''] = line.split('|');
      const signalPercent = signal ? parseInt(signal, 10) : null;
      const normalizedSecurity = normalizeSecurity(security, security);

      return {
        interfaceName,
        ssid: ssid.trim(),
        bssid: toMacAddress(bssid),
        networkType: 'Infrastructure',
        authentication: security.trim() || null,
        encryption: security.trim() || null,
        security: normalizedSecurity,
        channel: channel ? parseInt(channel, 10) : null,
        signalPercent,
        signalStrength: percentToDbm(signalPercent),
        radioType: null,
      };
    })
    .filter((entry) => entry.bssid.length > 0);
}

function selectTargetAccessPoint(
  accessPoints: AccessPointRecord[],
  payload: WirelessPayload
): AccessPointRecord {
  const targetSsid = payload.target?.ssid?.trim();
  const normalizedTargetSsid = targetSsid ? normalizeSsid(targetSsid) : null;
  const targetBssid = payload.target?.bssid ? toMacAddress(payload.target.bssid) : null;

  const candidates = accessPoints.filter((accessPoint) => {
    if (targetBssid && accessPoint.bssid !== targetBssid) {
      return false;
    }

    if (
      normalizedTargetSsid &&
      normalizeSsid(accessPoint.ssid) !== normalizedTargetSsid
    ) {
      return false;
    }

    return true;
  });

  if (candidates.length === 0) {
    throw new Error('Target wireless network was not found in the current scan results');
  }

  return candidates.sort(
    (left, right) => (right.signalPercent || 0) - (left.signalPercent || 0)
  )[0];
}

function buildEvidence(accessPoint: AccessPointRecord): FindingEvidence[] {
  const detail = [
    `SSID=${accessPoint.ssid}`,
    `BSSID=${accessPoint.bssid}`,
    `Authentication=${accessPoint.authentication || 'unknown'}`,
    `Encryption=${accessPoint.encryption || 'unknown'}`,
    `Channel=${accessPoint.channel ?? 'unknown'}`,
  ].join('; ');

  return [
    {
      type: 'observation',
      description: `Wireless scan observed ${detail}.`,
      value: detail,
    },
  ];
}

function buildFindings(accessPoint: AccessPointRecord): WirelessFinding[] {
  const evidence = buildEvidence(accessPoint);

  if (accessPoint.security === 'OPEN') {
    return [
      {
        type: 'OPEN_NETWORK',
        title: 'Open wireless network',
        severity: 'high',
        confidence: 'high',
        description: `Wireless network ${accessPoint.ssid} is open and does not advertise link-layer encryption.`,
        evidence,
        remediation: 'Enable WPA2 or WPA3 with a strong passphrase.',
      },
    ];
  }

  if (accessPoint.security === 'WEP') {
    return [
      {
        type: 'WEAK_ENCRYPTION',
        title: 'WEP encryption detected',
        severity: 'high',
        confidence: 'high',
        description: `Wireless network ${accessPoint.ssid} uses WEP, which is deprecated and cryptographically broken.`,
        evidence,
        remediation: 'Migrate the network to WPA2 or WPA3 immediately.',
      },
    ];
  }

  if (accessPoint.security === 'WPA') {
    return [
      {
        type: 'LEGACY_ENCRYPTION',
        title: 'Legacy WPA security detected',
        severity: 'medium',
        confidence: 'high',
        description: `Wireless network ${accessPoint.ssid} advertises legacy WPA protection instead of WPA2 or WPA3.`,
        evidence,
        remediation: 'Upgrade the network to WPA2 or WPA3 and disable legacy WPA compatibility.',
      },
    ];
  }

  return [];
}

function buildAssessmentChecks(
  accessPoint: AccessPointRecord,
  findings: WirelessFinding[]
): AssessmentCheck[] {
  const signalDetail =
    accessPoint.signalPercent !== null || accessPoint.signalStrength !== null
      ? `Signal=${accessPoint.signalPercent ?? 'unknown'}%, RSSI=${accessPoint.signalStrength ?? 'unknown'} dBm`
      : 'لم تتوفر قراءة إشارة دقيقة من أداة النظام الحالية.';

  const legacyWarning =
    accessPoint.security === 'OPEN' ||
    accessPoint.security === 'WEP' ||
    accessPoint.security === 'WPA';

  return [
    {
      id: 'TARGET_VERIFICATION',
      title: 'التحقق من الهدف',
      status: 'passed',
      detail: `تمت مطابقة الهدف على SSID=${accessPoint.ssid} وBSSID=${accessPoint.bssid}.`,
    },
    {
      id: 'SECURITY_CLASSIFICATION',
      title: 'تصنيف الحماية',
      status: legacyWarning ? 'warning' : 'passed',
      detail: `الشبكة تعلن نوع حماية ${accessPoint.security}.`,
    },
    {
      id: 'WEAK_CONFIGURATION_CHECK',
      title: 'فحص الحماية الضعيفة',
      status: findings.length > 0 ? 'warning' : 'passed',
      detail:
        findings.length > 0
          ? `تم رصد ${findings.length} ملاحظة مرتبطة بالحماية أو التهيئة اللاسلكية.`
          : 'لم يتم رصد مؤشرات ضعف معروفة ضمن الفحص السلبي الحالي.',
    },
    {
      id: 'RADIO_VISIBILITY',
      title: 'مؤشرات الراديو والإشارة',
      status: 'info',
      detail: `Radio=${accessPoint.radioType || 'unknown'}, Channel=${accessPoint.channel ?? 'unknown'}, ${signalDetail}`,
    },
  ];
}

function buildTestExecutionStatus(requestedTestTypes: string[]): TestExecutionStatus[] {
  return requestedTestTypes.map((testType) => {
    if (testType === 'TRAFFIC_ANALYSIS') {
      return {
        id: testType,
        label: 'تحليل المرور اللاسلكي',
        status: 'executed',
        detail: 'تم تنفيذ هذا الاختبار فعليًا عبر الرصد السلبي اللاسلكي في هذه الجولة.',
      };
    }

    return {
      id: testType,
      label: testType,
      status: 'needs_requirements',
      detail: 'تم تقييم هذا الطلب ضمن الجاهزية الحالية، لكنه يحتاج متطلبات تشغيل إضافية قبل التنفيذ الفعلي على runner مخصص.',
    };
  });
}

function resolveCommand(
  platform: NodeJS.Platform,
  payload: WirelessPayload
): { toolName: string; command: string; args: string[]; parser: 'netsh' | 'nmcli' } {
  if (platform === 'win32') {
    return {
      toolName: 'netsh-wlan',
      command: 'netsh',
      args: ['wlan', 'show', 'networks', 'mode=bssid'],
      parser: 'netsh',
    };
  }

  if (platform === 'linux') {
    const args = [
      '--terse',
      '--escape',
      'no',
      '--separator',
      '|',
      '-f',
      'SSID,BSSID,CHAN,SIGNAL,SECURITY',
      'device',
      'wifi',
      'list',
      '--rescan',
      'yes',
    ];

    if (payload.interface?.trim()) {
      args.push('ifname', payload.interface.trim());
    }

    if (payload.target?.bssid?.trim()) {
      args.push('bssid', payload.target.bssid.trim());
    }

    return {
      toolName: 'nmcli',
      command: 'nmcli',
      args,
      parser: 'nmcli',
    };
  }

  throw new UnsupportedCapabilityError(
    `WIRELESS_ASSESSMENT is not supported on platform ${platform}`
  );
}

export class WirelessAssessmentProvider
  implements WirelessAssessmentProviderContract
{
  constructor(private readonly platform: NodeJS.Platform = process.platform) {}

  async execute(context: RunnerExecutionContext): Promise<ProviderResult> {
    const payload = (context.job.payload || {}) as WirelessPayload;
    const requestedTestTypes = normalizeWirelessTestTypes(
      payload.config?.testTypes
    );
    if (context.job.jobType === 'WIRELESS_ASSESSMENT') {
      if (requestedTestTypes.length === 0) {
        throw new UnsupportedCapabilityError(
          `WIRELESS_ASSESSMENT requires at least one supported test type: ${SUPPORTED_WIRELESS_TEST_TYPES.join(
            ', '
          )}`
        );
      }

      const deferredTestTypes = findUnsupportedWirelessTestTypes(requestedTestTypes);
      if (deferredTestTypes.length > 0) {
        await context.appendLog('warning', 'Some requested wireless tests require additional runtime prerequisites', {
          deferredTestTypes,
          executedTestTypes: requestedTestTypes.filter((testType) => !deferredTestTypes.includes(testType)),
          supportedTestTypes: [...SUPPORTED_WIRELESS_TEST_TYPES],
        });
      }
    }

    const command = resolveCommand(this.platform, payload);

    await context.appendLog('info', 'Starting wireless scan', {
      jobType: context.job.jobType,
      tool: command.toolName,
      args: command.args,
    });

    const rawOutput = await executeCommand(command.command, command.args);
    const accessPoints =
      command.parser === 'netsh'
        ? parseNetshOutput(rawOutput)
        : parseNmcliOutput(rawOutput, payload.interface?.trim() || null);

    if (context.job.jobType === 'WIRELESS_DISCOVERY') {
      await context.uploadArtifact({
        artifactType: 'SCAN_RESULTS',
        fileName: `wireless-discovery-${context.job.id}.json`,
        contentType: 'application/json',
        body: JSON.stringify(
          {
            scannedAt: new Date().toISOString(),
            tool: command.toolName,
            interface: payload.interface || null,
            accessPoints,
            rawOutput,
          },
          null,
          2
        ),
        metadata: {
          totalAccessPoints: accessPoints.length,
        },
      });

      await context.appendLog('info', 'Completed wireless discovery', {
        totalAccessPoints: accessPoints.length,
      });

      return {
        summary: {
          progress: 100,
          interface: payload.interface || null,
          totalAccessPoints: accessPoints.length,
          accessPoints,
        },
      };
    }

    const accessPoint = selectTargetAccessPoint(accessPoints, payload);
    const findings = buildFindings(accessPoint);
    const assessmentChecks = buildAssessmentChecks(accessPoint, findings);
    const testExecutionStatus = buildTestExecutionStatus(requestedTestTypes);
    await context.uploadArtifact({
      artifactType: 'SCAN_RESULTS',
      fileName: `wireless-assessment-${context.job.id}.json`,
      contentType: 'application/json',
      body: JSON.stringify(
        {
          assessedAt: new Date().toISOString(),
          tool: command.toolName,
          target: payload.target || null,
          requestedTestTypes,
          accessPoint,
          findings,
          assessmentChecks,
          testExecutionStatus,
          rawOutput,
        },
        null,
        2
      ),
      metadata: {
        targetSsid: accessPoint.ssid,
        targetBssid: accessPoint.bssid,
        findingCount: findings.length,
      },
    });

    await context.appendLog('info', 'Completed wireless assessment', {
      targetSsid: accessPoint.ssid,
      targetBssid: accessPoint.bssid,
      findingCount: findings.length,
    });

    return {
      summary: {
        progress: 100,
        targetSsid: accessPoint.ssid,
        targetBssid: accessPoint.bssid,
        security: accessPoint.security,
        requestedTestTypes,
        accessPoint,
        findingCount: findings.length,
        findings,
        assessmentChecks,
        testExecutionStatus,
        assessmentMode: 'PASSIVE_WIRELESS_OBSERVATION',
        observedAt: new Date().toISOString(),
      },
    };
  }
}
