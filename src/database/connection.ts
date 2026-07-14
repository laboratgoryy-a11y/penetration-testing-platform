import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { RedisClientType, createClient } from 'redis';
import { config } from '../config';

let redisClient: RedisClientType | null = null;

export const pgPool = new Pool({
  connectionString: config.database.url,
  max: config.database.maxConnections,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : undefined,
});

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({ url: config.redis.url });
    redisClient.on('error', (error) => {
      console.error('Redis client error', error);
    });
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  return redisClient;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pgPool.query<T>(text, params);
}

export async function getClient(): Promise<PoolClient> {
  return pgPool.connect();
}

export async function closeConnections(): Promise<void> {
  await pgPool.end();
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
}
