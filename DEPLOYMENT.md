# Deployment Guide - TryFitOut Auth Service

## 🚀 Quick Start

### Prerequisites
- Bun runtime installed
- Firebase project set up
- Environment variables configured

### Local Development
```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your Firebase credentials

# Run in development mode
bun run dev

# Run tests
bun test

# Build for production
bun run build
```

## 🔧 Environment Configuration

### Required Environment Variables
```env
# Server
PORT=3001

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_API_KEY=your-web-api-key

# Environment
NODE_ENV=production
```

### Firebase Setup Steps
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing
3. Enable Authentication → Email/Password provider
4. Go to Project Settings → Service Accounts
5. Generate new private key (download JSON)
6. Go to Project Settings → General → Web API Key
7. Update .env with the credentials

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Option 2: Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway deploy
```

### Option 3: Fly.io
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Initialize and deploy
fly launch
fly deploy
```

### Option 4: Docker
```dockerfile
# Dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

EXPOSE 3001

CMD ["bun", "run", "start"]
```

```bash
# Build and run
docker build -t auth-service .
docker run -p 3001:3001 --env-file .env auth-service
```

### Option 5: Traditional VPS
```bash
# On your server
git clone <your-repo>
cd auth-service

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install dependencies and build
bun install
bun run build

# Use PM2 for process management
npm i -g pm2
pm2 start dist/index.js --name auth-service
pm2 startup
pm2 save
```

## 🔒 Production Checklist

### Security
- [ ] Environment variables properly set
- [ ] Firebase service account key secured
- [ ] CORS origins configured for production domains
- [ ] HTTPS enabled
- [ ] Rate limiting configured (if needed)

### Performance
- [ ] Build optimized for production
- [ ] Logging configured
- [ ] Health check endpoint working
- [ ] Monitoring set up

### Testing
- [ ] All tests passing
- [ ] Integration tests with Firebase
- [ ] Load testing completed
- [ ] Error handling verified

## 📊 Monitoring

### Health Check
```bash
curl https://your-domain.com/health
```

### Logs
The service logs all requests and errors. Monitor:
- Authentication failures
- Token validation errors
- Firebase API errors
- Request/response times

### Metrics to Track
- Request volume
- Response times
- Error rates
- Authentication success/failure rates
- Token refresh frequency

## 🔧 Troubleshooting

### Common Issues

**Firebase Connection Error**
```
❌ Failed to initialize Firebase: Invalid PEM formatted message
```
- Check FIREBASE_PRIVATE_KEY format
- Ensure newlines are properly escaped: `\\n`

**CORS Errors**
- Update CORS origins in `src/index.ts`
- Add your frontend domain to allowed origins

**Port Already in Use**
- Change PORT in .env file
- Kill existing process: `lsof -ti:3001 | xargs kill`

**Module Not Found**
- Run `bun install` to install dependencies
- Check import paths in TypeScript files

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy Auth Service

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
          
      - run: bun install
      - run: bun test
      - run: bun run build
      
      # Deploy to your platform
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📞 Support

For deployment issues:
1. Check the logs for specific error messages
2. Verify all environment variables are set
3. Test Firebase connection separately
4. Check network connectivity and firewall rules

The auth service is designed to be stateless and easily scalable across multiple instances.
