# Error Handling Guide

Panduan lengkap untuk menangani berbagai jenis error yang dapat terjadi di Microservice Auth Boilerplate.

## 📋 Format Error Response

Semua error response mengikuti format standar:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { /* additional error details */ }
  },
  "message": "Operation failed",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

## 🚨 HTTP Status Codes

| Status Code | Meaning | Kapan Terjadi |
|-------------|---------|---------------|
| 400 | Bad Request | Input tidak valid, format salah |
| 401 | Unauthorized | Token tidak valid, expired, atau tidak ada |
| 404 | Not Found | Endpoint tidak ditemukan, user tidak ada |
| 409 | Conflict | Email sudah terdaftar |
| 500 | Internal Server Error | Error server internal |

## 🔍 Jenis-Jenis Error

### 1. Validation Errors (400)

Error yang terjadi karena input tidak sesuai dengan schema validasi.

#### Email Format Invalid
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  },
  "message": "Validation failed",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Penyebab:**
- Format email tidak valid (tidak ada @, domain tidak valid, dll)

**Solusi:**
- Validasi format email di client sebelum mengirim request
- Gunakan regex atau library validasi email

#### Password Too Weak
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must contain at least one letter and one number",
    "details": {
      "field": "password",
      "requirements": "Minimum 8 characters, letters and numbers"
    }
  },
  "message": "Validation failed",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Penyebab:**
- Password kurang dari 8 karakter
- Password tidak mengandung huruf dan angka

**Solusi:**
- Implementasi password strength indicator di UI
- Validasi password di client sebelum submit

#### Required Field Missing
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": {
      "field": "email"
    }
  },
  "message": "Validation failed",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Penyebab:**
- Field yang wajib diisi tidak ada dalam request

**Solusi:**
- Pastikan semua field required terisi sebelum submit

### 2. Authentication Errors (401)

Error yang terjadi karena masalah autentikasi.

#### Invalid Credentials
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  },
  "message": "Authentication failed",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Penyebab:**
- Email atau password salah saat login
- User tidak terdaftar

**Solusi:**
- Tampilkan pesan error yang user-friendly
- Jangan spesifik apakah email atau password yang salah (security)
- Berikan opsi "Forgot Password"

#### Token Expired
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Token has expired"
  },
  "message": "Authentication failed",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Penyebab:**
- `idToken` sudah expired (biasanya setelah 1 jam)

**Solusi:**
- Gunakan `refreshToken` untuk mendapatkan token baru
- Implementasi automatic token refresh di client

#### Invalid Token
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid token"
  },
  "message": "Authentication failed",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Penyebab:**
- Token format tidak valid
- Token sudah di-revoke
- Token palsu

**Solusi:**
- Redirect user ke halaman login
- Clear token dari storage

