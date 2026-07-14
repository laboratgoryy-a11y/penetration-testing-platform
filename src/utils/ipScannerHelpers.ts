import { randomUUID } from 'crypto';

export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  return ipv6Regex.test(ip);
}

export function isValidCIDR(cidr: string): boolean {
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

  if (!cidrRegex.test(cidr)) {
    return false;
  }

  const [ip, mask] = cidr.split('/');
  const maskNum = parseInt(mask, 10);

  return isValidIP(ip) && maskNum >= 0 && maskNum <= 32;
}

export function isValidIPRange(range: string): boolean {
  const rangeRegex = /^(\d{1,3}\.){3}\d{1,3}-(\d{1,3}\.){3}\d{1,3}$/;

  if (!rangeRegex.test(range)) {
    return false;
  }

  const [startIP, endIP] = range.split('-');
  return isValidIP(startIP) && isValidIP(endIP);
}

export function isValidHostname(hostname: string): boolean {
  const hostnameRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return hostnameRegex.test(hostname);
}

export function isIPInRange(ip: string, range: string): boolean {
  if (!isValidIP(ip) || !isValidIPRange(range)) {
    return false;
  }

  const [startIP, endIP] = range.split('-');
  const ipValue = ipv4ToLong(ip);
  return ipValue >= ipv4ToLong(startIP) && ipValue <= ipv4ToLong(endIP);
}

export function cidrToRange(cidr: string): { start: string; end: string } {
  if (!isValidCIDR(cidr)) {
    throw new Error('Invalid CIDR');
  }

  const [ip, mask] = cidr.split('/');
  const maskNum = parseInt(mask, 10);
  const ipValue = ipv4ToLong(ip);
  const networkMask = maskNum === 0 ? 0 : (0xffffffff << (32 - maskNum)) >>> 0;
  const start = ipValue & networkMask;
  const end = start | (~networkMask >>> 0);

  return {
    start: longToIpv4(start),
    end: longToIpv4(end),
  };
}

export function countIPsInRange(range: string): number {
  if (!isValidIPRange(range)) {
    throw new Error('Invalid IP range');
  }

  const [startIP, endIP] = range.split('-');
  return ipv4ToLong(endIP) - ipv4ToLong(startIP) + 1;
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9-_.]/g, '_');
}

export function generateSessionId(): string {
  return `scan_${randomUUID()}`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}s`);
  }

  return parts.join(' ');
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function ipv4ToLong(ip: string): number {
  return ip
    .split('.')
    .map((part) => parseInt(part, 10))
    .reduce((accumulator, octet) => (accumulator << 8) + octet, 0) >>> 0;
}

function longToIpv4(value: number): string {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join('.');
}
