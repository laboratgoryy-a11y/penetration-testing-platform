import { query, getClient, closeConnections } from '../database/connection';

describe('Database Connection', () => {
  afterAll(async () => {
    await closeConnections();
  });

  test('should connect to PostgreSQL', async () => {
    const result = await query('SELECT NOW() as current_time');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toHaveProperty('current_time');
  });

  test('should get a client from the pool', async () => {
    const client = await getClient();
    expect(client).toBeDefined();
    
    const result = await client.query('SELECT 1 as value');
    expect(result.rows[0].value).toBe(1);
    
    client.release();
  });

  test('should handle query errors gracefully', async () => {
    await expect(query('INVALID SQL QUERY')).rejects.toThrow();
  });
});
