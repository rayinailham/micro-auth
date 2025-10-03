# API Endpoints v1 - Standardization

Dokumentasi ini menjelaskan seluruh endpoint API v1 untuk aplikasi TryFitOut, termasuk kontrak request/response, autentikasi, dan error handling.

---

## Base URL

```
https://api.tryfitout.com/v1
```

Semua endpoint di bawah ini menggunakan prefix `/v1`.

---

## Data Flow Overview

### Alur Umum Penggunaan API

1. **Autentikasi User**
   - User register/login melalui Auth Service
   - Mendapatkan Firebase ID Token
   
2. **Upload Image User**
   - User upload foto pribadi ke Archive Service (`POST /v1/archive/images`)
   - Image disimpan di cloud storage
   - Server mengembalikan `imageId` dan URL cloud storage
   
3. **Browse Catalog**
   - User melihat daftar outfit dari katalog (`GET /v1/archive/catalog/outfits`)
   - Semua outfit sudah tersimpan di cloud storage
   - Response berisi `outfitId` dan URL cloud storage untuk setiap outfit
   
4. **Virtual Try-On**
   - Client mengirim `imageId` dan `outfitId` ke AI Service (`POST /v1/ai/try-on`)
   - AI Service mengambil image user dari cloud storage (berdasarkan `imageId`)
   - AI Service mengambil outfit dari archive-service (berdasarkan `outfitId`)
   - AI Service melakukan fusion processing
   - AI Service menyimpan hasil ke cloud storage
   - **Response langsung berisi URL hasil fusion** (tidak perlu polling)
   
5. **View History**
   - User dapat melihat history fusion (`GET /v1/archive/fusions`)
   - Semua hasil berupa URL ke cloud storage

### Keuntungan Alur Ini

- ✅ User hanya upload image sekali, bisa digunakan berkali-kali
- ✅ Client tidak perlu download/upload gambar berulang kali
- ✅ Semua image URL langsung bisa diakses dari cloud storage
- ✅ Proses try-on synchronous, hasil langsung tersedia
- ✅ Hemat bandwidth dan waktu pemrosesan

---

## Authentication

Aplikasi menggunakan **Firebase Authentication**. Untuk endpoint yang dilindungi (🔒), sertakan token Firebase Auth dalam header:

```http
Authorization: Bearer <firebase_id_token>
```

### Token Validation Flow

1. Client mendapatkan ID token dari Firebase Auth SDK
2. Client mengirim request dengan header Authorization
3. API Gateway memvalidasi token melalui auth-service
4. Jika valid, request diteruskan ke service terkait

---

## Response Format Standard

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... }
  },
  "timestamp": "2025-10-03T10:30:00Z"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `413` - Payload Too Large
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## 1. Auth Service Endpoints

Base path: `/v1/auth`

### 1.1 Register User

**Endpoint:** `POST /v1/auth/register`

**Description:** Mendaftarkan user baru menggunakan Firebase Authentication.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "John Doe",
  "photoURL": "https://example.com/photo.jpg"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "uid": "firebase_user_id",
    "email": "user@example.com",
    "displayName": "John Doe",
    "photoURL": "https://example.com/photo.jpg",
    "createdAt": "2025-10-03T10:30:00Z"
  },
  "message": "User registered successfully",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Error Responses:**

- `400` - Invalid email or password format
- `409` - Email already exists

---

### 1.2 Login User

**Endpoint:** `POST /v1/auth/login`

**Description:** Login user dan mendapatkan Firebase ID token.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "uid": "firebase_user_id",
    "email": "user@example.com",
    "displayName": "John Doe",
    "idToken": "firebase_id_token_here",
    "refreshToken": "firebase_refresh_token_here",
    "expiresIn": "3600"
  },
  "message": "Login successful",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Error Responses:**

- `400` - Invalid credentials
- `401` - Authentication failed

---

### 1.3 Logout User

**Endpoint:** `POST /v1/auth/logout` 🔒

**Description:** Logout user dan invalidate token.

**Headers:**

```http
Authorization: Bearer <firebase_id_token>
```

**Request Body:**

