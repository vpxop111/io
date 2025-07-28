# Deployment Guide - Think.AI CJS API Server

## Render Deployment (Recommended)

### Step 1: Prepare Repository
```bash
# Create a new repository for just the API server
git init
git add .
git commit -m "Initial CJS API server setup"
git branch -M main
git remote add origin https://github.com/yourusername/think-ai-cjs-api.git
git push -u origin main
```

### Step 2: Connect to Render
1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository containing this CJS API server

### Step 3: Configure Service
```
Service Type: Web Service
Name: think-ai-cjs-api
Environment: Node
Region: Choose closest to your users
Branch: main
Root Directory: (leave empty if repo root is the API server)
Build Command: npm install
Start Command: npm start
```

### Step 4: Environment Variables
Add these in Render dashboard:
```
NODE_ENV=production
PORT=10000
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://staging.yourdomain.com
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
LOG_LEVEL=info
```

### Step 5: Health Check
```
Health Check Path: /health
```

### Step 6: Deploy
Click "Create Web Service" - Render will automatically build and deploy.

---

## Railway Deployment

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### Step 2: Deploy
```bash
# From the cjs-api-server directory
railway init
railway up
```

### Step 3: Set Environment Variables
```bash
railway variables set NODE_ENV=production
railway variables set ALLOWED_ORIGINS=https://your-domain.com
railway variables set MAX_FILE_SIZE=10485760
```

---

## Heroku Deployment

### Step 1: Install Heroku CLI
```bash
# Install Heroku CLI, then:
heroku login
```

### Step 2: Create App
```bash
heroku create think-ai-cjs-api
```

### Step 3: Set Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set ALLOWED_ORIGINS=https://your-domain.com
heroku config:set MAX_FILE_SIZE=10485760
```

### Step 4: Deploy
```bash
git push heroku main
```

---

## DigitalOcean App Platform

### Step 1: Create App
1. Go to DigitalOcean App Platform
2. Create new app from GitHub

### Step 2: Configure
```yaml
name: think-ai-cjs-api
services:
  - name: api
    source_dir: /
    github:
      repo: yourusername/think-ai-cjs-api
      branch: main
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_ENV
        value: production
      - key: ALLOWED_ORIGINS
        value: https://your-domain.com
```

---

## Docker Deployment

### Build and Push to Registry
```bash
# Build image
docker build -t yourusername/think-ai-cjs-api .

# Push to Docker Hub
docker push yourusername/think-ai-cjs-api

# Or push to GitHub Container Registry
docker tag yourusername/think-ai-cjs-api ghcr.io/yourusername/think-ai-cjs-api
docker push ghcr.io/yourusername/think-ai-cjs-api
```

### Deploy to Cloud Run (Google Cloud)
```bash
gcloud run deploy think-ai-cjs-api \
  --image ghcr.io/yourusername/think-ai-cjs-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3002 \
  --set-env-vars NODE_ENV=production,ALLOWED_ORIGINS=https://your-domain.com
```

---

## AWS Deployment

### Elastic Beanstalk
1. Create `Dockerrun.aws.json`:
```json
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "yourusername/think-ai-cjs-api",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": "3002"
    }
  ]
}
```

2. Deploy via EB CLI:
```bash
eb init
eb create think-ai-cjs-api
eb deploy
```

### ECS (Fargate)
Create task definition and service using the Docker image.

---

## Monitoring Setup

### Render
- Built-in logging and metrics
- Set up alerts in dashboard

### Add Custom Monitoring
```javascript
// Add to server.cjs for custom metrics
app.get('/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});
```

---

## SSL/HTTPS

### Render
- Automatic SSL certificates
- Custom domain setup in dashboard

### Manual SSL (if needed)
```bash
# Using Certbot for Let's Encrypt
sudo certbot --nginx -d api.yourdomain.com
```

---

## Custom Domain Setup

### Render
1. Go to service settings
2. Add custom domain
3. Update DNS CNAME record:
   ```
   api.yourdomain.com CNAME your-service.onrender.com
   ```

### Update CORS
```bash
# Update environment variable
ALLOWED_ORIGINS=https://api.yourdomain.com,https://yourdomain.com
```

---

## Scaling Configuration

### Render
- Auto-scaling available on paid plans
- Configure in service settings

### Manual Scaling
```yaml
# render.yaml
services:
  - type: web
    name: think-ai-cjs-api
    plan: standard  # For auto-scaling
    scaling:
      minInstances: 1
      maxInstances: 5
```

---

## Backup Strategy

### Code
- Repository backups via Git
- Multiple remotes recommended

### Logs
```bash
# Download logs from Render
render logs --service think-ai-cjs-api --num 1000 > logs.txt
```

---

## Performance Optimization

### Production Settings
```javascript
// Add to server.cjs
if (process.env.NODE_ENV === 'production') {
  app.use(compression()); // Enable gzip compression
  app.use(helmet());      // Security headers
}
```

### Resource Limits
```yaml
# render.yaml
services:
  - type: web
    name: think-ai-cjs-api
    plan: starter
    maxUploads: 10
    diskGB: 1
```

---

## Testing Deployed API

### Health Check
```bash
curl https://your-api-domain.com/health
```

### PDF Analysis Test
```bash
curl -X POST \
  -F "pdf=@test.pdf" \
  -F "projectId=test-123" \
  https://your-api-domain.com/api/analyze-pdf
```

### Load Testing
```bash
# Using Apache Bench
ab -n 100 -c 10 https://your-api-domain.com/health

# Using curl for PDF upload
for i in {1..10}; do
  curl -X POST -F "pdf=@test.pdf" https://your-api-domain.com/api/analyze-pdf &
done
```

---

## Troubleshooting Deployment

### Common Issues

1. **Build Failures**
   ```bash
   # Check Node version compatibility
   "engines": {
     "node": ">=18.0.0"
   }
   ```

2. **Port Issues**
   ```javascript
   // Use PORT from environment
   const port = process.env.PORT || 3002;
   ```

3. **CORS Errors**
   ```bash
   # Add frontend domain to ALLOWED_ORIGINS
   ALLOWED_ORIGINS=https://your-frontend.com
   ```

4. **File Upload Issues**
   ```bash
   # Check file size limits
   MAX_FILE_SIZE=10485760
   ```

### Debug Commands
```bash
# Check environment variables
curl https://your-api.com/api/info

# Check logs
render logs --service your-service --tail

# Test health
curl -v https://your-api.com/health
```

---

## Security Checklist

- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] File upload limits set
- [ ] Error messages don't expose internals
- [ ] Environment variables secured
- [ ] Rate limiting considered (if needed)
- [ ] Input validation in place
- [ ] Dependencies updated

---

## Cost Optimization

### Render Pricing
- Free tier: 750 hours/month
- Starter: $7/month for always-on
- Standard: $25/month with auto-scaling

### Usage Monitoring
```javascript
// Add usage tracking
let requestCount = 0;
app.use((req, res, next) => {
  requestCount++;
  next();
});

app.get('/stats', (req, res) => {
  res.json({ 
    requests: requestCount,
    uptime: process.uptime() 
  });
});
```

This deployment guide provides multiple options for hosting your CJS API server with detailed instructions for each platform.