import { lookup } from 'dns/promises';
import net from 'net';
import tls from 'tls';
import { spawn } from 'child_process';
import { parseStringPromise } from 'xml2js';
import { FindingEvidence, UnsupportedCapabilityError } from '../core/types';
import {
  IpScanProvider as IpScanProviderContract,
  ProviderResult,
  RunnerExecutionContext,
} from './providers';

interface IpScanPayload {
  target?: {
    value?: string;
    type?: string;
  };
  config?: {
    ports?: string;
    portRange?: {
      type?: string;
      customPorts?: string;
    };
    serviceDetection?: boolean;
    osDetection?: boolean;
    scanType?: string;
    timing?: string;
    vulnerabilityScan?: boolean;
  };
}

interface ParsedHost {
  ip_address: string;
  hostname: string | null;
  status: string;
  os_name: string | null;
  mac_address?: string | null;
  vendor?: string | null;
  latency_ms?: number | null;
  port_count: number;
  vulnerability_count: number;
}

interface ParsedPort {
  ip_address: string;
  port: number;
  protocol: string;
  state: string;
  service_name: string | null;
  service_product: string | null;
  service_version: string | null;
  response_time_ms?: number | null;
}

interface ParsedVulnerability {
  ip_address: string;
  port: number | null;
  type: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: 'high' | 'medium' | 'low';
  description: string;
  evidence: FindingEvidence[];
}

interface NativeScanOutput {
  hosts: ParsedHost[];
  ports: ParsedPort[];
  vulnerabilities: ParsedVulnerability[];
  services: Array<{
    ip_address: string;
    port: number;
    service_name: string | null;
    transport: string;
  }>;
  resolvedHostname: string | null;
  limitations: string[];
}

const DEFAULT_PORTS = [21, 22, 23, 25, 53, 80, 110, 123, 135, 137, 138, 139, 143, 161, 389, 443, 445, 554, 587, 636, 993, 995, 1433, 1521, 3306, 3389, 5357, 5432, 5900, 6379, 8008, 8009, 8080, 8443, 27017, 62078];
const QUICK_PORTS = [22, 80, 135, 139, 443, 445, 554, 3389, 8080, 3306, 5432];
const COMMON_SERVICE_NAMES = new Map<number, string>([
  [21, 'ftp'],
  [22, 'ssh'],
  [23, 'telnet'],
  [25, 'smtp'],
  [53, 'dns'],
  [80, 'http'],
  [110, 'pop3'],
  [123, 'ntp'],
  [135, 'msrpc'],
  [137, 'netbios-ns'],
  [138, 'netbios-dgm'],
  [139, 'netbios-ssn'],
  [143, 'imap'],
  [161, 'snmp'],
  [389, 'ldap'],
  [443, 'https'],
  [445, 'microsoft-ds'],
  [587, 'submission'],
  [636, 'ldaps'],
  [993, 'imaps'],
  [995, 'pop3s'],
  [1433, 'mssql'],
  [1521, 'oracle'],
  [3306, 'mysql'],
  [3389, 'rdp'],
  [5432, 'postgresql'],
  [5900, 'vnc'],
  [6379, 'redis'],
  [8008, 'http-alt'],
  [8009, 'ajp13'],
  [8080, 'http-alt'],
  [8443, 'https-alt'],
  [27017, 'mongodb'],
  [62078, 'iphone-sync'],
]);

function toArray<T>(value: T | T[] | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined) {
    return [];
  }

  return [value];
}

function resolveTarget(payload: IpScanPayload): string {
  const target = payload.target?.value;
  if (typeof target !== 'string' || target.trim().length === 0) {
    throw new UnsupportedCapabilityError('IP_SCAN payload must include a target.value');
  }

  return target.trim();
}

function buildNmapArgs(payload: IpScanPayload, target: string): string[] {
  const args = ['-oX', '-', '-Pn'];

  if (payload.config?.serviceDetection !== false) {
    args.push('-sV');
  }

  if (payload.config?.osDetection) {
    args.push('-O');
  }

  const portSpec = resolvePortSpec(payload);
  if (portSpec) {
    args.push('-p', portSpec);
  }

  args.push(target);
  return args;
}

