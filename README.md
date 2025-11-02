# Microservice Auth Boilerplate

🚀 **Microservice Authentication Boilerplate** yang siap pakai untuk berbagai kebutuhan microservice! Dibangun dengan teknologi modern seperti **Hono**, **Firebase Authentication**, **TypeScript**, dan **Bun**.

## ✨ Fitur Utama

### 🔐 Authentication Features
- ✅ **User Registration** - Email/password dengan validasi
- ✅ **User Login** - Secure authentication dengan JWT tokens  
- ✅ **Token Refresh** - Automatic token renewal
- ✅ **Password Reset** - Email-based password reset flow
- ✅ **Profile Management** - Update display name dan photo
- ✅ **Account Deletion** - Secure account removal

### 🛡️ Security Features
- 🔒 **Firebase Auth Integration** - Enterprise-grade authentication
- 🔒 **JWT Token Validation** - Secure API access
- 🔒 **Input Validation** - Comprehensive request validation dengan Zod
- 🔒 **CORS Protection** - Cross-origin request security
- 🔒 **Error Sanitization** - Safe error messages

### 👨‍💻 Developer Experience
- 📝 **Standardized API** - Consistent request/response format
- 📚 **Comprehensive Documentation** - Detailed API docs dan setup guides
- 🔧 **TypeScript** - Full type safety
- ⚡ **Fast Runtime** - Powered by Bun
- 🧪 **Testing Ready** - Test structure included

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/rayinailham/micro-auth.git
cd micro-auth
```

### 2. Install Dependencies
```bash
bun install
```

### 3. Environment Setup
```bash
cp .env.example .env
# Edit .env dengan Firebase credentials Anda
```

### 4. Firebase Setup
Ikuti panduan lengkap di [Firebase Setup Guide](docs/firebase-setup.md)

### 5. Run Development Server
```bash
bun run dev
```

Server akan berjalan di `http://localhost:8001`

### 6. Test API
```bash
# Health check
curl http://localhost:8001/health

# Register user
curl -X POST http://localhost:8001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 📚 Dokumentasi

### 🚀 Getting Started
- **[API Endpoints](docs/api-endpoints.md)** - Daftar lengkap endpoint dengan request/response examples
- **[Error Handling](docs/error-handling.md)** - Panduan menangani berbagai jenis error
- **[Firebase Setup](docs/firebase-setup.md)** - Konfigurasi Firebase Authentication step-by-step

### 🎯 Quick Navigation

#### Untuk Developer Frontend/Mobile
1. Mulai dengan [API Endpoints](docs/api-endpoints.md) untuk memahami cara menggunakan API
2. Pelajari [Error Handling](docs/error-handling.md) untuk implementasi error handling yang proper
3. Lihat contoh request/response untuk setiap endpoint

#### Untuk DevOps/Backend Developer
1. Ikuti [Firebase Setup](docs/firebase-setup.md) untuk konfigurasi Firebase
2. Review security best practices di setiap dokumentasi
3. Customize CORS settings sesuai kebutuhan

#### Untuk Product Manager/QA
1. Baca [API Endpoints](docs/api-endpoints.md) untuk memahami fitur yang tersedia
2. Review [Error Handling](docs/error-handling.md) untuk memahami skenario error
3. Gunakan informasi ini untuk test case dan user story

## 🛠️ Tech Stack

- **Runtime**: [Bun](https://bun.sh/) - Fast JavaScript runtime
- **Framework**: [Hono](https://hono.dev/) - Lightweight web framework
- **Authentication**: [Firebase Auth](https://firebase.google.com/products/auth) - Google's authentication service
- **Validation**: [Zod](https://zod.dev/) - TypeScript-first schema validation
- **Language**: [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

## 📋 API Overview

### Base URL
- **Development**: `http://localhost:8001`
- **Production**: `https://your-domain.com`

### Authentication
Gunakan Bearer token untuk protected endpoints:
```http
Authorization: Bearer <idToken>
```

### Available Endpoints
- `GET /health` - Health check
- `GET /` - Service info
- `POST /v1/auth/register` - User registration
- `POST /v1/auth/login` - User login
- `POST /v1/auth/refresh-token` - Refresh access token
- `POST /v1/auth/reset-password` - Send password reset email
- `GET /v1/auth/profile` - Get user profile (requires auth)
- `PATCH /v1/auth/profile` - Update user profile (requires auth)
- `DELETE /v1/auth/account` - Delete user account (requires auth)

## � Customization

### 1. Environment Variables
Copy `.env.example` ke `.env` dan sesuaikan:
```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-private-key"

# Server Configuration  
PORT=8001
NODE_ENV=development
```

### 2. CORS Configuration
Update CORS settings di `src/index.ts`:
```typescript
app.use('*', cors({
  origin: [
    'http://localhost:3000',           // Development
    'https://yourdomain.com',          // Production  
    'https://app.yourdomain.com'       // App domain
  ],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
```

### 3. Custom Endpoints
Tambahkan routes baru di `src/routes/` dan import di `src/index.ts`

## 🧪 Testing

```bash
# Run tests
bun test

# Run tests with coverage
bun test --coverage
```

## � Production Deployment

### 1. Build
```bash
bun run build
```

### 2. Start Production Server
```bash
bun run start
```

### 3. Environment
Pastikan environment variables production sudah di-set dengan benar.

## �🚨 Troubleshooting

### Common Issues

#### 1. "Firebase Admin SDK not initialized"
```bash
# Check environment variables
echo $FIREBASE_PROJECT_ID
echo $FIREBASE_CLIENT_EMAIL

# Verify .env file exists and has correct values
cat .env
```

#### 2. "Invalid private key"
```bash
# Private key format should be:
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

#### 3. CORS Issues
Update origin array di `src/index.ts` dengan domain yang diizinkan.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍� Author

**Rayin Ailham**
- GitHub: [@rayinailham](https://github.com/rayinailham)

## 🙏 Acknowledgments

- [Hono](https://hono.dev/) - Amazing web framework
- [Firebase](https://firebase.google.com/) - Reliable authentication service
- [Bun](https://bun.sh/) - Fast JavaScript runtime

---

**Developed with ❤️ by Rayina Ilham**

Last updated: November 2, 2025
