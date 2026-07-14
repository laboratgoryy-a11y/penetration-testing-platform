import { randomUUID } from 'crypto';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { config } from './config';
import { getRedisClient, pgPool } from './database/connection';
import { errorHandlerMiddleware } from './api/middleware/errorHandler';
import { apiLimiter } from './api/middleware/rateLimiter';
import authRoutes from './api/routes/auth.routes';
import authorizationsRoutes from './api/routes/authorizations.routes';
import dashboardRoutes from './api/routes/dashboard.routes';
import ipScanRoutes from './api/routes/ipScanRoutes';
import jobsRoutes from './api/routes/jobs.routes';
import networkRoutes from './api/routes/network.routes';
import phishingRoutes from './api/routes/phishing.routes';
import reportsRoutes from './api/routes/reports.routes';
import runnersRoutes from './api/routes/runners.routes';
import scansRoutes from './api/routes/scans.routes';
import {
  checkInternetConnectivity,
  internetConnectivityMiddleware,
} from './core/connectivity/internetConnectivity';
import { createDevFallbackApp } from './dev/devFallbackApp';

const app: Application = express();
const swaggerDocument = YAML.load(path.join(__dirname, 'api/openapi.yaml'));

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/', apiLimiter);
app.use(internetConnectivityMiddleware);

app.use((req: Request, _res: Response, next) => {
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = `req_${randomUUID()}`;
  }
  next();
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: config.apiVersion,
    },
  });
});

app.get('/api/v1/system/connectivity', async (_req, res) => {
  const status = await checkInternetConnectivity(true);
  res.status(status.online ? 200 : 503).json({
    success: status.online,
    data: status,
    error: status.online
      ? undefined
      : {
          code: 'INTERNET_CONNECTION_REQUIRED',
          message: status.message,
        },
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/authorizations', authorizationsRoutes);
app.use('/api/v1/scans', scansRoutes);
app.use('/api/v1/phishing', phishingRoutes);
app.use('/api/v1/network', networkRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/ip-scans', ipScanRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1/runners', runnersRoutes);
app.use('/api/v1', reportsRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandlerMiddleware);

async function startServer(): Promise<void> {
  try {
    await pgPool.query('SELECT NOW()');
    const redis = await getRedisClient();
    await redis.ping();
  } catch (error) {
    if (config.nodeEnv !== 'development') {
      throw error;
    }

    console.warn(
      'Database or Redis is unavailable. Starting development memory fallback server.'
    );
    console.warn(error);
    const fallbackApp = createDevFallbackApp();
    fallbackApp.listen(config.port, () => {
      console.info(`Server running on port ${config.port}`);
      console.info('Environment: development-memory-fallback');
      console.info(`API Version: ${config.apiVersion}`);
    });
    return;
  }

  app.listen(config.port, () => {
    console.info(`Server running on port ${config.port}`);
    console.info(`Environment: ${config.nodeEnv}`);
    console.info(`API Version: ${config.apiVersion}`);
  });
}

process.on('SIGTERM', async () => {
  await pgPool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await pgPool.end();
  process.exit(0);
});

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Server startup failed', error);
    process.exit(1);
  });
}

export { app, startServer };
