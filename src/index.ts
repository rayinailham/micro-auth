import { Hono } from 'hono';
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Add your frontend URLs here
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
})); { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { initFirebase, validateFirebaseConfig } from './config/firebase-config';
import authRoutes from './routes/auth';
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
    service: 'Microservice Auth Boilerplate',
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
const port = parseInt(process.env.PORT || '8001');

console.log(`🚀 Starting Microservice Auth Boilerplate on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
