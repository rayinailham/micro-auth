import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { initFirebase, validateFirebaseConfig } from './config/firebase-config';
import authRoutes from './routes/auth';
import { sendSuccess, sendNotFound } from './utils/response';

// Initialize Firebase on startup
try {
  validateFirebaseConfig();
  initFirebase();
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error);
  process.exit(1);
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
app.get('/health', (c) => {
  return sendSuccess(c, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'auth-service',
    version: '1.0.0'
  }, 'Service is healthy');
});

// API routes
app.route('/v1/auth', authRoutes);

// Root endpoint
app.get('/', (c) => {
  return sendSuccess(c, {
    service: 'TryFitOut Auth Service',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/v1/auth'
    }
  }, 'Auth service is running');
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
const port = parseInt(process.env.PORT || '3001');

console.log(`🚀 Starting TryFitOut Auth Service on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
