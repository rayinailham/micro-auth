#!/bin/bash

# Test script for auth-service endpoints
BASE_URL="http://localhost:8001"

echo "🧪 Testing TryFitOut Auth Service Endpoints"
echo "============================================="
echo

# Test health endpoint
echo "1. Testing Health Endpoint..."
echo "GET $BASE_URL/health"
curl -s -X GET "$BASE_URL/health" \
  -H "Content-Type: application/json" | jq . || echo "❌ Health endpoint failed"
echo

# Test register endpoint with invalid data
echo "2. Testing Register Endpoint (Invalid Email)..."
echo "POST $BASE_URL/v1/auth/register"
curl -s -X POST "$BASE_URL/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "password123",
    "displayName": "Test User"
  }' | jq . || echo "❌ Register endpoint validation failed"
echo

# Test register endpoint with weak password
echo "3. Testing Register Endpoint (Weak Password)..."
echo "POST $BASE_URL/v1/auth/register"
curl -s -X POST "$BASE_URL/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123",
    "displayName": "Test User"
  }' | jq . || echo "❌ Register endpoint validation failed"
echo

# Test login endpoint with missing data
echo "4. Testing Login Endpoint (Missing Data)..."
echo "POST $BASE_URL/v1/auth/login"
curl -s -X POST "$BASE_URL/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }' | jq . || echo "❌ Login endpoint validation failed"
echo

# Test non-existent endpoint
echo "5. Testing Non-existent Endpoint..."
echo "GET $BASE_URL/v1/auth/nonexistent"
curl -s -X GET "$BASE_URL/v1/auth/nonexistent" \
  -H "Content-Type: application/json" | jq . || echo "❌ 404 handling failed"
echo

echo "✅ Endpoint testing completed!"
echo "Note: These tests check API structure and validation. Full auth tests require Firebase setup."