#### Missing Authorization Header
```json
{
  "success": false,
  "error": {
    "code": "MISSING_AUTH_HEADER",
    "message": "Authorization header is required"
  },
  "message": "Authentication failed",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Penyebab:**
- Header `Authorization` tidak ada dalam request ke protected endpoint

**Solusi:**
- Pastikan header `Authorization: Bearer <token>` selalu disertakan

### 3. Conflict Errors (409)

Error yang terjadi karena konflik data.

#### Email Already Exists
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "Email is already registered"
  },
  "message": "Registration failed",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Penyebab:**
- Email sudah terdaftar saat registrasi

**Solusi:**
- Tampilkan pesan bahwa email sudah terdaftar
- Berikan opsi untuk login atau reset password

### 4. Not Found Errors (404)

Error yang terjadi karena resource tidak ditemukan.

#### User Not Found
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found"
  },
  "message": "Operation failed",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Penyebab:**
- User tidak ada di database Firebase
- Email tidak terdaftar saat forgot password

**Solusi:**
- Untuk forgot password: tampilkan pesan sukses (jangan beri tahu email tidak terdaftar)
- Untuk operasi lain: redirect ke login

#### Endpoint Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Endpoint not found"
  },
  "message": "Operation failed",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Penyebab:**
- URL endpoint salah
- Method HTTP salah

**Solusi:**
- Periksa URL dan method yang digunakan
- Lihat dokumentasi API

### 5. Server Errors (500)

Error yang terjadi di server.

#### Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  },
  "message": "Operation failed",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Penyebab:**
- Error tidak terduga di server
- Firebase service down
- Database connection error

**Solusi:**
- Retry request setelah beberapa saat
- Tampilkan pesan error generic ke user
- Report error ke tim development

#### Firebase Service Error
```json
{
  "success": false,
  "error": {
    "code": "FIREBASE_ERROR",
    "message": "Firebase service temporarily unavailable",
    "details": {
      "firebaseCode": "INTERNAL_ERROR"
    }
  },
  "message": "Operation failed",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Penyebab:**
- Firebase Auth service mengalami gangguan
- Network issue ke Firebase

**Solusi:**
- Implementasi retry mechanism
- Tampilkan pesan "Service temporarily unavailable"

## 🛠️ Best Practices untuk Client

### 1. Error Handling Strategy

```javascript
// Example error handling
async function handleApiCall(apiFunction) {
  try {
    const response = await apiFunction();
    return response;
  } catch (error) {
    switch (error.status) {
      case 400:
        // Validation error - show specific field errors
        showValidationErrors(error.data.error.details);
        break;
      case 401:
        // Auth error - redirect to login or refresh token
        if (error.data.error.code === 'TOKEN_EXPIRED') {
          await refreshToken();
          return handleApiCall(apiFunction); // Retry
        } else {
          redirectToLogin();
        }
        break;
      case 409:
        // Conflict - show user-friendly message
        showMessage(error.data.error.message);
        break;
      case 500:
        // Server error - show generic message and retry
        showMessage('Something went wrong. Please try again.');
        break;
      default:
        showMessage('An unexpected error occurred.');
    }
  }
}
```

### 2. Token Management

```javascript
// Auto refresh token before expiry
function setupTokenRefresh() {
  const token = getStoredToken();
  if (token) {
    const expiryTime = parseJWT(token.idToken).exp * 1000;
    const refreshTime = expiryTime - (5 * 60 * 1000); // 5 minutes before expiry
    
    setTimeout(async () => {
      await refreshToken();
      setupTokenRefresh(); // Setup next refresh
    }, refreshTime - Date.now());
  }
}
```

### 3. Retry Mechanism

```javascript
// Retry for server errors
async function apiCallWithRetry(apiFunction, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiFunction();
    } catch (error) {
      if (error.status >= 500 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}
```

### 4. User-Friendly Messages

```javascript
// Map error codes to user messages
const ERROR_MESSAGES = {
  'INVALID_CREDENTIALS': 'Email atau password salah. Silakan coba lagi.',
  'EMAIL_ALREADY_EXISTS': 'Email sudah terdaftar. Silakan login atau gunakan email lain.',
  'TOKEN_EXPIRED': 'Sesi Anda telah berakhir. Silakan login kembali.',
  'VALIDATION_ERROR': 'Data yang dimasukkan tidak valid. Periksa kembali form Anda.',
  'INTERNAL_ERROR': 'Terjadi kesalahan sistem. Silakan coba lagi nanti.'
};

function getErrorMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] || 'Terjadi kesalahan yang tidak diketahui.';
}
```

## 📊 Error Monitoring

Untuk production, disarankan untuk:

1. **Log semua error** dengan detail yang cukup untuk debugging
2. **Monitor error rate** dan alert jika melewati threshold
3. **Track error patterns** untuk identifikasi masalah sistemik
4. **Implement health checks** untuk monitoring service availability

## 🔧 Debugging Tips

1. **Check network tab** di browser developer tools
2. **Verify token format** dan expiry time
3. **Test with Postman** untuk isolasi masalah
4. **Check Firebase console** untuk error logs
5. **Validate request payload** sesuai dengan schema
