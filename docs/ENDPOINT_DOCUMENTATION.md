# Auth V2 Service - Dokumentasi Endpoint API

## Daftar Isi
- [Informasi Umum](#informasi-umum)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Endpoint Authentication](#endpoint-authentication)
- [Endpoint Token Verification](#endpoint-token-verification)
- [Error Handling](#error-handling)
- [Response Format](#response-format)

---

## Informasi Umum

Auth V2 Service adalah layanan autentikasi hybrid yang menggabungkan Firebase Authentication dengan PostgreSQL database. Service ini menyediakan:

- **User Registration & Login** dengan Firebase
- **Hybrid Authentication** (Firebase + PostgreSQL)
- **Token Verification** untuk service lain
- **User Profile Management**
- **Password Reset Flow**
- **Lazy User Migration** dari PostgreSQL ke Firebase

### Teknologi
- **Runtime**: Bun
- **Framework**: Hono
- **Authentication**: Firebase Admin SDK
- **Database**: PostgreSQL
- **Cache**: Redis
- **Validation**: Zod

---

## Base URL

```
http://localhost:3002
```

Production:
```
https://auth-v2.tryfitout.com
```

---

## Authentication

Sebagian besar endpoint yang dilindungi memerlukan Firebase ID Token dalam header Authorization:

```http
Authorization: Bearer <firebase-id-token>
```

---

## Endpoint Authentication

### 1. Register User

Mendaftarkan user baru dengan Firebase Authentication.

**Endpoint:** `POST /v1/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "John Doe",      // Optional
  "photoURL": "https://..."        // Optional
}
```

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "uid": "firebase-user-id",
    "email": "user@example.com",
    "displayName": "John Doe",
    "photoURL": "https://...",
    "idToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "AGEhc0DKhS6b...",
    "expiresIn": "3600",
    "createdAt": "2025-10-04T10:30:00.000Z"
  },
  "message": "User registered successfully",
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

**Validasi:**
- Email harus valid
- Password minimal 6 karakter
- DisplayName dan photoURL optional

**Error Responses:**
- `400` - Validation error
- `409` - Email already exists
- `500` - Internal server error

---

### 2. Login (Hybrid Authentication)

Login dengan email dan password. Mendukung hybrid authentication:
1. Coba login dengan Firebase terlebih dahulu
2. Jika gagal, cek PostgreSQL untuk user lokal
3. Jika ditemukan di PostgreSQL, lakukan migrasi otomatis ke Firebase

**Endpoint:** `POST /v1/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "uid": "firebase-user-id",
    "email": "user@example.com",
    "displayName": "John Doe",
    "photoURL": "https://...",
    "idToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "AGEhc0DKhS6b...",
    "expiresIn": "3600"
  },
  "message": "Login successful",
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

**Response Success - Migrasi User (200):**
```json
{
  "success": true,
  "data": {
    "uid": "new-firebase-user-id",
    "email": "user@example.com",
    "displayName": "John Doe",
    "photoURL": null,
    "idToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "AGEhc0DKhS6b...",
    "expiresIn": "3600"
  },
  "message": "Login successful - Account migrated to Firebase",
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

**Alur Hybrid Authentication:**
1. **Firebase First**: Coba autentikasi dengan Firebase
2. **Fallback to PostgreSQL**: Jika user tidak ditemukan di Firebase, cek PostgreSQL
3. **Password Verification**: Verifikasi password dengan bcrypt
4. **Auto Migration**: Migrasi user ke Firebase secara otomatis
5. **Sync Database**: Update PostgreSQL dengan firebase_uid

**Error Responses:**
- `400` - Validation error / Password reset required
- `401` - Invalid email or password
- `500` - Internal server error / Migration failed

---

### 3. Refresh Token

Memperbarui ID token menggunakan refresh token.

**Endpoint:** `POST /v1/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "AGEhc0DKhS6b..."
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "idToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "AGEhc0DKhS6b...",
    "expiresIn": "3600"
  },
  "message": "Token refreshed successfully",
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Invalid or expired refresh token
- `500` - Internal server error

---

### 4. Logout

Mencabut semua refresh token user (protected endpoint).

**Endpoint:** `POST /v1/auth/logout`

**Headers:**
```http
Authorization: Bearer <firebase-id-token>
```

**Request Body:**
```json
{
  "refreshToken": "AGEhc0DKhS6b..."
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Logout successful",
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

**Error Responses:**
- `401` - Unauthorized / Invalid token
- `500` - Internal server error

---

### 5. Update Profile

Memperbarui profil user (protected endpoint).

**Endpoint:** `PATCH /v1/auth/profile`

**Headers:**
```http
Authorization: Bearer <firebase-id-token>
```

**Request Body:**
```json
{
  "displayName": "Jane Doe",      // Optional
  "photoURL": "https://..."        // Optional
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "uid": "firebase-user-id",
    "email": "user@example.com",
    "displayName": "Jane Doe",
    "photoURL": "https://...",
    "updatedAt": "2025-10-04T10:30:00.000Z"
  },
  "message": "Profile updated successfully",
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

**Notes:**
- Minimal salah satu field (displayName atau photoURL) harus disertakan
- Kirim `null` untuk menghapus nilai

**Error Responses:**
- `400` - Validation error
- `401` - Unauthorized / Invalid token
- `500` - Internal server error

---

### 6. Delete User

Menghapus akun user (protected endpoint).

**Endpoint:** `DELETE /v1/auth/user`

**Headers:**
```http
Authorization: Bearer <firebase-id-token>
```

**Request Body:**
```json
{
  "password": "password123"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": null,
  "message": "User deleted successfully",
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

**Notes:**
- Password diperlukan untuk konfirmasi
- Aksi ini tidak dapat dibatalkan
- User akan dihapus dari Firebase (PostgreSQL data tetap ada untuk audit)

**Error Responses:**
- `400` - Validation error / User email not found
- `401` - Unauthorized / Incorrect password
- `500` - Internal server error

---

### 7. Forgot Password

Mengirim email reset password ke user.

**Endpoint:** `POST /v1/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Password reset email sent successfully",
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

**Notes:**
- Email reset akan dikirim oleh Firebase
- Link reset valid selama 1 jam
- Response sukses akan dikembalikan meskipun email tidak terdaftar (security best practice)

**Error Responses:**
- `400` - Validation error
- `500` - Internal server error

---

### 8. Reset Password

Mereset password dengan kode OOB dari email.

**Endpoint:** `POST /v1/auth/reset-password`

**Request Body:**
```json
{
  "oobCode": "code-from-email",
  "newPassword": "newpassword123"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Password reset successfully",
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

**Validasi:**
- oobCode harus valid dan belum expired
- newPassword minimal 6 karakter

**Error Responses:**
- `400` - Validation error / Invalid or expired code
- `500` - Internal server error

---

## Endpoint Token Verification

### 9. Verify Token (Body)

Memverifikasi Firebase ID token dan mengembalikan data user. Endpoint ini digunakan oleh service lain untuk verifikasi token.

**Endpoint:** `POST /v1/token/verify`

**Request Body:**
```json
{
  "token": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "id": 123,
      "email": "user@example.com",
      "username": "johndoe",
      "user_type": "jobseeker",
      "is_active": true,
      "token_balance": 1000,
      "firebase_uid": "firebase-user-id",
      "auth_provider": "firebase",
      "email_verified": true,
      "photo_url": "https://..."
    },
    "firebaseUid": "firebase-user-id",
    "email": "user@example.com",
    "emailVerified": true,
    "tokenExpiration": 1728048600,
    "issuedAt": 1728045000
  },
  "message": "Token verified successfully",
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

**Features:**
- **Redis Caching**: Hasil verifikasi di-cache selama 5 menit
- **Lazy User Creation**: User otomatis dibuat di PostgreSQL jika belum ada
- **User Sync**: Data user dari Firebase di-sync ke PostgreSQL

**Error Responses:**
- `400` - Validation error
- `401` - Invalid or expired token / User not found
- `500` - Internal server error / Failed to sync user data

---

### 10. Verify Token (Header)

Memverifikasi token dari Authorization header. Endpoint yang lebih praktis untuk service yang mengirim token di header.

**Endpoint:** `POST /v1/token/verify-header`

**Headers:**
```http
Authorization: Bearer <firebase-id-token>
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "id": 123,
      "email": "user@example.com",
      "username": "johndoe",
      "user_type": "jobseeker",
      "is_active": true,
      "token_balance": 1000,
      "firebase_uid": "firebase-user-id",
      "auth_provider": "firebase",
      "email_verified": true,
      "photo_url": "https://..."
    },
    "firebaseUid": "firebase-user-id",
    "email": "user@example.com",
    "emailVerified": true,
    "tokenExpiration": 1728048600,
    "issuedAt": 1728045000
  },
  "message": "Token verified from cache",
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

**Features:**
- Sama seperti `/v1/token/verify` tetapi membaca token dari header
- Lebih praktis untuk service-to-service communication
- Mendukung Redis caching dan lazy user creation

**Error Responses:**
- `401` - Missing or invalid Authorization header / Invalid token
- `500` - Internal server error

---

### 11. Token Health Check

Health check untuk token verification service.

**Endpoint:** `GET /v1/token/health`

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "token-verification",
    "timestamp": "2025-10-04T10:30:00.000Z"
  },
  "message": "Token verification service is healthy",
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

---

## Health Check & Info

### 12. Service Health Check

Memeriksa kesehatan service dan dependencies.

**Endpoint:** `GET /health`

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-04T10:30:00.000Z",
    "service": "auth-v2-service",
    "version": "1.0.0",
    "dependencies": {
      "database": {
        "healthy": true,
        "responseTime": 5
      },
      "redis": {
        "healthy": true,
        "responseTime": 2
      }
    }
  },
  "message": "Service is healthy",
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

**Response Degraded (503):**
```json
{
  "success": true,
  "data": {
    "status": "degraded",
    "timestamp": "2025-10-04T10:30:00.000Z",
    "service": "auth-v2-service",
    "version": "1.0.0",
    "dependencies": {
      "database": {
        "healthy": false,
        "error": "Connection timeout"
      },
      "redis": {
        "healthy": true,
        "responseTime": 2
      }
    }
  },
  "message": "Service is degraded",
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

---

### 13. Root Endpoint

Informasi dasar tentang service.

**Endpoint:** `GET /`

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "service": "Auth V2 Service (Firebase + PostgreSQL)",
    "version": "2.0.0",
    "status": "running"
  },
  "message": "Auth V2 Service is running",
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message description"
  },
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

### HTTP Status Codes

| Status Code | Deskripsi |
|-------------|-----------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Invalid or expired token |
| 404 | Not Found |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Degraded |

### Firebase Error Codes

| Firebase Error | HTTP Status | User Message |
|----------------|-------------|--------------|
| EMAIL_EXISTS | 409 | Email already registered |
| INVALID_EMAIL | 400 | Invalid email format |
| WEAK_PASSWORD | 400 | Password too weak (min 6 chars) |
| USER_DISABLED | 401 | Account has been disabled |
| INVALID_PASSWORD | 401 | Invalid password |
| EMAIL_NOT_FOUND | 401 | Email not found |
| INVALID_ID_TOKEN | 401 | Invalid or expired token |
| INVALID_REFRESH_TOKEN | 401 | Invalid refresh token |
| EXPIRED_OOB_CODE | 400 | Password reset code expired |
| INVALID_OOB_CODE | 400 | Invalid password reset code |

---

## Response Format

Semua response mengikuti format standar:

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful message",
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  },
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

### Validation Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "Password must be at least 6 characters"
      }
    ]
  },
  "timestamp": "2025-10-04T10:30:00.000Z"
}
```

---

## CORS Configuration

Service mendukung CORS untuk origin berikut:
- `http://localhost:3000` (Development)
- `https://tryfitout.com` (Production)
- `https://api.tryfitout.com` (Production API)

**Allowed Methods:**
- GET
- POST
- PATCH
- DELETE
- OPTIONS

**Allowed Headers:**
- Content-Type
- Authorization

**Credentials:** Enabled

---

## Rate Limiting

Saat ini belum ada rate limiting yang diterapkan. Disarankan untuk menambahkan rate limiting di API Gateway atau reverse proxy (nginx).

**Rekomendasi:**
- Authentication endpoints: 10 requests/minute per IP
- Token verification: 100 requests/minute per service
- Password reset: 3 requests/hour per email

---

## Best Practices

### Untuk Client Applications

1. **Store Tokens Securely**
   - Simpan ID token dan refresh token dengan aman (HttpOnly cookies atau secure storage)
   - Jangan simpan di localStorage untuk aplikasi web

2. **Token Refresh**
   - Refresh token sebelum expired (biasanya 1 jam)
   - Implementasi automatic token refresh

3. **Error Handling**
   - Handle semua error code dengan proper user messaging
   - Implementasi retry logic untuk network errors

4. **Password Requirements**
   - Minimal 6 karakter (Firebase requirement)
   - Rekomendasikan 12+ karakter dengan kombinasi huruf, angka, dan simbol

### Untuk Backend Services

1. **Token Verification**
   - Gunakan `/v1/token/verify-header` untuk verifikasi token
   - Cache hasil verifikasi jika memungkinkan (sudah ada Redis cache)

2. **Service-to-Service Auth**
   - Gunakan Firebase Admin SDK untuk service-to-service communication
   - Atau gunakan API key untuk internal services

3. **Error Handling**
   - Handle expired tokens dengan proper refresh flow
   - Implementasi fallback mechanism jika auth service down

---

## Environment Variables

### Required Variables

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_API_KEY=your-api-key

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=atma_db
DB_USER=postgres
DB_PASSWORD=postgres

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional-password

# Server Configuration
PORT=3002
NODE_ENV=development
```

### Optional Variables

```env
# Logging
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://tryfitout.com
```

---

## Testing

### Contoh cURL Commands

**Register:**
```bash
curl -X POST http://localhost:3002/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3002/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Verify Token:**
```bash
curl -X POST http://localhost:3002/v1/token/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJSUzI1NiIs..."
  }'
```

**Update Profile:**
```bash
curl -X PATCH http://localhost:3002/v1/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..." \
  -d '{
    "displayName": "New Name"
  }'
```

---

## Migration Notes

### User Migration Flow

Service ini mendukung migrasi otomatis dari user lokal PostgreSQL ke Firebase:

1. **Trigger**: User lokal login pertama kali
2. **Verification**: Password diverifikasi dengan bcrypt
3. **Migration**: User dibuat di Firebase dengan credentials yang sama
4. **Sync**: PostgreSQL di-update dengan `firebase_uid`
5. **Token Generation**: Firebase tokens dikembalikan ke client

### Migration Status

User memiliki field `federation_status` di PostgreSQL:
- `pending`: Belum dimigrasi
- `active`: Sudah dimigrasi dan aktif
- `failed`: Migrasi gagal

---

## Support & Contact

Untuk pertanyaan atau issue:
- **Repository**: github.com/PetaTalenta/backend
- **Service Path**: `/auth-v2-service`
- **Version**: 2.0.0
- **Last Updated**: October 4, 2025

---

## Changelog

### Version 2.0.0 (Current)
- ✅ Firebase Authentication integration
- ✅ Hybrid authentication (Firebase + PostgreSQL)
- ✅ Lazy user migration
- ✅ Token verification with Redis cache
- ✅ User federation service
- ✅ Password reset flow
- ✅ Profile management
- ✅ Health check endpoints

### Version 1.0.0 (Legacy)
- Basic authentication with PostgreSQL only
- JWT token generation
- No Firebase integration
