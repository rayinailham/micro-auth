# TryFitOut Auth Service

A Hono-based authentication service integrated with Firebase Auth for the TryFitOut application.

## Features

- ✅ User registration with email/password
- ✅ User login and token generation
- ✅ Token refresh functionality
- ✅ Protected profile updates
- ✅ Account deletion with password confirmation
- ✅ Firebase Authentication integration
- ✅ Comprehensive input validation with Zod
- ✅ Standardized API responses
- ✅ CORS support
- ✅ Error handling and logging

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Authentication**: Firebase Auth
- **Validation**: Zod
- **Language**: TypeScript

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Fill in your Firebase configuration:

```env
PORT=3001
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_API_KEY=your-web-api-key
NODE_ENV=development
```

### 3. Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication with Email/Password provider
3. Generate a service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Use the downloaded JSON for environment variables
4. Get your Web API Key from Project Settings > General

### 4. Run the Service

Development mode with hot reload:
```bash
bun run dev
```

Production build and run:
```bash
bun run build
bun run start
```

## API Endpoints

Base URL: `http://localhost:3001`

### Health Check
- `GET /health` - Service health status

### Authentication Endpoints

All endpoints use the base path `/v1/auth`:

#### 1. Register User
- **POST** `/v1/auth/register`
- **Body**: `{ email, password, displayName?, photoURL? }`
- **Response**: User data with tokens

#### 2. Login User
- **POST** `/v1/auth/login`
- **Body**: `{ email, password }`
- **Response**: User data with tokens

#### 3. Refresh Token
- **POST** `/v1/auth/refresh`
- **Body**: `{ refreshToken }`
- **Response**: New ID token

#### 4. Logout User (Protected)
- **POST** `/v1/auth/logout`
- **Headers**: `Authorization: Bearer <id_token>`
- **Body**: `{ refreshToken }`
- **Response**: Success confirmation

#### 5. Update Profile (Protected)
- **PATCH** `/v1/auth/profile`
- **Headers**: `Authorization: Bearer <id_token>`
- **Body**: `{ displayName?, photoURL? }`
- **Response**: Updated user data

#### 6. Delete Account (Protected)
- **DELETE** `/v1/auth/user`
- **Headers**: `Authorization: Bearer <id_token>`
- **Body**: `{ password }`
- **Response**: Deletion confirmation

## Response Format

All responses follow a standardized format:

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
  "message": "Operation failed",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

## Error Codes

- `AUTH_001` - Invalid credentials
- `AUTH_002` - Email already exists
- `AUTH_003` - Invalid token
- `AUTH_004` - Token expired
- `AUTH_005` - User not found
- `AUTH_006` - Weak password
- `AUTH_007` - Invalid email format

## Development

### Project Structure

```
src/
├── config/
│   └── firebase-config.ts    # Firebase configuration
├── middleware/
│   └── auth.ts              # Authentication middleware
├── routes/
│   └── auth.ts              # Auth route handlers
├── schemas/
│   └── auth.ts              # Zod validation schemas
├── types/
│   └── auth.ts              # TypeScript type definitions
├── utils/
│   ├── errors.ts            # Error handling utilities
│   └── response.ts          # Response formatting utilities
└── index.ts                 # Main server file
```

### Testing

Run tests:
```bash
bun test
```

### Building

Build for production:
```bash
bun run build
```

## Deployment

The service is designed to be deployed as a microservice. Make sure to:

1. Set all required environment variables
2. Configure CORS origins for your domain
3. Set up proper logging and monitoring
4. Use HTTPS in production

## License

MIT