```json
{
  "refreshToken": "firebase_refresh_token_here"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": null,
  "message": "Logout successful",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

---

### 1.4 Update User Profile

**Endpoint:** `PATCH /v1/auth/profile` 🔒

**Description:** Update informasi profil user.

**Headers:**

```http
Authorization: Bearer <firebase_id_token>
```

**Request Body:**

```json
{
  "displayName": "Jane Doe",
  "photoURL": "https://example.com/new-photo.jpg"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "uid": "firebase_user_id",
    "email": "user@example.com",
    "displayName": "Jane Doe",
    "photoURL": "https://example.com/new-photo.jpg",
    "updatedAt": "2025-10-03T10:30:00Z"
  },
  "message": "Profile updated successfully",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Error Responses:**

- `400` - Invalid data format
- `401` - Unauthorized

---

### 1.5 Delete User

**Endpoint:** `DELETE /v1/auth/user` 🔒

**Description:** Menghapus akun user secara permanen.

**Headers:**

```http
Authorization: Bearer <firebase_id_token>
```

**Request Body:**

```json
{
  "password": "securePassword123"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": null,
  "message": "User deleted successfully",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Error Responses:**

- `401` - Unauthorized or incorrect password
- `404` - User not found

---

## 2. Archive Service Endpoints

Base path: `/v1/archive`

### 2.1 Upload User Image

**Endpoint:** `POST /v1/archive/images` 🔒

**Description:** Upload foto user yang akan digunakan untuk virtual try-on. Image akan disimpan di cloud storage dan dapat digunakan berkali-kali tanpa perlu upload ulang.

**Headers:**

```http
Authorization: Bearer <firebase_id_token>
Content-Type: multipart/form-data
```

**Form Data:**

- `image` - File upload (required)
  - Supported formats: JPG, JPEG, PNG
  - Max size: 10MB
  - Recommended: Portrait orientation, minimal 512x768px

**Example Request (cURL):**

```bash
curl -X POST https://api.tryfitout.com/v1/archive/images \
  -H "Authorization: Bearer <firebase_id_token>" \
  -F "image=@/path/to/photo.jpg"
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "img_123456",
    "userId": "firebase_user_id",
    "imageUrl": "https://storage.tryfitout.com/users/firebase_user_id/img_123456.jpg",
    "thumbnailUrl": "https://storage.tryfitout.com/users/firebase_user_id/thumb_img_123456.jpg",
    "uploadedAt": "2025-10-03T10:30:00Z",
    "metadata": {
      "width": 1024,
      "height": 1536,
      "format": "jpg",
      "size": 245760
    }
  },
  "message": "Image uploaded successfully",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Response Fields:**

- `id` - Unique ID untuk image ini (digunakan untuk try-on)
- `imageUrl` - **Direct URL ke cloud storage** (dapat langsung diakses oleh client)
- `thumbnailUrl` - URL thumbnail untuk preview
- `metadata` - Informasi teknis image

**Error Responses:**

- `400` - Invalid file format or size
- `401` - Unauthorized
- `413` - File too large
- `422` - Invalid image (corrupted or unreadable)

---

### 2.2 Get User Input Images

**Endpoint:** `GET /v1/archive/images` 🔒

**Description:** Mengambil daftar gambar yang pernah diupload oleh user. Response berisi URL ke cloud storage tempat image disimpan.

**Headers:**

