import { spawnSync } from 'child_process';

function isCommandAvailable(command: string, args: string[]): boolean {
  const result = spawnSync(command, args, {
    stdio: 'ignore',
  });

  return !result.error && result.status === 0;
}

function isPhishingDeliveryConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() && process.env.EMAIL_FROM_EMAIL?.trim()
  );
}

export function discoverRunnerTools(
  explicitTools: string[],
  platform: NodeJS.Platform = process.platform
): string[] {
  const tools = new Set(explicitTools);

  if (isCommandAvailable('nmap', ['--version'])) {
    tools.add('nmap');
  }

  if (platform === 'win32' && isCommandAvailable('netsh', ['wlan', 'show', 'interfaces'])) {
    tools.add('netsh-wlan');
  }

  if (platform === 'linux' && isCommandAvailable('nmcli', ['device', 'status'])) {
    tools.add('nmcli');
  }

  return Array.from(tools);
}

export function discoverRunnerCapabilities(
  explicitCapabilities: string[],
  tools: string[]
): string[] {
  const capabilities = new Set(explicitCapabilities);

  capabilities.add('REPORT_GENERATION');
  capabilities.add('WEB_SCAN');

  if (tools.includes('nmap')) {
    capabilities.add('IP_SCAN');
  }

  if (tools.includes('netsh-wlan') || tools.includes('nmcli')) {
    capabilities.add('WIRELESS_ASSESSMENT');
  }

  if (isPhishingDeliveryConfigured()) {
    capabilities.add('PHISHING_DISPATCH');
  }

  return Array.from(capabilities);
}
