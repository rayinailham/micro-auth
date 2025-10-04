import { Pool, PoolClient, PoolConfig } from 'pg';

// Database configuration interface
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  schema: string;
  pool: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
}

// Global pool instance
let pool: Pool | null = null;

/**
 * Get database configuration from environment variables
 */
export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'atma_db',
    user: process.env.DB_USER || 'atma_user',
    password: process.env.DB_PASSWORD || '',
    schema: process.env.DB_SCHEMA || 'auth',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000'),
    },
  };
}

/**
 * Initialize database connection pool
 */
export function initDatabase(): Pool {
  if (pool) {
    return pool;
  }

  const config = getDatabaseConfig();

  const poolConfig: PoolConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: config.pool.max,
    min: config.pool.min,
    idleTimeoutMillis: config.pool.idle,
    connectionTimeoutMillis: config.pool.acquire,
    // Set search_path to use the correct schema
    options: `-c search_path=${config.schema},public`,
  };

  pool = new Pool(poolConfig);

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });

  // Handle pool connection
  pool.on('connect', () => {
    console.log('✅ New database connection established');
  });

  // Handle pool removal
  pool.on('remove', () => {
    console.log('🔌 Database connection removed from pool');
  });

  console.log(`✅ Database pool initialized (min: ${config.pool.min}, max: ${config.pool.max})`);

  return pool;
}

/**
 * Get database pool instance
 */
export function getDatabase(): Pool {
  if (!pool) {
    return initDatabase();
  }
  return pool;
}

/**
 * Execute a query with automatic connection management
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const db = getDatabase();
  try {
    const result = await db.query(text, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
    };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  const db = getDatabase();
  return await db.connect();
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  message: string;
  details?: any;
}> {
  try {
    const db = getDatabase();
    const result = await db.query('SELECT NOW() as current_time, current_database() as database');
    
    return {
      healthy: true,
      message: 'Database connection is healthy',
      details: {
        currentTime: result.rows[0].current_time,
        database: result.rows[0].database,
        poolSize: db.totalCount,
        idleConnections: db.idleCount,
        waitingClients: db.waitingCount,
      },
    };
  } catch (error: any) {
    console.error('Database health check failed:', error);
    return {
      healthy: false,
      message: 'Database connection failed',
      details: {
        error: error.message,
      },
    };
  }
}

/**
 * Close database pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔌 Database pool closed');
  }
}

/**
 * Validate database configuration
 */
export function validateDatabaseConfig(): void {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missingVars.join(', ')}`
    );
  }
}