```http
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**

- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Items per page
- `sort` (optional, default: "created_desc") - Sort order: `created_asc`, `created_desc`

**Example Request:**

```http
GET /v1/archive/images?page=1&limit=20&sort=created_desc
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "images": [
      {
        "id": "img_123456",
        "userId": "firebase_user_id",
        "imageUrl": "https://storage.tryfitout.com/users/firebase_user_id/img_123456.jpg",
        "thumbnailUrl": "https://storage.tryfitout.com/users/firebase_user_id/thumb_img_123456.jpg",
        "uploadedAt": "2025-10-03T10:30:00Z",
        "metadata": {
          "width": 1024,
          "height": 1536,
          "format": "jpg",
          "size": 245760
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 45,
      "itemsPerPage": 20
    }
  },
  "message": "Images retrieved successfully",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Note:** Semua `imageUrl` dan `thumbnailUrl` adalah direct URL ke cloud storage yang dapat langsung digunakan oleh client untuk menampilkan gambar.

---

### 2.3 Delete User Image

**Endpoint:** `DELETE /v1/archive/images/{imageId}` 🔒

**Description:** Menghapus image user dari cloud storage.

**Headers:**

```http
Authorization: Bearer <firebase_id_token>
```

**Path Parameters:**

- `imageId` - ID dari image yang akan dihapus

**Example Request:**

```http
DELETE /v1/archive/images/img_123456
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": null,
  "message": "Image deleted successfully",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Error Responses:**

- `401` - Unauthorized
- `403` - Forbidden (image belongs to another user)
- `404` - Image not found

---

### 2.4 Get User Fusion Results

**Endpoint:** `GET /v1/archive/fusions` 🔒

**Description:** Mengambil daftar hasil virtual try-on (fusion) yang pernah dibuat oleh user. Response berisi URL ke cloud storage.

**Headers:**

```http
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**

- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `sort` (optional, default: "created_desc")

**Example Request:**

```http
GET /v1/archive/fusions?page=1&limit=20
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "fusions": [
      {
        "id": "fusion_789012",
        "userId": "firebase_user_id",
        "userImageId": "img_123456",
        "outfitId": "outfit_456789",
        "resultImageUrl": "https://storage.tryfitout.com/fusions/firebase_user_id/fusion_789012.jpg",
        "thumbnailUrl": "https://storage.tryfitout.com/fusions/firebase_user_id/thumb_fusion_789012.jpg",
        "createdAt": "2025-10-03T10:30:00Z",
        "processingTime": 3.5,
        "metadata": {
          "modelVersion": "v2.1",
          "imageResolution": "1024x1536"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalItems": 28,
      "itemsPerPage": 20
    }
  },
  "message": "Fusion results retrieved successfully",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Note:** Semua `resultImageUrl` dan `thumbnailUrl` adalah direct URL ke cloud storage yang dapat langsung digunakan oleh client.

---

### 2.5 Delete Fusion Result

**Endpoint:** `DELETE /v1/archive/fusions/{fusionId}` 🔒

**Description:** Menghapus hasil fusion dari cloud storage.

**Headers:**

```http
Authorization: Bearer <firebase_id_token>
```

**Path Parameters:**

- `fusionId` - ID dari fusion yang akan dihapus

**Example Request:**

```http
DELETE /v1/archive/fusions/fusion_789012
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": null,
  "message": "Fusion result deleted successfully",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Error Responses:**

- `401` - Unauthorized
- `403` - Forbidden (fusion belongs to another user)
- `404` - Fusion not found

---

### 2.6 Get All Catalog Outfits

**Endpoint:** `GET /v1/archive/catalog/outfits` 🔒

**Description:** Mengambil semua outfit yang tersedia di katalog. Response berisi URL ke cloud storage untuk setiap outfit.

**Headers:**

```http
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**

- `page` (optional, default: 1)
- `limit` (optional, default: 50)
- `search` (optional) - Search by name or description

**Example Request:**

```http
GET /v1/archive/catalog/outfits?page=1&limit=50&search=summer
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "outfits": [
      {
        "id": "outfit_456789",
        "name": "Summer Beach Shirt",
        "description": "Light and comfortable beach shirt",
        "type": "shirt",
        "imageUrl": "https://storage.tryfitout.com/catalog/outfits/outfit_456789.jpg",
        "thumbnailUrl": "https://storage.tryfitout.com/catalog/outfits/thumb_outfit_456789.jpg",
        "metadata": {
          "brand": "BeachWear Co.",
          "color": "blue",
          "season": "summer",
          "tags": ["casual", "beach", "summer"]
        },
        "createdAt": "2025-09-01T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 485,
      "itemsPerPage": 50
    }
  },
  "message": "Catalog outfits retrieved successfully",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Note:** Semua URL outfit adalah direct URL ke cloud storage.

---

### 2.7 Get Outfits by Type

**Endpoint:** `GET /v1/archive/catalog/outfits/type/{type}` 🔒

**Description:** Mengambil outfit berdasarkan tipe tertentu. Response berisi URL ke cloud storage.

**Headers:**

```http
Authorization: Bearer <firebase_id_token>
```

**Path Parameters:**

- `type` - Tipe outfit: `shirt`, `pants`, `hat`, `set`

**Query Parameters:**

- `page` (optional, default: 1)
- `limit` (optional, default: 50)

**Example Request:**

```http
GET /v1/archive/catalog/outfits/type/shirt?page=1&limit=50
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "type": "shirt",
    "outfits": [
      {
        "id": "outfit_456789",
        "name": "Summer Beach Shirt",
        "description": "Light and comfortable beach shirt",
        "type": "shirt",
        "imageUrl": "https://storage.tryfitout.com/catalog/outfits/outfit_456789.jpg",
        "thumbnailUrl": "https://storage.tryfitout.com/catalog/outfits/thumb_outfit_456789.jpg",
        "metadata": {
          "brand": "BeachWear Co.",
          "color": "blue",
          "season": "summer",
          "tags": ["casual", "beach", "summer"]
        },
        "createdAt": "2025-09-01T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 125,
      "itemsPerPage": 50
    }
  },
  "message": "Outfits retrieved successfully",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Error Responses:**

- `400` - Invalid type parameter (must be: shirt, pants, hat, or set)
- `401` - Unauthorized

**Note:** Semua URL outfit adalah direct URL ke cloud storage.

---

## 3. AI Service Endpoints

Base path: `/v1/ai`

### 3.1 Virtual Try-On

**Endpoint:** `POST /v1/ai/try-on` 🔒

**Description:** Melakukan virtual try-on dengan menggabungkan gambar user dan outfit dari katalog. Client mengirimkan `imageId` (dari image yang sudah diupload sebelumnya) dan `outfitId` (dari katalog), kemudian AI service **langsung mengembalikan hasil fusion sebagai response** (synchronous).

**Data Flow:**
1. User upload image terlebih dahulu ke `/v1/archive/images` → mendapat `imageId`
2. User memilih outfit dari katalog (`/v1/archive/catalog/outfits`) → mendapat `outfitId`
3. Client mengirim `imageId` dan `outfitId` ke endpoint ini
4. AI service mengambil image user dari cloud storage (berdasarkan `imageId`)
5. AI service mengambil outfit dari archive-service (berdasarkan `outfitId`)
6. AI service melakukan fusion processing
7. AI service menyimpan hasil ke cloud storage
8. **Response langsung berisi URL hasil fusion** (tidak perlu polling atau check status)

**Headers:**

```http
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "imageId": "img_123456",
  "outfitId": "outfit_456789",
  "saveResult": true
}
```

**Request Fields:**

- `imageId` (required) - ID dari user image yang sudah diupload sebelumnya
- `outfitId` (required) - ID dari outfit di katalog
- `saveResult` (optional, default: true) - Apakah hasil akan disimpan di history fusion user

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "fusionId": "fusion_789012",
    "imageId": "img_123456",
    "outfitId": "outfit_456789",
    "resultImageUrl": "https://storage.tryfitout.com/fusions/firebase_user_id/fusion_789012.jpg",
    "thumbnailUrl": "https://storage.tryfitout.com/fusions/firebase_user_id/thumb_fusion_789012.jpg",
    "processingTime": 2.8,
    "createdAt": "2025-10-03T10:30:00Z",
    "metadata": {
      "modelVersion": "v2.1",
      "imageResolution": "1024x1536",
      "processingNode": "ai-node-03"
    }
  },
  "message": "Virtual try-on completed successfully",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

**Response Fields:**

- `fusionId` - Unique ID untuk hasil fusion
- `imageId` - ID image user yang digunakan
- `outfitId` - ID outfit yang digunakan
- `resultImageUrl` - **Direct URL ke cloud storage untuk hasil fusion** (dapat langsung digunakan oleh client)
- `thumbnailUrl` - Direct URL untuk thumbnail hasil fusion
- `processingTime` - Waktu pemrosesan dalam detik
- `createdAt` - Timestamp pembuatan
- `metadata` - Informasi tambahan tentang pemrosesan

**Example Request (cURL):**

```bash
curl -X POST https://api.tryfitout.com/v1/ai/try-on \
  -H "Authorization: Bearer <firebase_id_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": "img_123456",
    "outfitId": "outfit_456789",
    "saveResult": true
  }'
