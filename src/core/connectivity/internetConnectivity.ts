import { promises as dns } from 'dns';
import { Request, Response, NextFunction } from 'express';
import { config } from '../../config';

const INTERNET_REQUIRED_MESSAGE = 'يرجى الاتصال بالإنترنت';

export interface InternetConnectivityStatus {
  required: boolean;
  online: boolean;
  checkedAt: string;
  host: string;
  cached: boolean;
  message: string;
  error?: string;
}

let cachedStatus: InternetConnectivityStatus | null = null;
let pendingCheck: Promise<InternetConnectivityStatus> | null = null;

function buildDisabledStatus(): InternetConnectivityStatus {
  return {
    required: false,
    online: true,
    checkedAt: new Date().toISOString(),
    host: config.connectivity.checkHosts[0],
    cached: false,
    message: 'الاتصال بالإنترنت متوفر.',
  };
}

async function lookupAnyHost(hosts: string[]): Promise<string> {
  let lastError: unknown;

  for (const host of hosts) {
    try {
      await dns.lookup(host);
      return host;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(INTERNET_REQUIRED_MESSAGE);
}

export async function checkInternetConnectivity(
  force = false
): Promise<InternetConnectivityStatus> {
  if (!config.connectivity.requireInternet) {
    return buildDisabledStatus();
  }

  const now = Date.now();
  if (
    !force &&
    cachedStatus &&
    now - Date.parse(cachedStatus.checkedAt) < config.connectivity.cacheTtlMs
  ) {
    return { ...cachedStatus, cached: true };
  }

  if (pendingCheck) {
    return pendingCheck;
  }

  pendingCheck = (async () => {
    const checkedAt = new Date().toISOString();
    const hosts = config.connectivity.checkHosts;

    try {
      const host = await Promise.race([
        lookupAnyHost(hosts),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(INTERNET_REQUIRED_MESSAGE)),
            config.connectivity.timeoutMs
          )
        ),
      ]);

      cachedStatus = {
        required: true,
        online: true,
        checkedAt,
        host,
        cached: false,
        message: 'الاتصال بالإنترنت متوفر.',
      };
    } catch (error) {
      cachedStatus = {
        required: true,
        online: false,
        checkedAt,
        host: hosts.join(', '),
        cached: false,
        message: INTERNET_REQUIRED_MESSAGE,
        error: error instanceof Error ? error.message : INTERNET_REQUIRED_MESSAGE,
      };
    } finally {
      pendingCheck = null;
    }

    return cachedStatus;
  })();

  return pendingCheck;
}

export function isConnectivityCheckPath(path: string): boolean {
  return path === '/api/v1/system/connectivity' || path === '/health';
}

export async function internetConnectivityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.path.startsWith('/api/') || isConnectivityCheckPath(req.path)) {
    next();
    return;
  }

  const status = await checkInternetConnectivity();
  if (status.online) {
    next();
    return;
  }

  res.status(503).json({
    success: false,
    error: {
      code: 'INTERNET_CONNECTION_REQUIRED',
      message: INTERNET_REQUIRED_MESSAGE,
      details: status,
    },
    timestamp: new Date().toISOString(),
  });
}
