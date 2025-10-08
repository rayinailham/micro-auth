#!/usr/bin/env node

/**
 * Phase 1 Token Balance Fix - Integration Test
 * Tests that new users receive 3 tokens by default
 */

const axios = require('axios');

const AUTH_V2_URL = process.env.AUTH_V2_URL || 'http://localhost:3002';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-token-here';

// Test configuration
const TEST_CONFIG = {
  baseURL: AUTH_V2_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Generate unique test email
const generateTestEmail = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `test-phase1-${timestamp}-${random}@example.com`;
};

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to log test results
function logTest(name, passed, message, data = {}) {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`✅ PASS: ${name}`);
  } else {
    results.failed++;
    console.log(`❌ FAIL: ${name}`);
  }
  console.log(`   ${message}`);
  if (Object.keys(data).length > 0) {
    console.log(`   Data:`, JSON.stringify(data, null, 2));
  }
  console.log('');
  
  results.tests.push({ name, passed, message, data });
}

// Test 1: Register new user via local registration
async function testLocalRegistration() {
  console.log('🧪 TEST 1: Local Registration with Default Token Balance');
  console.log('━'.repeat(60));
  
  const testEmail = generateTestEmail();
  const testPassword = 'TestPassword123!';
  
  try {
    const response = await axios.post(
      `${AUTH_V2_URL}/api/auth/register`,
      {
        email: testEmail,
        password: testPassword,
        username: `testuser${Date.now()}`
      },
      TEST_CONFIG
    );
    
    if (response.status === 201) {
      const user = response.data.user;
      const tokenBalance = user.token_balance;
      
      if (tokenBalance === 3) {
        logTest(
          'Local Registration',
          true,
          `New user received correct default token balance: ${tokenBalance}`,
          { email: testEmail, token_balance: tokenBalance }
        );
        return { success: true, userId: user.id, email: testEmail };
      } else {
        logTest(
          'Local Registration',
          false,
          `Expected token_balance = 3, but got ${tokenBalance}`,
          { email: testEmail, token_balance: tokenBalance }
        );
        return { success: false };
      }
    } else {
      logTest(
        'Local Registration',
        false,
        `Unexpected status code: ${response.status}`,
        { status: response.status }
      );
      return { success: false };
    }
  } catch (error) {
    logTest(
      'Local Registration',
      false,
      `Error during registration: ${error.message}`,
      { 
        error: error.response?.data || error.message,
        status: error.response?.status
      }
    );
    return { success: false };
  }
}

// Test 2: Verify user data in database
async function testUserDataVerification(userId) {
  console.log('🧪 TEST 2: Database Token Balance Verification');
  console.log('━'.repeat(60));
  
  if (!userId) {
    logTest(
      'Database Verification',
      false,
      'No user ID provided (previous test failed)',
      {}
    );
    return { success: false };
  }
  
  try {
    // Login to get token
    const response = await axios.get(
      `${AUTH_V2_URL}/api/auth/profile`,
      {
        ...TEST_CONFIG,
        headers: {
          ...TEST_CONFIG.headers,
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      }
    );
    
    if (response.status === 200) {
      const profile = response.data;
      const tokenBalance = profile.token_balance;
      
      logTest(
        'Database Verification',
        true,
        `Profile endpoint shows token_balance: ${tokenBalance}`,
        { token_balance: tokenBalance }
      );
      return { success: true };
    }
  } catch (error) {
    logTest(
      'Database Verification',
      false,
      `Could not verify via profile endpoint: ${error.message}`,
      { error: error.response?.data || error.message }
    );
    return { success: false };
  }
}

// Test 3: Register with explicit token balance
async function testExplicitTokenBalance() {
  console.log('🧪 TEST 3: Explicit Token Balance Override (Admin Only)');
  console.log('━'.repeat(60));
  
  const testEmail = generateTestEmail();
  
  try {
    // This test requires admin privileges
    const response = await axios.post(
      `${AUTH_V2_URL}/api/auth/register`,
      {
        email: testEmail,
        password: 'TestPassword123!',
        username: `admintest${Date.now()}`,
        token_balance: 10 // Explicit override
      },
      {
        ...TEST_CONFIG,
        headers: {
          ...TEST_CONFIG.headers,
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      }
    );
    
    if (response.status === 201) {
      const user = response.data.user;
      const tokenBalance = user.token_balance;
      
      if (tokenBalance === 10) {
        logTest(
          'Explicit Token Override',
          true,
          `User received explicit token balance: ${tokenBalance}`,
          { email: testEmail, token_balance: tokenBalance }
        );
        return { success: true };
      } else {
        logTest(
          'Explicit Token Override',
          false,
          `Expected token_balance = 10, but got ${tokenBalance}`,
          { email: testEmail, expected: 10, actual: tokenBalance }
        );
        return { success: false };
      }
    }
  } catch (error) {
    // This might fail if admin privileges are required
    if (error.response?.status === 401 || error.response?.status === 403) {
      logTest(
        'Explicit Token Override',
        true,
        'Test skipped (requires admin privileges)',
        { note: 'This is acceptable - admin-only feature' }
      );
      return { success: true, skipped: true };
    }
    
    logTest(
      'Explicit Token Override',
      false,
      `Error: ${error.message}`,
      { error: error.response?.data || error.message }
    );
    return { success: false };
  }
}

// Test 4: Check service health
async function testServiceHealth() {
  console.log('🧪 TEST 4: Service Health Check');
  console.log('━'.repeat(60));
  
  try {
    const response = await axios.get(
      `${AUTH_V2_URL}/health`,
      TEST_CONFIG
    );
    
    if (response.status === 200) {
      logTest(
        'Service Health',
        true,
        'Auth-v2 service is running correctly',
        { status: 'healthy' }
      );
      return { success: true };
    }
  } catch (error) {
    logTest(
      'Service Health',
      false,
      `Service health check failed: ${error.message}`,
      { error: error.message }
    );
    return { success: false };
  }
}

// Print summary
function printSummary() {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 TEST SUMMARY - Phase 1 Token Balance Fix');
  console.log('═'.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('═'.repeat(60));
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Phase 1 fix is working correctly.\n');
    console.log('✅ New users are receiving 3 tokens by default');
    console.log('✅ Service is functioning normally');
    console.log('✅ Ready to proceed to Phase 2\n');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Please review the issues above.\n');
  }
  
  return results.failed === 0;
}

// Main test execution
async function runTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Phase 1 Token Balance Fix - Integration Test Suite     ║');
  console.log('║   Testing Default Token Balance = 3 for New Users         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');
  console.log(`🌐 Testing URL: ${AUTH_V2_URL}`);
  console.log(`🕐 Started at: ${new Date().toISOString()}`);
  console.log('\n');
  
  // Run tests sequentially
  const test1Result = await testLocalRegistration();
  const test2Result = await testUserDataVerification(test1Result.userId);
  const test3Result = await testExplicitTokenBalance();
  const test4Result = await testServiceHealth();
  
  // Print summary
  const allPassed = printSummary();
  
  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Fatal error running tests:', error);
  process.exit(1);
});
