# Microservice Auth Boilerplate Documentation

Selamat datang di dokumentasi lengkap Microservice Auth Boilerplate. Dokumentasi ini menyediakan panduan komprehensif untuk menggunakan, mengkonfigurasi, dan mengintegrasikan boilerplate autentikasi microservice yang siap pakai.

## 📚 Daftar Dokumentasi

### 🚀 Getting Started
- **[API Endpoints](api-endpoints.md)** - Daftar lengkap endpoint dengan request/response examples
- **[Error Handling](error-handling.md)** - Panduan menangani berbagai jenis error
- **[Firebase Setup](firebase-setup.md)** - Konfigurasi Firebase Authentication step-by-step

### 🔧 Advanced Topics
- **[Database Integration](database-integration.md)** - Integrasi dengan database eksternal untuk data user tambahan

## 🎯 Quick Navigation

### Untuk Developer Frontend/Mobile
1. Mulai dengan [API Endpoints](api-endpoints.md) untuk memahami cara menggunakan API
2. Pelajari [Error Handling](error-handling.md) untuk implementasi error handling yang proper
3. Lihat contoh request/response untuk setiap endpoint

### Untuk DevOps/Backend Developer
1. Ikuti [Firebase Setup](firebase-setup.md) untuk konfigurasi Firebase
2. Pelajari [Database Integration](database-integration.md) jika perlu menyimpan data tambahan
3. Review security best practices di setiap dokumentasi

### Untuk Product Manager/QA
1. Baca [API Endpoints](api-endpoints.md) untuk memahami fitur yang tersedia
2. Review [Error Handling](error-handling.md) untuk memahami skenario error
3. Gunakan informasi ini untuk test case dan user story

## 🔑 Key Features

### Authentication Features
- ✅ **User Registration** - Email/password dengan validasi
- ✅ **User Login** - Secure authentication dengan JWT tokens
- ✅ **Token Refresh** - Automatic token renewal
- ✅ **Password Reset** - Email-based password reset flow
- ✅ **Profile Management** - Update display name dan photo
- ✅ **Account Deletion** - Secure account removal

### Security Features
- 🔒 **Firebase Auth Integration** - Enterprise-grade authentication
- 🔒 **JWT Token Validation** - Secure API access
- 🔒 **Input Validation** - Comprehensive request validation
- 🔒 **CORS Protection** - Cross-origin request security
- 🔒 **Error Sanitization** - Safe error messages

### Developer Experience
- 📝 **Standardized API** - Consistent request/response format
- 📝 **Comprehensive Documentation** - Detailed guides dan examples
- 📝 **TypeScript Support** - Full type safety
- 📝 **Error Codes** - Structured error handling

## 🚀 Quick Start

### 1. Setup Environment
```bash
# Clone repository
git clone <repository-url>
cd auth-service

# Install dependencies
bun install

# Setup environment
cp .env.example .env
# Edit .env dengan konfigurasi Firebase Anda
```

### 2. Configure Firebase
Ikuti panduan lengkap di [Firebase Setup](firebase-setup.md)

### 3. Start Development Server
```bash
bun run dev
```

### 4. Test API
```bash
# Health check
curl http://localhost:8001/health

# Register user
curl -X POST http://localhost:8001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 📋 API Overview

### Base URL
- **Development**: `http://localhost:8001`
- **Production**: `https://your-domain.com`

### Authentication
Gunakan Bearer token untuk protected endpoints:
```http
Authorization: Bearer <idToken>
```

### Response Format
Semua response mengikuti format standar:
```json
{
  "success": true|false,
  "data": { /* response data */ },
  "error": { /* error details jika ada */ },
  "message": "Human readable message",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

## 🛡️ Security Considerations

### Token Management
- **ID Token**: Berlaku 1 jam, gunakan untuk API calls
- **Refresh Token**: Berlaku lebih lama, gunakan untuk refresh ID token
- **Storage**: Simpan token dengan aman (secure storage/httpOnly cookies)

### Password Policy
- Minimum 8 karakter
- Harus mengandung huruf dan angka
- Validasi di client dan server

### CORS Policy
- Konfigurasi domain yang diizinkan
- Gunakan HTTPS di production
- Validate origin headers

## 🔧 Development Guidelines

### Code Style
- TypeScript untuk type safety
- Zod untuk runtime validation
- Consistent error handling
- Comprehensive logging

### Testing
```bash
# Run tests
bun test

# Test coverage
bun run test:coverage
```

### Building
```bash
# Development build
bun run build

# Production build
NODE_ENV=production bun run build
```

## 📊 Monitoring & Observability

### Health Checks
- `GET /health` - Service health status
- Monitor response time dan availability
- Setup alerts untuk downtime

### Logging
- Structured logging dengan timestamps
- Error tracking dan monitoring
- Performance metrics

### Metrics
- Authentication success/failure rates
- Token refresh patterns
- API endpoint usage

## 🚨 Troubleshooting

### Common Issues

#### Firebase Connection Issues
1. Verify environment variables
2. Check Firebase project configuration
3. Validate service account permissions

#### Token Issues
1. Check token expiration
2. Verify token format
3. Validate Firebase project ID

#### CORS Issues
1. Check allowed origins
2. Verify request headers
3. Validate HTTP methods

### Debug Commands
```bash
# Check environment
echo $FIREBASE_PROJECT_ID

# Test Firebase connection
bun run dev

# Validate configuration
curl -v http://localhost:8001/health
```

## 📞 Support

### Documentation Issues
- Create issue di repository
- Include steps to reproduce
- Provide environment details

### Feature Requests
- Discuss di GitHub Discussions
- Provide use case dan requirements
- Consider backward compatibility

### Security Issues
- Report privately via email
- Include detailed description
- Provide proof of concept jika ada

## 🔄 Updates & Changelog

### Version 1.0.0
- Initial release
- Basic authentication features
- Firebase integration
- Comprehensive documentation

### Roadmap
- [ ] Multi-factor authentication
- [ ] Social login (Google, Facebook)
- [ ] Rate limiting
- [ ] Advanced monitoring
- [ ] Database integration templates

## 📄 License

MIT License - see LICENSE file for details.

---

**Developed with ❤️ by Rayina Ilham**

Untuk pertanyaan atau bantuan, silakan buka issue di repository atau hubungi pengembang.
