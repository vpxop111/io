# Render Deployment Fix - Think.AI CJS API Server

## Current Issue
The deployed service at `https://io-o9oe.onrender.com/` is returning 404 with `x-render-routing: no-server` header.

## Immediate Fix Steps

### 1. Check Render Service Status
1. Go to [render.com dashboard](https://dashboard.render.com)
2. Find your `think-ai-cjs-api` service
3. Check if the service is:
   - ✅ **Active** and **Running**
   - ❌ **Sleeping** (free tier)
   - ❌ **Failed** build/deployment

### 2. Environment Variables Setup
In your Render service settings, add these environment variables:

```bash
NODE_ENV=production
PORT=10000
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
LOG_LEVEL=info
```

**CRITICAL:** Make sure `localhost:3000` is included in `ALLOWED_ORIGINS` for local development.

### 3. Build & Start Commands
Ensure your service has these settings:

```bash
Build Command: npm install
Start Command: npm start
```

### 4. Service Configuration
```
Environment: Node
Runtime: Node.js 18 or higher
Health Check Path: /health
Auto-Deploy: Yes
```

## Common Issues & Solutions

### Issue 1: Service Not Starting
**Symptom:** 404 with `no-server` header

**Solution:**
1. Check build logs in Render dashboard
2. Verify `package.json` has correct start script:
   ```json
   {
     "scripts": {
       "start": "node server.cjs"
     }
   }
   ```

### Issue 2: Port Binding Issues
**Symptom:** Service starts but crashes immediately

**Solution:**
Ensure server listens on `0.0.0.0` and uses `process.env.PORT`:
```javascript
const port = process.env.PORT || 3002;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
```

### Issue 3: CORS Errors
**Symptom:** CORS policy blocks requests

**Solution:**
1. Add your frontend domain to `ALLOWED_ORIGINS` in Render environment variables
2. For local development, include: `http://localhost:3000`

## Quick Deployment Test

### Step 1: Manual Deploy
1. In Render dashboard, go to your service
2. Click "Manual Deploy" → "Deploy latest commit"
3. Wait for deployment to complete
4. Check logs for any errors

### Step 2: Test Endpoints
```bash
# Test health check
curl https://io-o9oe.onrender.com/health

# Test API info
curl https://io-o9oe.onrender.com/api/info

# Test CORS preflight
curl -X OPTIONS https://io-o9oe.onrender.com/health \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

### Step 3: Frontend Integration Test
Update your local frontend service to test:
```javascript
// Test from browser console
fetch('https://io-o9oe.onrender.com/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

## If Service Still Fails

### Option 1: Redeploy Service
1. Delete current service in Render
2. Create new service with same configuration
3. Use the deployment guide in `DEPLOYMENT.md`

### Option 2: Alternative Deployment
Consider deploying to:
- Railway (easier setup)
- Heroku (if you have account)
- Vercel Functions (serverless)

### Option 3: Local Development Fallback
The frontend service has built-in fallback to browser-based PDF analysis if CJS API fails.

## Updated Frontend Configuration

The frontend service is already configured to handle API failures gracefully:

```javascript
// In cjsApiService.ts - already implemented
async analyzePdfWithFallback(file, projectId) {
  try {
    // Try CJS API first
    const cjsResult = await this.analyzePdfWithCJS(file, projectId);
    return { success: true, data: cjsResult.data, source: 'cjs' };
  } catch (error) {
    // Fallback to browser analysis
    console.warn('CJS API failed, using browser analysis');
    const browserResult = await analyzer.runCompleteAnalysis(file);
    return { success: true, data: transformedData, source: 'browser' };
  }
}
```

## Next Steps

1. ✅ **Fix deployment** - Follow steps above
2. 🔄 **Test endpoints** - Verify health and API info work  
3. ✅ **Test CORS** - Ensure frontend can connect
4. 📊 **Monitor performance** - Check response times and errors

## Contact Support

If issues persist:
- Check Render documentation: https://render.com/docs
- Render community: https://community.render.com
- Consider paid plan for better support and always-on service

---

**Status:** The CORS configuration has been updated to be more permissive in production for troubleshooting. Once the service is properly deployed, you can restrict CORS to specific domains for security.