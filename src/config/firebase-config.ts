import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let app: App;
let auth: Auth;

export function initFirebase(): App {
  // Check if Firebase app is already initialized
  if (getApps().length === 0) {
    // Validate required environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Missing required Firebase environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
      );
    }

    // Initialize Firebase Admin SDK
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    app = getApps()[0];
  }
  
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    if (!app) {
      initFirebase();
    }
    auth = getAuth(app);
  }
  return auth;
}

// Firebase Auth REST API configuration
export const FIREBASE_AUTH_CONFIG = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.FIREBASE_PROJECT_ID,
};

// Firebase Auth REST API endpoints
export const FIREBASE_AUTH_ENDPOINTS = {
  signUp: `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_AUTH_CONFIG.apiKey}`,
  signIn: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_AUTH_CONFIG.apiKey}`,
  refreshToken: `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_AUTH_CONFIG.apiKey}`,
  deleteAccount: `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_AUTH_CONFIG.apiKey}`,
  sendPasswordResetEmail: `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_AUTH_CONFIG.apiKey}`,
  resetPassword: `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${FIREBASE_AUTH_CONFIG.apiKey}`,
};

// Validate Firebase configuration on startup
export function validateFirebaseConfig() {
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_API_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}
