const { createClient } = require('redis');
require('dotenv').config();

async function testRedis() {
  try {
    console.log('Testing Redis connection...');
    const client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
    });

    await client.connect();
    const pong = await client.ping();
    console.log('✓ Redis connected successfully!');
    console.log('  Response:', pong);
    
    await client.quit();
    process.exit(0);
  } catch (error) {
    console.error('✗ Redis connection failed:', error.message);
    process.exit(1);
  }
}

testRedis();
