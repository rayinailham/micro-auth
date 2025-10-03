# API Endpoints Documentation

Dokumentasi lengkap untuk semua endpoint yang tersedia di Microservice Auth Boilerplate.

**Base URL**: `http://localhost:8001` (development) atau `https://your-domain.com` (production)

## 📋 Daftar Endpoint

### Health & Info
- [GET /health](#get-health) - Health check service
- [GET /](#get-root) - Informasi service

### Authentication (Public)
- [POST /v1/auth/register](#post-v1authregister) - Registrasi user baru
- [POST /v1/auth/login](#post-v1authlogin) - Login user
- [POST /v1/auth/refresh](#post-v1authrefresh) - Refresh token
- [POST /v1/auth/forgot-password](#post-v1authforgot-password) - Kirim email reset password
- [POST /v1/auth/reset-password](#post-v1authreset-password) - Reset password

### Authentication (Protected)
- [POST /v1/auth/logout](#post-v1authlogout) - Logout user
- [PATCH /v1/auth/profile](#patch-v1authprofile) - Update profil
- [DELETE /v1/auth/user](#delete-v1authuser) - Hapus akun

---

## Health & Info Endpoints

### GET /health

Health check untuk monitoring service.

**Request:**
```http
GET /health
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-03T10:30:00Z",
    "service": "auth-service",
    "version": "1.0.0"
  },
  "message": "Service is healthy",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

### GET /

Informasi dasar tentang service.

**Request:**
```http
GET /
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "service": "Microservice Auth Boilerplate",
    "version": "1.0.0",
    "endpoints": {
      "health": "/health",
      "auth": "/v1/auth"
    }
  },
  "message": "Auth service is running",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

---

## Authentication Endpoints (Public)

### POST /v1/auth/register

Registrasi user baru dengan email dan password.

**Request:**
```http
POST /v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "John Doe",        // optional
  "photoURL": "https://example.com/photo.jpg"  // optional
}
```

**Validasi:**
- `email`: Format email yang valid
- `password`: Minimal 8 karakter, harus ada huruf dan angka
- `displayName`: Maksimal 100 karakter (opsional)
- `photoURL`: URL yang valid (opsional)

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "uid": "firebase-user-id",
    "email": "user@example.com",
    "displayName": "John Doe",
    "photoURL": "https://example.com/photo.jpg",
    "idToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "AMf-vBzKhKMA...",
    "expiresIn": "3600"
  },
  "message": "User registered successfully",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Cara Pakai:**
1. Kirim data registrasi ke endpoint
2. Simpan `idToken` untuk autentikasi request selanjutnya
3. Simpan `refreshToken` untuk refresh token ketika expired
4. `idToken` berlaku selama 1 jam (3600 detik)

### POST /v1/auth/login

Login user dengan email dan password.

**Request:**
```http
POST /v1/auth/login
Content-Type: application/json

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
    "photoURL": "https://example.com/photo.jpg",
    "idToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "AMf-vBzKhKMA...",
    "expiresIn": "3600"
  },
  "message": "Login successful",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Cara Pakai:**
1. Kirim email dan password
2. Simpan token yang diterima
3. Gunakan `idToken` untuk request yang memerlukan autentikasi

### POST /v1/auth/refresh

Refresh token yang sudah expired.

**Request:**
```http
POST /v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "AMf-vBzKhKMA..."
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "idToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "AMf-vBzKhKMA...",
    "expiresIn": "3600"
  },
  "message": "Token refreshed successfully",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Cara Pakai:**
1. Panggil endpoint ini ketika `idToken` expired (biasanya setelah 1 jam)
2. Gunakan `refreshToken` yang disimpan sebelumnya
3. Simpan `idToken` baru yang diterima

### POST /v1/auth/forgot-password

Kirim email reset password ke user.

**Request:**
```http
POST /v1/auth/forgot-password
Content-Type: application/json

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
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Cara Pakai:**
1. User memasukkan email yang terdaftar
2. Firebase akan mengirim email dengan link reset password
3. User mengklik link di email untuk reset password

### POST /v1/auth/reset-password

Reset password menggunakan kode dari email.

**Request:**
```http
POST /v1/auth/reset-password
Content-Type: application/json

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
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Cara Pakai:**
1. User mendapat email reset password
2. Extract `oobCode` dari link di email
3. Kirim `oobCode` dan password baru ke endpoint ini
4. Password berhasil direset, user bisa login dengan password baru

---

## Authentication Endpoints (Protected)

**Semua endpoint protected memerlukan header Authorization:**
```http
Authorization: Bearer <idToken>
```

### POST /v1/auth/logout

Logout user dan revoke refresh token.

**Request:**
```http
POST /v1/auth/logout
Authorization: Bearer <idToken>
Content-Type: application/json

{
  "refreshToken": "AMf-vBzKhKMA..."
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Logout successful",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Cara Pakai:**
1. Kirim `refreshToken` yang tersimpan
2. Token akan di-revoke oleh Firebase
3. Hapus token dari storage aplikasi

### PATCH /v1/auth/profile

Update profil user (nama dan foto).

**Request:**
```http
PATCH /v1/auth/profile
Authorization: Bearer <idToken>
Content-Type: application/json

{
  "displayName": "New Name",        // optional
  "photoURL": "https://example.com/new-photo.jpg"  // optional
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "uid": "firebase-user-id",
    "email": "user@example.com",
    "displayName": "New Name",
    "photoURL": "https://example.com/new-photo.jpg"
  },
  "message": "Profile updated successfully",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Cara Pakai:**
1. Minimal salah satu field (`displayName` atau `photoURL`) harus diisi
2. Kirim data yang ingin diupdate
3. Data profil akan diupdate di Firebase

### DELETE /v1/auth/user

Hapus akun user secara permanen.

**Request:**
```http
DELETE /v1/auth/user
Authorization: Bearer <idToken>
Content-Type: application/json

{
  "password": "currentpassword123"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": null,
  "message": "User account deleted successfully",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Cara Pakai:**
1. User harus memasukkan password saat ini untuk konfirmasi
2. Akun akan dihapus secara permanen dari Firebase
3. Semua data user akan hilang dan tidak bisa dikembalikan

---

## 📝 Catatan Penting

1. **Token Expiration**: `idToken` berlaku selama 1 jam, gunakan `refreshToken` untuk mendapatkan token baru
2. **Rate Limiting**: Implementasikan rate limiting di client untuk mencegah spam request
3. **Error Handling**: Selalu handle error response sesuai dengan [Error Handling Guide](error-handling.md)
4. **HTTPS**: Gunakan HTTPS di production untuk keamanan
5. **Storage**: Simpan token dengan aman (gunakan secure storage di mobile, httpOnly cookies di web)