```

**Error Responses:**

- `400` - Invalid imageId or outfitId format
- `401` - Unauthorized
- `403` - Forbidden (imageId doesn't belong to user)
- `404` - Image or outfit not found
- `422` - Image or outfit not compatible for fusion
- `500` - Processing error
- `503` - AI service temporarily unavailable

**Important Notes:**

- ✅ Endpoint ini adalah **synchronous** - response langsung berisi hasil fusion
- ✅ **Tidak perlu polling** atau check status - hasil langsung tersedia
- ✅ `resultImageUrl` adalah direct URL ke cloud storage yang dapat langsung digunakan oleh client
- ✅ Jika `saveResult` = true, hasil fusion akan tersimpan dan dapat diakses di `/v1/archive/fusions`
- ✅ Client tidak perlu mengirim file image - cukup `imageId` saja
- ✅ Client tidak perlu mengirim file outfit - cukup `outfitId` saja

---

## Error Codes Reference

### Auth Service Errors

- `AUTH_001` - Invalid credentials
- `AUTH_002` - Email already exists
- `AUTH_003` - Invalid token
- `AUTH_004` - Token expired
- `AUTH_005` - User not found
- `AUTH_006` - Weak password
- `AUTH_007` - Invalid email format

### Archive Service Errors

- `ARCHIVE_001` - Image not found
- `ARCHIVE_002` - Outfit not found
- `ARCHIVE_003` - Invalid outfit type
- `ARCHIVE_004` - Access denied
- `ARCHIVE_005` - Storage error
- `ARCHIVE_006` - Invalid file format
- `ARCHIVE_007` - File too large

### AI Service Errors

- `AI_001` - Invalid image format
- `AI_002` - Image too large
- `AI_003` - Image too small
- `AI_004` - Processing failed
- `AI_005` - Model error
- `AI_006` - Outfit not compatible
- `AI_007` - Processing timeout
- `AI_008` - Image not found in storage
- `AI_009` - Outfit not found in catalog

---

## Rate Limiting

API menggunakan rate limiting untuk mencegah abuse:

- **Auth endpoints:** 10 requests/minute per IP
- **Archive endpoints:** 100 requests/minute per user
- **AI endpoints:** 20 requests/minute per user (karena resource intensive)

**Rate Limit Headers:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696329000
```