function resolvePortSpec(payload: IpScanPayload): string | null {
  if (typeof payload.config?.ports === 'string' && payload.config.ports.trim()) {
    return payload.config.ports.trim();
  }

  const portRangeType = payload.config?.portRange?.type;
  if (portRangeType === 'CUSTOM') {
    const customPorts = payload.config?.portRange?.customPorts;
    return typeof customPorts === 'string' && customPorts.trim() ? customPorts.trim() : null;
  }
  if (portRangeType === 'TOP_100') {
    return QUICK_PORTS.join(',');
  }
  if (portRangeType === 'TOP_1000' || portRangeType === 'ALL') {
    return null;
  }

  const scanType = payload.config?.scanType;
  if (scanType === 'QUICK_SCAN') {
    return QUICK_PORTS.join(',');
  }

  return null;
}

function parsePortsFromSpec(portSpec: string | null, payload: IpScanPayload): number[] {
  if (!portSpec) {
    if (payload.config?.scanType === 'QUICK_SCAN') {
      return [...QUICK_PORTS];
    }

    return [...DEFAULT_PORTS];
  }

  const ports = new Set<number>();
  for (const token of portSpec.split(',')) {
    const trimmed = token.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.includes('-')) {
      const [startRaw, endRaw] = trimmed.split('-');
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start) {
        const boundedEnd = Math.min(end, start + 255);
        for (let port = start; port <= boundedEnd; port += 1) {
          ports.add(port);
        }
      }
      continue;
    }

    const port = Number(trimmed);
    if (Number.isFinite(port) && port > 0 && port <= 65535) {
      ports.add(port);
    }
  }

  return Array.from(ports).sort((left, right) => left - right);
}

function executeNmap(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('nmap', args);
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
          `Failed to execute nmap: ${error instanceof Error ? error.message : 'unknown error'}`
        )
      );
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`nmap exited with code ${code}: ${stderr || 'unknown error'}`));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

function pickPrimaryAddress(host: Record<string, unknown>): string {
  const addresses = toArray(host.address as Record<string, unknown> | Record<string, unknown>[]);
  const ipv4 =
    addresses.find((address) => address.addrtype === 'ipv4') ||
    addresses.find((address) => typeof address.addr === 'string');

  return typeof ipv4?.addr === 'string' ? ipv4.addr : 'unknown';
}

function pickHostname(host: Record<string, unknown>): string | null {
  const hostnames = host.hostnames as Record<string, unknown> | undefined;
  const hostnameEntries = toArray(
    (hostnames?.hostname as Record<string, unknown> | Record<string, unknown>[]) || undefined
  );
  const primary = hostnameEntries.find((entry) => typeof entry.name === 'string');
  return typeof primary?.name === 'string' ? primary.name : null;
}

function pickOsName(host: Record<string, unknown>): string | null {
  const os = host.os as Record<string, unknown> | undefined;
  const matches = toArray(
    (os?.osmatch as Record<string, unknown> | Record<string, unknown>[]) || undefined
  );
  const primary = matches.find((entry) => typeof entry.name === 'string');
  return typeof primary?.name === 'string' ? primary.name : null;
}

function pickMacAddress(host: Record<string, unknown>): { address: string | null; vendor: string | null } {
  const addresses = toArray(host.address as Record<string, unknown> | Record<string, unknown>[]);
  const macAddress = addresses.find((address) => address.addrtype === 'mac');
  return {
    address: typeof macAddress?.addr === 'string' ? macAddress.addr : null,
    vendor: typeof macAddress?.vendor === 'string' ? macAddress.vendor : null,
  };
}

function pickLatencyMs(host: Record<string, unknown>): number | null {
  const times = host.times as Record<string, unknown> | undefined;
  const srttRaw = typeof times?.srtt === 'string' ? Number(times.srtt) : Number(times?.srtt);
  if (!Number.isFinite(srttRaw) || srttRaw <= 0) {
    return null;
  }
  return Math.round(srttRaw / 1000);
}

async function probeTcpPort(
  host: string,
  port: number,
  timeoutMs = 1200
): Promise<{ state: 'open' | 'closed' | 'filtered'; banner?: string | null; durationMs: number }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;
    let banner = '';
    const startedAt = Date.now();

    const finish = (state: 'open' | 'closed' | 'filtered') => {
      if (resolved) {
        return;
      }
      resolved = true;
      socket.destroy();
      resolve({
        state,
        banner: banner.trim() || null,
        durationMs: Date.now() - startedAt,
      });
    };

    socket.setTimeout(timeoutMs);
    socket.on('connect', () => finish('open'));
    socket.on('timeout', () => finish('filtered'));
    socket.on('error', (error: NodeJS.ErrnoException) => {
      if (error?.code === 'ECONNREFUSED') {
        finish('closed');
        return;
      }
      finish('filtered');
    });
    socket.on('data', (chunk) => {
      banner += chunk.toString();
      if (banner.length > 128) {
        banner = banner.slice(0, 128);
      }
    });

    socket.connect(port, host);
  });
}

