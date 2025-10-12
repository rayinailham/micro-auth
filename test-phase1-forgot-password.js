/**
 * Phase 1 Testing: Hybrid Forgot Password with Auto-Migration
 * 
 * This script tests the new forgot password functionality that:
 * 1. Handles Firebase users (with firebase_uid)
 * 2. Handles local users (without firebase_uid) with automatic migration
 * 3. Handles non-existent users
 */

const BASE_URL = 'http://localhost:3008';

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(80) + '\n');
}

function logTest(testName, passed, message, data = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const statusColor = passed ? colors.green : colors.red;
  
  log(`${status}: ${testName}`, statusColor);
  if (message) {
    log(`  Message: ${message}`, colors.yellow);
  }
  if (data) {
    console.log('  Data:', JSON.stringify(data, null, 2));
  }
  console.log();
}

async function makeRequest(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { response, data, status: response.status };
  } catch (error) {
    return { response: null, data: null, status: 0, error: error.message };
  }
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Database helper to check user state
async function checkUserInDatabase(email) {
  const { Pool } = require('pg');
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'fg_db',
    user: 'fg_user',
    password: 'fg_password',
  });

  try {
    const result = await pool.query(
      'SELECT id, email, firebase_uid, auth_provider, federation_status FROM auth.users WHERE email = $1',
      [email]
    );
    await pool.end();
    return result.rows[0] || null;
  } catch (error) {
    console.error('Database query error:', error);
    await pool.end();
    return null;
  }
}

// Test 1: Forgot Password for Non-existent User
async function testForgotPasswordNonExistent() {
  logSection('TEST 1: Forgot Password for Non-existent User');

  const testEmail = 'nonexistent-' + Date.now() + '@example.com';

  const { data, status } = await makeRequest('POST', '/v1/auth/forgot-password', {
    email: testEmail,
  });

  // Should return success (security best practice - don't reveal if email exists)
  if (status === 200 && data.success === true) {
    logTest(
      'Forgot password for non-existent user',
      true,
      'Returns success message without revealing user existence',
      { email: testEmail, message: data.message }
    );
  } else {
    logTest(
      'Forgot password for non-existent user',
      false,
      `Expected status 200, got ${status}`,
      data
    );
  }
}

// Test 2: Forgot Password for Local User (Auto-Migration)
async function testForgotPasswordLocalUser() {
  logSection('TEST 2: Forgot Password for Local User (Auto-Migration)');

  // Use a known local user from the database
  // According to the plan, there are 445 local users
  const testEmail = 'kasykoi@gmail.com'; // This is a test user mentioned in memories

  log('Step 1: Check user state BEFORE forgot password', colors.blue);
  const userBefore = await checkUserInDatabase(testEmail);
  
  if (!userBefore) {
    logTest(
      'Check local user exists',
      false,
      'Test user not found in database',
      { email: testEmail }
    );
    return;
  }

  log(`User found: ${userBefore.email}`, colors.green);
  log(`  - firebase_uid: ${userBefore.firebase_uid || 'NULL'}`, colors.yellow);
  log(`  - auth_provider: ${userBefore.auth_provider}`, colors.yellow);
  log(`  - federation_status: ${userBefore.federation_status}`, colors.yellow);

  const isLocalUser = !userBefore.firebase_uid;

  log('\nStep 2: Send forgot password request', colors.blue);
  const { data, status } = await makeRequest('POST', '/v1/auth/forgot-password', {
    email: testEmail,
  });

  if (status !== 200) {
    logTest(
      'Forgot password request',
      false,
      `Expected status 200, got ${status}`,
      data
    );
    return;
  }

  log('Forgot password request successful', colors.green);
  log(`  Message: ${data.message}`, colors.yellow);

  // Wait a bit for database update
  await wait(1000);

  log('\nStep 3: Check user state AFTER forgot password', colors.blue);
  const userAfter = await checkUserInDatabase(testEmail);

  if (!userAfter) {
    logTest(
      'Check user after forgot password',
      false,
      'User not found after forgot password',
      null
    );
    return;
  }

  log(`User state after forgot password:`, colors.green);
  log(`  - firebase_uid: ${userAfter.firebase_uid || 'NULL'}`, colors.yellow);
  log(`  - auth_provider: ${userAfter.auth_provider}`, colors.yellow);
  log(`  - federation_status: ${userAfter.federation_status}`, colors.yellow);

  // Verify migration occurred if user was local
  if (isLocalUser) {
    const migrationSuccessful = 
      userAfter.firebase_uid !== null &&
      userAfter.auth_provider === 'hybrid' &&
      userAfter.federation_status === 'active';

    logTest(
      'Local user auto-migration',
      migrationSuccessful,
      migrationSuccessful 
        ? 'User successfully migrated to Firebase'
        : 'Migration failed or incomplete',
      {
        before: {
          firebase_uid: userBefore.firebase_uid,
          auth_provider: userBefore.auth_provider,
          federation_status: userBefore.federation_status,
        },
        after: {
          firebase_uid: userAfter.firebase_uid,
          auth_provider: userAfter.auth_provider,
          federation_status: userAfter.federation_status,
        },
      }
    );
  } else {
    logTest(
      'Firebase user password reset',
      true,
      'Password reset email sent for existing Firebase user',
      { email: testEmail }
    );
  }
}