**Rate Limit Exceeded Response:** `429 Too Many Requests`

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 60
    }
  },
  "timestamp": "2025-10-03T10:30:00Z"
}
```

---

## Cloud Storage

Semua image (user images, outfits, fusion results) disimpan di cloud storage dengan struktur berikut:

```
https://storage.tryfitout.com/
├── users/
│   └── {userId}/
│       ├── img_{imageId}.jpg          # Original user image
│       └── thumb_img_{imageId}.jpg    # Thumbnail
├── fusions/
│   └── {userId}/
│       ├── fusion_{fusionId}.jpg      # Fusion result
│       └── thumb_fusion_{fusionId}.jpg # Thumbnail
└── catalog/
    └── outfits/
        ├── outfit_{outfitId}.jpg      # Original outfit
        └── thumb_outfit_{outfitId}.jpg # Thumbnail
```

### URL Properties

- ✅ Direct access (tidak perlu authentication untuk read)
- ✅ CDN-enabled untuk performance
- ✅ Signed URLs dengan expiration (optional untuk private content)
- ✅ Automatic image optimization
- ✅ Multiple resolutions tersedia (thumbnail, medium, large)

---

## Versioning

API menggunakan versioning melalui URL path (`/v1`, `/v2`, dll). Client harus selalu menyertakan versi dalam request.

Ketika ada perubahan breaking, version baru akan dirilis dan version lama akan tetap didukung selama minimal 6 bulan.

**Breaking Changes yang memerlukan version baru:**

- Perubahan struktur response
- Penghapusan field yang ada
- Perubahan behavior endpoint
- Perubahan authentication method

**Non-breaking Changes (tidak perlu version baru):**

- Penambahan field baru di response
- Penambahan endpoint baru
- Penambahan optional parameter

---

## Best Practices untuk Client

### 1. Image Upload

```javascript
// Upload image sekali
const uploadResponse = await fetch('/v1/archive/images', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`
  },
  body: formData
});

const { data } = await uploadResponse.json();
const imageId = data.id; // Simpan imageId untuk digunakan berkali-kali
```

### 2. Virtual Try-On

```javascript
// Gunakan imageId yang sudah ada
const tryOnResponse = await fetch('/v1/ai/try-on', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    imageId: imageId,        // Dari upload sebelumnya
    outfitId: 'outfit_123',  // Dari katalog
    saveResult: true
  })
});

const { data } = await tryOnResponse.json();
// Hasil langsung tersedia di data.resultImageUrl
// Tampilkan langsung ke user tanpa delay
```

### 3. Display Images

```javascript
// Semua URL bisa langsung digunakan
<img src={data.resultImageUrl} alt="Try-on result" />
<img src={outfit.imageUrl} alt="Outfit" />
<img src={userImage.thumbnailUrl} alt="User photo" />
```

---

## Support

Untuk pertanyaan atau issues terkait API, silakan hubungi:

- Email: api-support@tryfitout.com
- Documentation: https://docs.tryfitout.com
- Status Page: https://status.tryfitout.com
- GitHub: https://github.com/tryfitout