async function probeTlsPort(host: string, port: number, timeoutMs = 1500): Promise<{ open: boolean }> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host,
        port,
        servername: host,
        rejectUnauthorized: false,
        timeout: timeoutMs,
      },
      () => {
        socket.end();
        resolve({ open: true });
      }
    );

    socket.on('error', () => resolve({ open: false }));
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ open: false });
    });
  });
}

function buildInsecureServiceVulnerability(
  ipAddress: string,
  port: number,
  serviceName: string
): ParsedVulnerability {
  return {
    ip_address: ipAddress,
    port,
    type: 'INSECURE_SERVICE_EXPOSURE',
    title: `Open ${serviceName} service`,
    severity: serviceName === 'telnet' ? 'high' : 'medium',
    confidence: 'medium',
    description: `The ${serviceName} service is reachable on ${ipAddress}:${port}. Review whether this exposure is intended and adequately protected.`,
    evidence: [
      {
        type: 'observation',
        description: `A direct TCP connection succeeded to ${ipAddress}:${port}.`,
      },
    ],
  };
}

async function runNativeScan(
  payload: IpScanPayload,
  target: string,
  context: RunnerExecutionContext
): Promise<NativeScanOutput> {
  const lookupResult = await lookup(target);
  const ipAddress = lookupResult.address;
  const portSpec = resolvePortSpec(payload);
  const portsToScan = parsePortsFromSpec(portSpec, payload);
  const scannedPorts: ParsedPort[] = [];
  const vulnerabilities: ParsedVulnerability[] = [];
  const services: NativeScanOutput['services'] = [];
  const observedLatencies: number[] = [];
  const limitations = [
    'تم التنفيذ بواسطة محرك TCP داخلي لأن nmap غير متوفر على بيئة التشغيل الحالية.',
    'كشف نظام التشغيل ونتائج NSE غير متاحة في هذا الوضع، لكن فحص المنافذ والاتصال بالخدمات حقيقي.',
  ];

  await context.appendLog('warning', 'nmap is unavailable; falling back to native TCP scanner', {
    target,
    resolvedAddress: ipAddress,
    portsPlanned: portsToScan.length,
  });

  for (let index = 0; index < portsToScan.length; index += 1) {
    const port = portsToScan[index];
    const tcpProbe = await probeTcpPort(ipAddress, port);
    const serviceName = tcpProbe.state === 'open' ? COMMON_SERVICE_NAMES.get(port) || null : null;

    scannedPorts.push({
      ip_address: ipAddress,
      port,
      protocol: 'tcp',
      state: tcpProbe.state,
      service_name: serviceName,
      service_product: null,
      service_version: tcpProbe.banner || null,
      response_time_ms: tcpProbe.durationMs,
    });

    if (tcpProbe.state === 'open') {
      observedLatencies.push(tcpProbe.durationMs);
      services.push({
        ip_address: ipAddress,
        port,
        service_name: serviceName,
        transport: port === 443 || port === 8443 ? 'tls' : 'tcp',
      });

      if (serviceName === 'telnet' || serviceName === 'ftp' || serviceName === 'http') {
        vulnerabilities.push(buildInsecureServiceVulnerability(ipAddress, port, serviceName));
      }

      if (port === 443 || port === 8443) {
        const tlsProbe = await probeTlsPort(ipAddress, port);
        if (!tlsProbe.open) {
          vulnerabilities.push({
            ip_address: ipAddress,
            port,
            type: 'TLS_CONFIGURATION_WARNING',
            title: 'TLS handshake could not be completed',
            severity: 'medium',
            confidence: 'low',
            description: `The port ${port} is open but the TLS handshake did not complete successfully. Verify whether TLS is intentionally configured on this service.`,
            evidence: [
              {
                type: 'observation',
                description: `TCP connection opened on ${ipAddress}:${port}, but TLS negotiation failed.`,
              },
            ],
          });
        }
      }
    }

    const progress = Math.min(95, Math.max(5, Math.round(((index + 1) / portsToScan.length) * 95)));
    if (context.updateStatus) {
      await context.updateStatus('running', {
        resultSummary: {
          progress,
          targetValue: target,
          totalHosts: 1,
          hosts: [
            {
              ip_address: ipAddress,
              hostname: lookupResult.address === target ? null : target,
              status: scannedPorts.some((entry) => entry.state === 'open' || entry.state === 'closed')
                ? 'up'
                : 'filtered',
              os_name: null,
              mac_address: null,
              vendor: null,
              latency_ms:
                observedLatencies.length > 0
                  ? Math.round(
                      observedLatencies.reduce((sum, value) => sum + value, 0) / observedLatencies.length
                    )
                  : null,
              port_count: scannedPorts.filter((entry) => entry.state === 'open').length,
              vulnerability_count: vulnerabilities.length,
            },
          ],
          ports: scannedPorts,
          vulnerabilities,
          services,
          limitations,
          scannedPorts: index + 1,
          totalPortsPlanned: portsToScan.length,
          statusMessage: `تم فحص ${index + 1} من ${portsToScan.length} منفذ`,
        },
      });
    }
  }

  if (!scannedPorts.some((entry) => entry.state === 'open')) {
    limitations.push(
      'تم الوصول إلى الهدف ولكن لم يتم اكتشاف منافذ TCP مفتوحة ضمن النطاق الذي تم فحصه. قد يكون الجهاز يعمل بجدار حماية أو لا يعرض خدمات شبكية مباشرة.'
    );
  }

  return {
    hosts: [
      {
        ip_address: ipAddress,
        hostname: lookupResult.address === target ? null : target,
        status: scannedPorts.some((entry) => entry.state === 'open' || entry.state === 'closed')
          ? 'up'
          : 'filtered',
        os_name: null,
        mac_address: null,
        vendor: null,
        latency_ms:
          observedLatencies.length > 0
            ? Math.round(observedLatencies.reduce((sum, value) => sum + value, 0) / observedLatencies.length)
            : null,
        port_count: scannedPorts.filter((entry) => entry.state === 'open').length,
        vulnerability_count: vulnerabilities.length,
      },
    ],
    ports: scannedPorts,
    vulnerabilities,
    services,
    resolvedHostname: target !== ipAddress ? target : null,
    limitations,
  };
}

