import Redis, { RedisOptions } from 'ioredis';

// Redis configuration interface
interface RedisConfig {
  host: string;
  port: number;
  password: string;
  db: number;
  keyPrefix: string;
}

// Global Redis instance
let redis: Redis | null = null;

/**
 * Get Redis configuration from environment variables
 */
export function getRedisConfig(): RedisConfig {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '1'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'atma:auth-v2:',
  };
}

/**
 * Initialize Redis connection
 */
export function initRedis(): Redis {
  if (redis) {
    return redis;
  }

  const config = getRedisConfig();

  const options: RedisOptions = {
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    keyPrefix: config.keyPrefix,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  };

  redis = new Redis(options);

  // Handle Redis events
  redis.on('connect', () => {
    console.log('✅ Redis connection established');
  });

  redis.on('ready', () => {
    console.log('✅ Redis is ready to accept commands');
  });

  redis.on('error', (err) => {
    console.error('❌ Redis error:', err);
  });

  redis.on('close', () => {
    console.log('🔌 Redis connection closed');
  });

  redis.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });

  console.log(`✅ Redis initialized (${config.host}:${config.port}, db: ${config.db})`);

  return redis;
}

/**
 * Get Redis instance
 */
export function getRedis(): Redis {
  if (!redis) {
    return initRedis();
  }
  return redis;
}

/**
 * Cache token verification result
 * @param token Firebase ID token
 * @param userData User data to cache
 * @param ttl Time to live in seconds (default: 300 = 5 minutes)
 */
export async function cacheTokenVerification(
  token: string,
  userData: any,
  ttl: number = 300
): Promise<void> {
  try {
    const redis = getRedis();
    const key = `token:${token}`;
    await redis.setex(key, ttl, JSON.stringify(userData));
  } catch (error) {
    console.error('Failed to cache token verification:', error);
    // Don't throw error - caching failure should not break the flow
  }
}

/**
 * Get cached token verification result
 * @param token Firebase ID token
 * @returns Cached user data or null if not found
 */
export async function getCachedTokenVerification(
  token: string
): Promise<any | null> {
  try {
    const redis = getRedis();
    const key = `token:${token}`;
    const cached = await redis.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get cached token verification:', error);
    return null;
  }
}

/**
 * Invalidate cached token
 * @param token Firebase ID token
 */
export async function invalidateTokenCache(token: string): Promise<void> {
  try {
    const redis = getRedis();
    const key = `token:${token}`;
    await redis.del(key);
  } catch (error) {
    console.error('Failed to invalidate token cache:', error);
  }
}

/**
 * Invalidate all cached tokens for a user
 * @param firebaseUid Firebase user ID
 */
export async function invalidateUserTokens(firebaseUid: string): Promise<void> {
  try {
    const redis = getRedis();
    const pattern = `token:*`;
    
    // Scan for all token keys and delete those belonging to the user
    // Note: This is a simplified implementation. In production, consider using a separate index
    const stream = redis.scanStream({
      match: pattern,
      count: 100,
    });

    stream.on('data', async (keys: string[]) => {
      if (keys.length) {
        const pipeline = redis.pipeline();
        for (const key of keys) {
          const data = await redis.get(key);
          if (data) {
            const parsed = JSON.parse(data);
            if (parsed.firebaseUid === firebaseUid) {
              pipeline.del(key);
            }
          }
        }
        await pipeline.exec();
      }
    });

    stream.on('end', () => {
      console.log(`Invalidated all tokens for user: ${firebaseUid}`);
    });
  } catch (error) {
    console.error('Failed to invalidate user tokens:', error);
  }
}

/**
 * Check Redis health
 */
export async function checkRedisHealth(): Promise<{
  healthy: boolean;
  message: string;
  details?: any;
}> {
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    
    if (pong === 'PONG') {
      return {
        healthy: true,
        message: 'Redis connection is healthy',
        details: {
          status: redis.status,
          db: getRedisConfig().db,
        },
      };
    }
    
    return {
      healthy: false,
      message: 'Redis ping failed',
    };
  } catch (error: any) {
    console.error('Redis health check failed:', error);
    return {
      healthy: false,
      message: 'Redis connection failed',
      details: {
        error: error.message,
      },
    };
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('🔌 Redis connection closed');
  }
}

/**
 * Validate Redis configuration
 */
export function validateRedisConfig(): void {
  const requiredEnvVars = [
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Redis environment variables: ${missingVars.join(', ')}`
    );
  }
}

