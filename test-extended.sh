#!/bin/bash

# Extended test script for auth-service endpoints
BASE_URL="http://localhost:8001"

echo "🔐 Extended Auth Service Testing"
echo "================================="
echo

# Test valid register payload structure
echo "6. Testing Register Endpoint (Valid Structure)..."
echo "POST $BASE_URL/v1/auth/register"
curl -s -X POST "$BASE_URL/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }' | jq . || echo "❌ Register endpoint failed"
echo

# Test login endpoint structure
echo "7. Testing Login Endpoint (Valid Structure)..."
echo "POST $BASE_URL/v1/auth/login"
curl -s -X POST "$BASE_URL/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq . || echo "❌ Login endpoint failed"
echo

# Test refresh endpoint
echo "8. Testing Refresh Token Endpoint..."
echo "POST $BASE_URL/v1/auth/refresh"
curl -s -X POST "$BASE_URL/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "dummy-refresh-token"
  }' | jq . || echo "❌ Refresh endpoint failed"
echo

# Test logout endpoint
echo "9. Testing Logout Endpoint..."
echo "POST $BASE_URL/v1/auth/logout"
curl -s -X POST "$BASE_URL/v1/auth/logout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dummy-token" \
  -d '{}' | jq . || echo "❌ Logout endpoint failed"
echo

# Test profile endpoint
echo "10. Testing Get Profile Endpoint..."
echo "GET $BASE_URL/v1/auth/profile"
curl -s -X GET "$BASE_URL/v1/auth/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dummy-token" | jq . || echo "❌ Profile endpoint failed"
echo

echo "✅ Extended endpoint testing completed!"
echo "Note: These tests show endpoint structure. Actual Firebase auth requires valid tokens."