async function parseNmapOutput(stdout: string): Promise<{
  hosts: ParsedHost[];
  ports: ParsedPort[];
  vulnerabilities: ParsedVulnerability[];
  services: Array<{ ip_address: string; port: number; service_name: string | null; transport: string }>;
}> {
  const parsed = (await parseStringPromise(stdout, {
    explicitArray: false,
    mergeAttrs: true,
  })) as {
    nmaprun?: {
      host?: Record<string, unknown> | Record<string, unknown>[];
    };
  };

  const hosts: ParsedHost[] = [];
  const ports: ParsedPort[] = [];
  const vulnerabilities: ParsedVulnerability[] = [];
  const services: Array<{ ip_address: string; port: number; service_name: string | null; transport: string }> = [];

  for (const host of toArray(parsed.nmaprun?.host)) {
    const ipAddress = pickPrimaryAddress(host);
    const hostname = pickHostname(host);
    const osName = pickOsName(host);
    const mac = pickMacAddress(host);
    const latencyMs = pickLatencyMs(host);
    const statusRecord = host.status as Record<string, unknown> | undefined;
    const hostStatus =
      typeof statusRecord?.state === 'string' ? statusRecord.state : 'unknown';
    const portEntries = toArray(
      ((host.ports as Record<string, unknown> | undefined)?.port as
        | Record<string, unknown>
        | Record<string, unknown>[]
        | undefined) || undefined
    );

    let hostVulnerabilityCount = 0;

    for (const port of portEntries) {
      const stateRecord = port.state as Record<string, unknown> | undefined;
      const serviceRecord = port.service as Record<string, unknown> | undefined;
      const portNumber = parseInt(String(port.portid || '0'), 10);
      const portState =
        typeof stateRecord?.state === 'string' ? stateRecord.state : 'unknown';
      const serviceName =
        typeof serviceRecord?.name === 'string' ? serviceRecord.name : null;

      ports.push({
        ip_address: ipAddress,
        port: portNumber,
        protocol: String(port.protocol || 'tcp'),
        state: portState,
        service_name: serviceName,
        service_product:
          typeof serviceRecord?.product === 'string' ? serviceRecord.product : null,
        service_version:
          typeof serviceRecord?.version === 'string' ? serviceRecord.version : null,
        response_time_ms: latencyMs,
      });

      if (portState === 'open') {
        services.push({
          ip_address: ipAddress,
          port: portNumber,
          service_name: serviceName,
          transport: portNumber === 443 || portNumber === 8443 ? 'tls' : 'tcp',
        });
      }

      const scriptEntries = toArray(
        (port.script as Record<string, unknown> | Record<string, unknown>[]) || undefined
      );

      for (const script of scriptEntries) {
        const scriptId = typeof script.id === 'string' ? script.id : 'nmap-script';
        const description =
          typeof script.output === 'string'
            ? script.output
            : 'Nmap script produced output without a structured description.';

        vulnerabilities.push({
          ip_address: ipAddress,
          port: portNumber,
          type: scriptId,
          title: scriptId,
          severity: 'medium',
          confidence: 'medium',
          description,
          evidence: [
            {
              type: 'observation',
              description: `Nmap script ${scriptId} reported output for ${ipAddress}:${portNumber}.`,
              value: description,
            },
          ],
        });
        hostVulnerabilityCount += 1;
      }
    }

    hosts.push({
      ip_address: ipAddress,
      hostname,
      status: hostStatus,
      os_name: osName,
      mac_address: mac.address,
      vendor: mac.vendor,
      latency_ms: latencyMs,
      port_count: portEntries.length,
      vulnerability_count: hostVulnerabilityCount,
    });
  }

  return { hosts, ports, vulnerabilities, services };
}

