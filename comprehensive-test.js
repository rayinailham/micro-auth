#!/usr/bin/env node

const BASE_URL = "http://localhost:3001";
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = "TestPass123";
const TEST_DISPLAY_NAME = "Test User";

// ANSI color codes for better output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

// Test results storage
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
  startTime: new Date(),
  endTime: null,
};

// Global state for storing tokens and data
const state = {
  idToken: null,
  refreshToken: null,
  uid: null,
  email: TEST_EMAIL,
};

// Helper function to make HTTP requests
async function makeRequest(method, endpoint, body = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
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
    return { error: error.message, status: 0 };
  }
}

// Helper function to log test results
function logTest(name, passed, message, details = null) {
  testResults.total++;
  const result = {
    name,
    passed,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
  testResults.tests.push(result);

  if (passed) {
    testResults.passed++;
    console.log(
      `${colors.green}✓${colors.reset} ${colors.bright}${name}${colors.reset}`
    );
    console.log(`  ${colors.green}${message}${colors.reset}`);
  } else {
    testResults.failed++;
    console.log(
      `${colors.red}✗${colors.reset} ${colors.bright}${name}${colors.reset}`
    );
    console.log(`  ${colors.red}${message}${colors.reset}`);
  }

  if (details) {
    console.log(`  ${colors.cyan}Details: ${JSON.stringify(details, null, 2)}${colors.reset}`);
  }
  console.log("");
}

function logSkipped(name, reason) {
  testResults.total++;
  testResults.skipped++;
  testResults.tests.push({
    name,
    passed: false,
    skipped: true,
    message: reason,
    timestamp: new Date().toISOString(),
  });
  console.log(
    `${colors.yellow}⊘${colors.reset} ${colors.bright}${name}${colors.reset}`
  );
  console.log(`  ${colors.yellow}Skipped: ${reason}${colors.reset}\n`);
}

function logSection(title) {
  console.log(
    `\n${colors.bright}${colors.magenta}${"=".repeat(60)}${colors.reset}`
  );
  console.log(
    `${colors.bright}${colors.magenta}${title}${colors.reset}`
  );
  console.log(
    `${colors.bright}${colors.magenta}${"=".repeat(60)}${colors.reset}\n`
  );
}

// Wait helper
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Test 1: Health Check
async function testHealthCheck() {
  logSection("TEST 1: Health Check Endpoint");
  const { response, data, status } = await makeRequest("GET", "/health");

  if (status === 200 && data.success === true && data.data.status === "healthy") {
    logTest(
      "GET /health",
      true,
      "Health check endpoint working correctly",
      data.data
    );
  } else {
    logTest(
      "GET /health",
      false,
      `Expected status 200 and healthy response, got ${status}`,
      data
    );
  }
}

// Test 2: Root Endpoint
async function testRootEndpoint() {
  logSection("TEST 2: Root Endpoint");
  const { response, data, status } = await makeRequest("GET", "/");

  if (
    status === 200 &&
    data.success === true &&
    data.data.service === "Microservice Auth Boilerplate"
  ) {
    logTest(
      "GET /",
      true,
      "Root endpoint returning service information",
      data.data
    );
  } else {
    logTest(
      "GET /",
      false,
      `Expected status 200 and service info, got ${status}`,
      data
    );
  }
}

// Test 3: Register User
async function testRegister() {
  logSection("TEST 3: User Registration");

  // Test with valid data
  const { response, data, status } = await makeRequest(
    "POST",
    "/v1/auth/register",
    {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      displayName: TEST_DISPLAY_NAME,
    }
  );

  if (status === 201 && data.success === true && data.data.uid) {
    state.idToken = data.data.idToken;
    state.refreshToken = data.data.refreshToken;
    state.uid = data.data.uid;

    logTest(
      "POST /v1/auth/register",
      true,
      "User registered successfully",
      {
        uid: data.data.uid,
        email: data.data.email,
        displayName: data.data.displayName,
      }
    );
  } else {
    logTest(
      "POST /v1/auth/register",
      false,
      `Expected status 201, got ${status}`,
      data
    );
  }

  // Test duplicate registration
  await wait(500);
  const { data: dupData, status: dupStatus } = await makeRequest(
    "POST",
    "/v1/auth/register",
    {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }
  );

  if (dupStatus === 409 || (dupData && dupData.error && dupData.error.code === "EMAIL_EXISTS")) {
    logTest(
      "POST /v1/auth/register (duplicate)",
      true,
      "Duplicate registration properly rejected",
      { statusCode: dupStatus }
    );
  } else {
    logTest(
      "POST /v1/auth/register (duplicate)",
      false,
      `Expected duplicate error, got ${dupStatus}`,
      dupData
    );
  }

  // Test invalid email format
  const { data: invalidData, status: invalidStatus } = await makeRequest(
    "POST",
    "/v1/auth/register",
    {
      email: "invalid-email",
      password: TEST_PASSWORD,
    }
  );

  if (invalidStatus === 400) {
    logTest(
      "POST /v1/auth/register (invalid email)",
      true,
      "Invalid email format properly rejected",
      { statusCode: invalidStatus }
    );
  } else {
    logTest(
      "POST /v1/auth/register (invalid email)",
      false,
      `Expected status 400 for invalid email, got ${invalidStatus}`,
      invalidData
    );
  }
}

// Test 4: Login
async function testLogin() {
  logSection("TEST 4: User Login");

  // Test with correct credentials
  const { response, data, status } = await makeRequest("POST", "/v1/auth/login", {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (status === 200 && data.success === true && data.data.idToken) {
    state.idToken = data.data.idToken;
    state.refreshToken = data.data.refreshToken;

    logTest(
      "POST /v1/auth/login",
      true,
      "User logged in successfully",
      {
        uid: data.data.uid,
        email: data.data.email,
      }
    );
  } else {
    logTest(
      "POST /v1/auth/login",
      false,
      `Expected status 200, got ${status}`,
      data
    );
  }

  // Test with wrong password
  await wait(500);
  const { data: wrongData, status: wrongStatus } = await makeRequest(
    "POST",
    "/v1/auth/login",
    {
      email: TEST_EMAIL,
      password: "WrongPassword123",
    }
  );

  if (wrongStatus === 401 || wrongStatus === 400) {
    logTest(
      "POST /v1/auth/login (wrong password)",
      true,
      "Wrong password properly rejected",
      { statusCode: wrongStatus }
    );
  } else {
    logTest(
      "POST /v1/auth/login (wrong password)",
      false,
      `Expected status 401/400 for wrong password, got ${wrongStatus}`,
      wrongData
    );
  }

  // Test with non-existent user
  const { data: notFoundData, status: notFoundStatus } = await makeRequest(
    "POST",
    "/v1/auth/login",
    {
      email: "nonexistent@example.com",
      password: TEST_PASSWORD,
    }
  );

  if (notFoundStatus === 401 || notFoundStatus === 400) {
    logTest(
      "POST /v1/auth/login (non-existent user)",
      true,
      "Non-existent user login properly rejected",
      { statusCode: notFoundStatus }
    );
  } else {
    logTest(
      "POST /v1/auth/login (non-existent user)",
      false,
      `Expected status 401/400, got ${notFoundStatus}`,
      notFoundData
    );
  }
}

// Test 5: Refresh Token
async function testRefreshToken() {
  logSection("TEST 5: Refresh Token");

  if (!state.refreshToken) {
    logSkipped("POST /v1/auth/refresh", "No refresh token available from previous tests");
    return;
  }

  const { response, data, status } = await makeRequest(
    "POST",
    "/v1/auth/refresh",
    {
      refreshToken: state.refreshToken,
    }
  );

  if (status === 200 && data.success === true && data.data.idToken) {
    state.idToken = data.data.idToken;
    state.refreshToken = data.data.refreshToken;

    logTest(
      "POST /v1/auth/refresh",
      true,
      "Token refreshed successfully",
      { hasNewToken: !!data.data.idToken }
    );
  } else {
    logTest(
      "POST /v1/auth/refresh",
      false,
      `Expected status 200, got ${status}`,
      data
    );
  }

  // Test with invalid refresh token
  await wait(500);
  const { data: invalidData, status: invalidStatus } = await makeRequest(
    "POST",
    "/v1/auth/refresh",
    {
      refreshToken: "invalid-refresh-token",
    }
  );

  if (invalidStatus === 401 || invalidStatus === 400) {
    logTest(
      "POST /v1/auth/refresh (invalid token)",
      true,
      "Invalid refresh token properly rejected",
      { statusCode: invalidStatus }
    );
  } else {
    logTest(
      "POST /v1/auth/refresh (invalid token)",
      false,
      `Expected status 401/400, got ${invalidStatus}`,
      invalidData
    );
  }
}

// Test 6: Update Profile
async function testUpdateProfile() {
  logSection("TEST 6: Update Profile (Protected)");

  if (!state.idToken) {
    logSkipped("PATCH /v1/auth/profile", "No ID token available from previous tests");
    return;
  }

  const newDisplayName = "Updated Test User";
  const { response, data, status } = await makeRequest(
    "PATCH",
    "/v1/auth/profile",
    {
      displayName: newDisplayName,
    },
    {
      Authorization: `Bearer ${state.idToken}`,
    }
  );

  if (status === 200 && data.success === true) {
    logTest(
      "PATCH /v1/auth/profile",
      true,
      "Profile updated successfully",
      { displayName: data.data.displayName }
    );
  } else {
    logTest(
      "PATCH /v1/auth/profile",
      false,
      `Expected status 200, got ${status}`,
      data
    );
  }

  // Test without authorization
  await wait(500);
  const { data: noAuthData, status: noAuthStatus } = await makeRequest(
    "PATCH",
    "/v1/auth/profile",
    {
      displayName: "Should Fail",
    }
  );

  if (noAuthStatus === 401) {
    logTest(
      "PATCH /v1/auth/profile (no auth)",
      true,
      "Unauthorized request properly rejected",
      { statusCode: noAuthStatus }
    );
  } else {
    logTest(
      "PATCH /v1/auth/profile (no auth)",
      false,
      `Expected status 401, got ${noAuthStatus}`,
      noAuthData
    );
  }
}

// Test 7: Forgot Password
async function testForgotPassword() {
  logSection("TEST 7: Forgot Password");

  const { response, data, status } = await makeRequest(
    "POST",
    "/v1/auth/forgot-password",
    {
      email: TEST_EMAIL,
    }
  );

  if (status === 200 && data.success === true) {
    logTest(
      "POST /v1/auth/forgot-password",
      true,
      "Password reset email sent successfully (Note: Check Firebase console for actual email)",
      { email: TEST_EMAIL }
    );
  } else {
    logTest(
      "POST /v1/auth/forgot-password",
      false,
      `Expected status 200, got ${status}`,
      data
    );
  }

  // Test with non-existent email
  await wait(500);
  const { data: notFoundData, status: notFoundStatus } = await makeRequest(
    "POST",
    "/v1/auth/forgot-password",
    {
      email: "nonexistent@example.com",
    }
  );

  // Firebase may return 200 even for non-existent emails for security reasons
  if (notFoundStatus === 200 || notFoundStatus === 400) {
    logTest(
      "POST /v1/auth/forgot-password (non-existent email)",
      true,
      "Forgot password handled for non-existent email (Firebase security feature)",
      { statusCode: notFoundStatus }
    );
  } else {
    logTest(
      "POST /v1/auth/forgot-password (non-existent email)",
      false,
      `Expected status 200/400, got ${notFoundStatus}`,
      notFoundData
    );
  }

  // Test with invalid email format
  const { data: invalidData, status: invalidStatus } = await makeRequest(
    "POST",
    "/v1/auth/forgot-password",
    {
      email: "invalid-email-format",
    }
  );

  if (invalidStatus === 400) {
    logTest(
      "POST /v1/auth/forgot-password (invalid email)",
      true,
      "Invalid email format properly rejected",
      { statusCode: invalidStatus }
    );
  } else {
    logTest(
      "POST /v1/auth/forgot-password (invalid email)",
      false,
      `Expected status 400, got ${invalidStatus}`,
      invalidData
    );
  }
}

// Test 8: Reset Password (Note: This requires an actual oobCode from email)
async function testResetPassword() {
  logSection("TEST 8: Reset Password");

  console.log(`${colors.yellow}⚠  Note: Reset password requires actual oobCode from email.${colors.reset}`);
  console.log(`${colors.yellow}   Testing with dummy code to verify endpoint structure.${colors.reset}\n`);

  // Test with dummy oobCode (will fail but tests endpoint)
  const { data, status } = await makeRequest(
    "POST",
    "/v1/auth/reset-password",
    {
      oobCode: "dummy-oob-code-for-testing",
      newPassword: "NewPassword123",
    }
  );

  // We expect this to fail with 400 since the code is invalid
  if (status === 400 || status === 401) {
    logTest(
      "POST /v1/auth/reset-password (endpoint validation)",
      true,
      "Reset password endpoint properly validates oobCode",
      { statusCode: status, note: "Endpoint is working, invalid code as expected" }
    );
  } else if (status === 200) {
    logTest(
      "POST /v1/auth/reset-password",
      false,
      "Unexpected success with dummy oobCode",
      data
    );
  } else {
    logTest(
      "POST /v1/auth/reset-password",
      false,
      `Unexpected status code: ${status}`,
      data
    );
  }

  // Test with missing oobCode
  await wait(500);
  const { data: missingData, status: missingStatus } = await makeRequest(
    "POST",
    "/v1/auth/reset-password",
    {
      newPassword: "NewPassword123",
    }
  );

  if (missingStatus === 400) {
    logTest(
      "POST /v1/auth/reset-password (missing oobCode)",
      true,
      "Missing oobCode properly rejected",
      { statusCode: missingStatus }
    );
  } else {
    logTest(
      "POST /v1/auth/reset-password (missing oobCode)",
      false,
      `Expected status 400, got ${missingStatus}`,
      missingData
    );
  }
}

// Test 9: Logout
async function testLogout() {
  logSection("TEST 9: Logout (Protected)");

  if (!state.idToken || !state.refreshToken) {
    logSkipped("POST /v1/auth/logout", "No tokens available from previous tests");
    return;
  }

  const { response, data, status } = await makeRequest(
    "POST",
    "/v1/auth/logout",
    {
      refreshToken: state.refreshToken,
    },
    {
      Authorization: `Bearer ${state.idToken}`,
    }
  );

  if (status === 200 && data.success === true) {
    logTest(
      "POST /v1/auth/logout",
      true,
      "User logged out successfully",
      { message: data.message }
    );

    // After logout, old refresh token should be invalid
    await wait(500);
    const { data: refreshData, status: refreshStatus } = await makeRequest(
      "POST",
      "/v1/auth/refresh",
      {
        refreshToken: state.refreshToken,
      }
    );

    if (refreshStatus === 401 || refreshStatus === 400) {
      logTest(
        "POST /v1/auth/refresh (after logout)",
        true,
        "Old refresh token properly invalidated after logout",
        { statusCode: refreshStatus }
      );
    } else {
      logTest(
        "POST /v1/auth/refresh (after logout)",
        false,
        `Expected refresh token to be invalid after logout, got ${refreshStatus}`,
        refreshData
      );
    }
  } else {
    logTest(
      "POST /v1/auth/logout",
      false,
      `Expected status 200, got ${status}`,
      data
    );
  }

  // Test logout without authorization
  await wait(500);
  const { data: noAuthData, status: noAuthStatus } = await makeRequest(
    "POST",
    "/v1/auth/logout",
    {
      refreshToken: "some-token",
    }
  );

  if (noAuthStatus === 401) {
    logTest(
      "POST /v1/auth/logout (no auth)",
      true,
      "Unauthorized logout properly rejected",
      { statusCode: noAuthStatus }
    );
  } else {
    logTest(
      "POST /v1/auth/logout (no auth)",
      false,
      `Expected status 401, got ${noAuthStatus}`,
      noAuthData
    );
  }
}

// Test 10: Delete User
async function testDeleteUser() {
  logSection("TEST 10: Delete User (Protected)");

  // First, need to log in again to get fresh token
  console.log(`${colors.cyan}Logging in again to get fresh token for deletion...${colors.reset}\n`);
  const { data: loginData, status: loginStatus } = await makeRequest(
    "POST",
    "/v1/auth/login",
    {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }
  );

  if (loginStatus !== 200 || !loginData.data.idToken) {
    logSkipped("DELETE /v1/auth/user", "Failed to log in for delete user test");
    return;
  }

  state.idToken = loginData.data.idToken;

  // Test delete without password
  const { data: noPassData, status: noPassStatus } = await makeRequest(
    "DELETE",
    "/v1/auth/user",
    {},
    {
      Authorization: `Bearer ${state.idToken}`,
    }
  );

  if (noPassStatus === 400) {
    logTest(
      "DELETE /v1/auth/user (missing password)",
      true,
      "Delete without password properly rejected",
      { statusCode: noPassStatus }
    );
  } else {
    logTest(
      "DELETE /v1/auth/user (missing password)",
      false,
      `Expected status 400, got ${noPassStatus}`,
      noPassData
    );
  }

  // Test delete with wrong password
  await wait(500);
  const { data: wrongPassData, status: wrongPassStatus } = await makeRequest(
    "DELETE",
    "/v1/auth/user",
    {
      password: "WrongPassword123",
    },
    {
      Authorization: `Bearer ${state.idToken}`,
    }
  );

  if (wrongPassStatus === 401) {
    logTest(
      "DELETE /v1/auth/user (wrong password)",
      true,
      "Delete with wrong password properly rejected",
      { statusCode: wrongPassStatus }
    );
  } else {
    logTest(
      "DELETE /v1/auth/user (wrong password)",
      false,
      `Expected status 401, got ${wrongPassStatus}`,
      wrongPassData
    );
  }

  // Test delete with correct password
  await wait(500);
  const { response, data, status } = await makeRequest(
    "DELETE",
    "/v1/auth/user",
    {
      password: TEST_PASSWORD,
    },
    {
      Authorization: `Bearer ${state.idToken}`,
    }
  );

  if (status === 200 && data.success === true) {
    logTest(
      "DELETE /v1/auth/user",
      true,
      "User account deleted successfully",
      { message: data.message }
    );

    // Verify user is really deleted by trying to login
    await wait(500);
    const { data: verifyData, status: verifyStatus } = await makeRequest(
      "POST",
      "/v1/auth/login",
      {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }
    );

    if (verifyStatus === 401 || verifyStatus === 400) {
      logTest(
        "POST /v1/auth/login (deleted user)",
        true,
        "Deleted user cannot log in",
        { statusCode: verifyStatus }
      );
    } else {
      logTest(
        "POST /v1/auth/login (deleted user)",
        false,
        `Expected login to fail for deleted user, got ${verifyStatus}`,
        verifyData
      );
    }
  } else {
    logTest(
      "DELETE /v1/auth/user",
      false,
      `Expected status 200, got ${status}`,
      data
    );
  }

  // Test delete without authorization
  await wait(500);
  const { data: noAuthData, status: noAuthStatus } = await makeRequest(
    "DELETE",
    "/v1/auth/user",
    {
      password: TEST_PASSWORD,
    }
  );

  if (noAuthStatus === 401) {
    logTest(
      "DELETE /v1/auth/user (no auth)",
      true,
      "Unauthorized delete properly rejected",
      { statusCode: noAuthStatus }
    );
  } else {
    logTest(
      "DELETE /v1/auth/user (no auth)",
      false,
      `Expected status 401, got ${noAuthStatus}`,
      noAuthData
    );
  }
}

// Test 11: 404 Not Found
async function test404() {
  logSection("TEST 11: 404 Not Found");

  const { response, data, status } = await makeRequest("GET", "/v1/auth/nonexistent");

  if (status === 404) {
    logTest(
      "GET /v1/auth/nonexistent",
      true,
      "404 handler working correctly",
      { statusCode: status }
    );
  } else {
    logTest(
      "GET /v1/auth/nonexistent",
      false,
      `Expected status 404, got ${status}`,
      data
    );
  }
}

// Generate test report
function generateReport() {
  testResults.endTime = new Date();
  const duration = (testResults.endTime - testResults.startTime) / 1000;

  logSection("TEST SUMMARY");

  console.log(`${colors.bright}Test Execution Summary${colors.reset}`);
  console.log(`${colors.cyan}Started:${colors.reset} ${testResults.startTime.toISOString()}`);
  console.log(`${colors.cyan}Ended:${colors.reset} ${testResults.endTime.toISOString()}`);
  console.log(`${colors.cyan}Duration:${colors.reset} ${duration.toFixed(2)}s`);
  console.log("");

  console.log(`${colors.bright}Results:${colors.reset}`);
  console.log(`${colors.cyan}Total Tests:${colors.reset} ${testResults.total}`);
  console.log(`${colors.green}Passed:${colors.reset} ${testResults.passed}`);
  console.log(`${colors.red}Failed:${colors.reset} ${testResults.failed}`);
  console.log(`${colors.yellow}Skipped:${colors.reset} ${testResults.skipped}`);

  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(2);
  console.log(`${colors.bright}Pass Rate:${colors.reset} ${passRate}%`);
  console.log("");

  if (testResults.failed > 0) {
    console.log(`${colors.red}${colors.bright}Failed Tests:${colors.reset}`);
    testResults.tests
      .filter((t) => !t.passed && !t.skipped)
      .forEach((t) => {
        console.log(`  ${colors.red}✗${colors.reset} ${t.name}: ${t.message}`);
      });
    console.log("");
  }

  // Save report to file
  const reportData = {
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      skipped: testResults.skipped,
      passRate: `${passRate}%`,
      duration: `${duration.toFixed(2)}s`,
      startTime: testResults.startTime.toISOString(),
      endTime: testResults.endTime.toISOString(),
    },
    tests: testResults.tests,
  };

  return reportData;
}

// Main test execution
async function runAllTests() {
  console.log(`${colors.bright}${colors.blue}${"=".repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}Auth Service Comprehensive Test Suite${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${"=".repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}Base URL:${colors.reset} ${BASE_URL}`);
  console.log(`${colors.cyan}Test Email:${colors.reset} ${TEST_EMAIL}`);
  console.log(`${colors.cyan}Timestamp:${colors.reset} ${new Date().toISOString()}`);
  console.log("");

  // Wait for server to be ready
  console.log(`${colors.yellow}Waiting for server to be ready...${colors.reset}\n`);
  await wait(2000);

  try {
    // Run all tests in sequence
    await testHealthCheck();
    await wait(500);

    await testRootEndpoint();
    await wait(500);

    await testRegister();
    await wait(500);

    await testLogin();
    await wait(500);

    await testRefreshToken();
    await wait(500);

    await testUpdateProfile();
    await wait(500);

    await testForgotPassword();
    await wait(500);

    await testResetPassword();
    await wait(500);

    await testLogout();
    await wait(500);

    await testDeleteUser();
    await wait(500);

    await test404();

    // Generate and save report
    const reportData = generateReport();

    console.log(`${colors.bright}${colors.blue}${"=".repeat(60)}${colors.reset}`);
    console.log(
      `${colors.bright}${colors.blue}Test execution completed!${colors.reset}`
    );
    console.log(`${colors.bright}${colors.blue}${"=".repeat(60)}${colors.reset}\n`);

    return reportData;
  } catch (error) {
    console.error(`${colors.red}Test execution failed:${colors.reset}`, error);
    throw error;
  }
}

// Execute tests
runAllTests()
  .then((reportData) => {
    const fs = require("fs");
    const reportPath = "./test-report.json";
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(
      `${colors.green}Test report saved to: ${reportPath}${colors.reset}\n`
    );
    process.exit(testResults.failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
