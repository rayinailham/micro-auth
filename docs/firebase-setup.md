# Firebase Setup Guide

Panduan lengkap untuk mengkonfigurasi Firebase Authentication untuk Microservice Auth Boilerplate.

## 🚀 Prerequisites

- Akun Google untuk mengakses Firebase Console
- Node.js atau Bun terinstall di sistem
- Text editor untuk mengedit file konfigurasi

## 📋 Step-by-Step Setup

### 1. Buat Firebase Project

1. **Buka Firebase Console**
   - Kunjungi [https://console.firebase.google.com](https://console.firebase.google.com)
   - Login dengan akun Google Anda

2. **Create New Project**
   - Klik "Create a project" atau "Add project"
   - Masukkan nama project: `my-auth-service` (atau nama yang Anda inginkan)
   - Pilih apakah ingin mengaktifkan Google Analytics (opsional)
   - Klik "Create project"

3. **Tunggu Project Setup**
   - Firebase akan setup project Anda
   - Klik "Continue" setelah selesai

### 2. Enable Authentication

1. **Buka Authentication**
   - Di sidebar kiri, klik "Authentication"
   - Klik "Get started" jika pertama kali

2. **Setup Sign-in Method**
   - Klik tab "Sign-in method"
   - Klik "Email/Password"
   - Toggle "Enable" untuk mengaktifkan
   - Klik "Save"

3. **Optional: Setup Email Templates**
   - Klik tab "Templates"
   - Customize template untuk:
     - Password reset
     - Email verification
     - Email address change

### 3. Get Firebase Configuration

#### A. Web API Key

1. **Project Settings**
   - Klik ⚙️ (gear icon) di sidebar
   - Pilih "Project settings"

2. **General Tab**
   - Scroll ke bawah ke section "Your apps"
   - Jika belum ada web app, klik "Add app" → Web (</>) icon
   - Masukkan app nickname: `my-auth-web`
   - Klik "Register app"

3. **Copy Web API Key**
   - Di section "SDK setup and configuration"
   - Copy nilai `apiKey` dari config object
   - Simpan untuk environment variable `FIREBASE_API_KEY`

#### B. Service Account Key

1. **Service Accounts Tab**
   - Masih di Project Settings
   - Klik tab "Service accounts"

2. **Generate Private Key**
   - Klik "Generate new private key"
   - Konfirmasi dengan klik "Generate key"
   - File JSON akan ter-download

3. **Extract Information**
   - Buka file JSON yang ter-download
   - Copy nilai berikut:
     - `project_id` → untuk `FIREBASE_PROJECT_ID`
     - `client_email` → untuk `FIREBASE_CLIENT_EMAIL`
     - `private_key` → untuk `FIREBASE_PRIVATE_KEY`

### 4. Environment Configuration

1. **Create .env File**
   ```bash
   cp .env.example .env
   ```

2. **Fill Environment Variables**
   ```env
   # Server Configuration
   PORT=8001
   NODE_ENV=development

   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
   FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

3. **Important Notes**
   - `FIREBASE_PRIVATE_KEY` harus dalam format string dengan `\n` untuk newlines
   - Pastikan private key dibungkus dengan double quotes
   - Jangan commit file `.env` ke version control

### 5. Test Configuration

1. **Start Development Server**
   ```bash
   bun run dev
   ```

2. **Check Health Endpoint**
   ```bash
   curl http://localhost:8001/health
   ```

3. **Test Registration**
   ```bash
   curl -X POST http://localhost:8001/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123",
       "displayName": "Test User"
     }'
   ```

## 🔧 Advanced Configuration

### 1. Custom Email Templates

1. **Access Templates**
   - Firebase Console → Authentication → Templates

2. **Password Reset Template**
   ```html
   <p>Hello,</p>
   <p>Follow this link to reset your password:</p>
   <p><a href="%LINK%">Reset Password</a></p>
   <p>If you didn't ask to reset your password, you can ignore this email.</p>
   <p>Thanks,<br>Your Auth Service Team</p>
   ```

3. **Customize Domain**
   - Klik "Customize domain" untuk menggunakan domain sendiri
   - Tambahkan DNS record sesuai instruksi Firebase

### 2. Security Rules

1. **Authentication Settings**
   - Firebase Console → Authentication → Settings

2. **User Actions**
   - Set "User account management" sesuai kebutuhan:
     - Create (enabled)
     - Delete (enabled)
     - Multi-factor authentication (optional)

3. **Authorized Domains**
   - Tambahkan domain production Anda
   - Format: `https://yourdomain.com`

### 3. Monitoring & Analytics

1. **Enable Analytics**
   - Firebase Console → Analytics
   - Link dengan Google Analytics (optional)

2. **Authentication Metrics**
   - Monitor sign-up rates
   - Track authentication errors
   - User retention metrics

## 🛡️ Security Best Practices

### 1. Environment Variables

```bash
# Production .env example
NODE_ENV=production
PORT=8001

# Firebase - Use secure values
FIREBASE_PROJECT_ID=my-auth-prod
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@my-auth-prod.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 2. Service Account Permissions

1. **Minimal Permissions**
   - Hanya berikan permission yang diperlukan
   - Gunakan service account terpisah untuk production

2. **Key Rotation**
   - Rotate service account key secara berkala
   - Monitor penggunaan key di Firebase Console

### 3. CORS Configuration

```typescript
// Update CORS settings di src/index.ts
app.use('*', cors({
  origin: [
    'http://localhost:3000',           // Development
    'https://yourdomain.com',         // Production
    'https://app.yourdomain.com'      // App domain
  ],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
```

## 🚨 Troubleshooting

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

# Make sure to escape newlines with \n
```

#### 3. "API key not valid"
```bash
# Verify API key from Firebase Console
# Project Settings → General → Web API Key
```

#### 4. "Permission denied"
```bash
# Check service account permissions
# IAM & Admin → Service Accounts → Check roles
```

### Debug Commands

```bash
# Test Firebase connection
bun run dev

# Check logs
tail -f logs/app.log

# Test endpoints
curl -v http://localhost:8001/health
```

## 📚 Additional Resources

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firebase Console](https://console.firebase.google.com)

## 🆘 Support

Jika mengalami masalah:

1. **Check Firebase Status**: [https://status.firebase.google.com](https://status.firebase.google.com)
2. **Firebase Support**: [https://firebase.google.com/support](https://firebase.google.com/support)
3. **Stack Overflow**: Tag `firebase` dan `firebase-authentication`
4. **GitHub Issues**: Report di repository ini