// Test 3: Forgot Password for Already Migrated User
async function testForgotPasswordHybridUser() {
  logSection('TEST 3: Forgot Password for Hybrid/Firebase User');

  // After Test 2, the user should be migrated
  const testEmail = 'kasykoi@gmail.com';

  log('Step 1: Check user state', colors.blue);
  const user = await checkUserInDatabase(testEmail);

  if (!user) {
    logTest(
      'Check user exists',
      false,
      'Test user not found in database',
      { email: testEmail }
    );
    return;
  }

  log(`User found: ${user.email}`, colors.green);
  log(`  - firebase_uid: ${user.firebase_uid || 'NULL'}`, colors.yellow);
  log(`  - auth_provider: ${user.auth_provider}`, colors.yellow);

  log('\nStep 2: Send forgot password request', colors.blue);
  const { data, status } = await makeRequest('POST', '/v1/auth/forgot-password', {
    email: testEmail,
  });

  const passed = status === 200 && data.success === true;

  logTest(
    'Forgot password for hybrid user',
    passed,
    passed 
      ? 'Password reset email sent successfully'
      : `Expected status 200, got ${status}`,
    { email: testEmail, message: data.message }
  );
}

// Test 4: Multiple Forgot Password Requests (Idempotency)
async function testForgotPasswordIdempotency() {
  logSection('TEST 4: Multiple Forgot Password Requests (Idempotency)');

  const testEmail = 'kasykoi@gmail.com';

  log('Sending 3 consecutive forgot password requests...', colors.blue);

  const results = [];
  for (let i = 1; i <= 3; i++) {
    log(`\nRequest ${i}:`, colors.yellow);
    const { data, status } = await makeRequest('POST', '/v1/auth/forgot-password', {
      email: testEmail,
    });
    
    results.push({ status, success: data.success, message: data.message });
    log(`  Status: ${status}`, colors.cyan);
    log(`  Success: ${data.success}`, colors.cyan);
    
    await wait(500);
  }

  const allSuccessful = results.every(r => r.status === 200 && r.success === true);

  logTest(
    'Idempotency test',
    allSuccessful,
    allSuccessful
      ? 'All requests handled successfully without errors'
      : 'Some requests failed',
    { results }
  );
}

// Main test runner
async function runTests() {
  log('\n' + '█'.repeat(80), colors.bright + colors.blue);
  log('  PHASE 1 TESTING: HYBRID FORGOT PASSWORD WITH AUTO-MIGRATION', colors.bright + colors.blue);
  log('█'.repeat(80) + '\n', colors.bright + colors.blue);

  try {
    await testForgotPasswordNonExistent();
    await wait(1000);

    await testForgotPasswordLocalUser();
    await wait(1000);

    await testForgotPasswordHybridUser();
    await wait(1000);

    await testForgotPasswordIdempotency();

    logSection('TEST SUMMARY');
    log('All Phase 1 tests completed!', colors.bright + colors.green);
    log('\nNext steps:', colors.yellow);
    log('1. Check Firebase console for password reset emails', colors.cyan);
    log('2. Verify migration logs in auth-v2-service logs', colors.cyan);
    log('3. Check database for updated firebase_uid values', colors.cyan);

  } catch (error) {
    log('\n❌ Test suite failed with error:', colors.red);
    console.error(error);
  }
}

// Run tests
runTests();

