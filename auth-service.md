# Auth Service

Auth Service bertanggung jawab untuk mengelola autentikasi dan otorisasi pengguna dalam aplikasi TryFitOut menggunakan Firebase Authentication.

---

## Target Fungsi

### 1. User Management

* ✅ Register pengguna baru dengan email dan password
* ✅ Login pengguna yang sudah terdaftar
* ✅ Update profil pengguna (display name, photo URL)
* ✅ Delete akun pengguna secara permanen

### 2. Authentication & Authorization

* ✅ Integrasi dengan Firebase Authentication
* ✅ Generate dan validasi Firebase ID Token
* ✅ Kelola refresh token untuk session management
* ✅ Token validation untuk service lain melalui API Gateway

### 3. Security Features

* ✅ Password strength checking
* ✅ Email format validation
* ✅ Token expiration handling
* ✅ User access control berbasis Firebase UID

---

## API Endpoints

Base path: `/v1/auth`

### 1. User Registration

* **Endpoint:** `POST /v1/auth/register`
* **Fungsi:** Mendaftarkan user baru dengan Firebase Auth
* **Input:** Email, password, display name (opsional), photo URL (opsional)
* **Output:** User data dan ID token + refresh token

### 2. User Login

* **Endpoint:** `POST /v1/auth/login`
* **Fungsi:** Autentikasi user dan generate ID token
* **Input:** Email dan password
* **Output:** User data, ID token, refresh token

### 3. Refresh Token

* **Endpoint:** `POST /v1/auth/refresh`
* **Fungsi:** Mendapatkan ID token baru dari refresh token
* **Input:** Refresh token
* **Output:** ID token baru

### 4. Update Profile

* **Endpoint:** `PATCH /v1/auth/profile` 🔒
* **Fungsi:** Update informasi profil user
* **Input:** Display name, photo URL (opsional)
* **Output:** Updated user data

### 5. Delete Account

* **Endpoint:** `DELETE /v1/auth/user` 🔒
* **Fungsi:** Hapus akun user secara permanen
* **Input:** Password untuk konfirmasi
* **Output:** Konfirmasi penghapusan
