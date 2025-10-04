import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { initFirebase, validateFirebaseConfig } from './config/firebase-config';
import { initDatabase, validateDatabaseConfig, checkDatabaseHealth } from './config/database-config';
import { initRedis, validateRedisConfig, checkRedisHealth } from './config/redis-config';
import authRoutes from './routes/auth';
import tokenRoutes from './routes/token';
import { sendSuccess, sendNotFound } from './utils/response';

// Initialize Firebase on startup
try {
  // For testing purposes, allow server to start even without Firebase config
  if (process.env.FIREBASE_PROJECT_ID) {
    validateFirebaseConfig();
    initFirebase();
    console.log('✅ Firebase initialized successfully');
  } else {
    console.log('⚠️  Firebase not configured - running in test mode');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error);
  console.log('⚠️  Continuing without Firebase for testing...');
}

// Initialize Database on startup
try {
  if (process.env.DB_HOST) {
    validateDatabaseConfig();
    initDatabase();
    console.log('✅ Database initialized successfully');
  } else {
    console.log('⚠️  Database not configured - running without database');
  }
} catch (error) {
  console.error('❌ Failed to initialize Database:', error);
  console.log('⚠️  Continuing without Database...');
}

// Initialize Redis on startup
try {
  if (process.env.REDIS_HOST) {
    validateRedisConfig();
    initRedis();
    console.log('✅ Redis initialized successfully');
  } else {
    console.log('⚠️  Redis not configured - running without cache');
  }
} catch (error) {
  console.error('❌ Failed to initialize Redis:', error);
  console.log('⚠️  Continuing without Redis...');
}

// Create Hono app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://tryfitout.com', 'https://api.tryfitout.com'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Health check endpoint
app.get('/health', async (c) => {
  const dbHealth = await checkDatabaseHealth();
  const redisHealth = await checkRedisHealth();

  const isHealthy = dbHealth.healthy && redisHealth.healthy;

  return c.json({
    success: true,
    data: {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'auth-v2-service',
      version: '1.0.0',
      dependencies: {
        database: dbHealth,
        redis: redisHealth,
      }
    },
    message: isHealthy ? 'Service is healthy' : 'Service is degraded',
    timestamp: new Date().toISOString()
  }, isHealthy ? 200 : 503);
});

// API routes
app.route('/v1/auth', authRoutes);
app.route('/v1/token', tokenRoutes);

// Root endpoint
app.get('/', (c) => {
  return sendSuccess(c, {
    service: 'Auth V2 Service (Firebase + PostgreSQL)',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      auth: '/v1/auth',
      token: '/v1/token'
    }
  }, 'Auth V2 service is running');
});

// 404 handler
app.notFound((c) => {
  return sendNotFound(c, 'Endpoint not found');
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    },
    message: 'Operation failed',
    timestamp: new Date().toISOString()
  }, 500);
});

// Start server
const port = parseInt(process.env.PORT || '3008');

console.log(`🚀 Starting Microservice Auth Boilerplate on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