export class IpScanProvider implements IpScanProviderContract {
  async execute(context: RunnerExecutionContext): Promise<ProviderResult> {
    const payload = (context.job.payload || {}) as IpScanPayload;
    const target = resolveTarget(payload);
    const args = buildNmapArgs(payload, target);

    await context.appendLog('info', 'Starting IP scan', {
      target,
      targetType: payload.target?.type || null,
      scanType: payload.config?.scanType || null,
      args,
    });

    if (context.updateStatus) {
      await context.updateStatus('running', {
        resultSummary: {
          progress: 5,
          targetValue: target,
          statusMessage: 'جاري تهيئة فحص IP',
          hosts: [],
          ports: [],
          vulnerabilities: [],
          services: [],
        },
      });
    }

    let hosts: ParsedHost[] = [];
    let ports: ParsedPort[] = [];
    let vulnerabilities: ParsedVulnerability[] = [];
    let services: NativeScanOutput['services'] = [];
    let rawXml: string | null = null;
    let executionMode: 'nmap' | 'native-tcp' = 'nmap';
    let limitations: string[] = [];

    try {
      await context.appendLog('info', 'Starting nmap execution', {
        target,
        args,
      });
      const { stdout } = await executeNmap(args);
      rawXml = stdout;
      const parsed = await parseNmapOutput(stdout);
      hosts = parsed.hosts;
      ports = parsed.ports;
      vulnerabilities = parsed.vulnerabilities;
      services = parsed.services;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown nmap execution error';
      if (!(error instanceof UnsupportedCapabilityError)) {
        throw error;
      }

      executionMode = 'native-tcp';
      await context.appendLog('warning', 'nmap unavailable, switching to native TCP scan', {
        reason: message,
      });

      const nativeOutput = await runNativeScan(payload, target, context);
      hosts = nativeOutput.hosts;
      ports = nativeOutput.ports;
      vulnerabilities = nativeOutput.vulnerabilities;
      services = nativeOutput.services;
      limitations = nativeOutput.limitations;
    }

    const resultSummary = {
      targetValue: target,
      progress: 100,
      totalHosts: hosts.length,
      totalPorts: ports.length,
      totalVulnerabilities: vulnerabilities.length,
      executionMode,
      hosts,
      ports,
      vulnerabilities,
      services,
      limitations,
      statusMessage: executionMode === 'nmap' ? 'اكتمل فحص IP عبر nmap' : 'اكتمل فحص IP عبر المحرك الداخلي',
    };

    await context.uploadArtifact({
      artifactType: 'SCAN_RESULTS',
      fileName: `ip-scan-${context.job.id}.json`,
      contentType: 'application/json',
      body: JSON.stringify(
        {
          scannedAt: new Date().toISOString(),
          target,
          args,
          executionMode,
          hosts,
          ports,
          vulnerabilities,
          services,
          limitations,
          rawXml,
        },
        null,
        2
      ),
      metadata: {
        totalHosts: hosts.length,
        totalPorts: ports.length,
        totalVulnerabilities: vulnerabilities.length,
        executionMode,
      },
    });

    await context.appendLog('info', 'Completed IP scan', {
      target,
      totalHosts: hosts.length,
      totalPorts: ports.length,
      totalVulnerabilities: vulnerabilities.length,
      executionMode,
    });

    return {
      summary: resultSummary,
    };
  }
}
