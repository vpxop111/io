# Think.AI CJS API Server

A standalone CommonJS API server for PDF script analysis, designed for deployment on Render or other cloud platforms.

## Features

- 🚀 **Fast PDF Analysis** - Uses `pdf-parse` for efficient text extraction
- 🎬 **Script Parsing** - Advanced screenplay structure analysis
- 📊 **Character Analysis** - Character detection and interaction mapping
- 🔒 **CORS Security** - Configurable origin restrictions
- 💾 **File Management** - Automatic cleanup of uploaded files
- 📈 **Health Monitoring** - Built-in health check endpoints
- 🐳 **Docker Ready** - Containerized deployment support

## Quick Start

### Local Development

1. **Clone and install dependencies:**
   ```bash
   cd cjs-api-server
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start the server:**
   ```bash
   npm run dev  # Development with nodemon
   npm start    # Production
   ```

4. **Test the API:**
   ```bash
   curl http://localhost:3002/health
   ```

### Deploy to Render

1. **Connect Repository:**
   - Push this `cjs-api-server` folder to a Git repository
   - Connect the repository to Render

2. **Configure Service:**
   - Service Type: `Web Service`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/health`

3. **Set Environment Variables:**
   ```
   NODE_ENV=production
   PORT=10000
   ALLOWED_ORIGINS=https://your-frontend-domain.com
   MAX_FILE_SIZE=10485760
   ```

4. **Deploy:**
   - Render will automatically deploy your service
   - Monitor logs for successful startup

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and uptime information.

### API Information
```
GET /api/info
```
Returns API documentation and available endpoints.

### PDF Analysis
```
POST /api/analyze-pdf
Content-Type: multipart/form-data

Parameters:
- pdf: PDF file (required)
- projectId: Project identifier (optional)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalScenes": 45,
    "totalCharacters": 12,
    "totalDialogues": 234,
    "scenes": [...],
    "characters": [...],
    "dialogues": [...],
    "interactions": [...],
    "summary": {...},
    "metadata": {
      "processingTimeMs": 1234,
      "processingTimestamp": "2024-01-01T12:00:00.000Z",
      "originalFilename": "script.pdf",
      "scriptName": "script",
      "projectId": "project-123",
      "fileSize": 1048576,
      "server": "cjs-api"
    }
  },
  "processing": {
    "timeMs": 1234,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `ALLOWED_ORIGINS` | `localhost origins` | CORS allowed origins (comma-separated) |
| `MAX_FILE_SIZE` | `10485760` | Maximum upload size (bytes) |
| `UPLOAD_DIR` | `./uploads` | Upload directory |
| `LOG_LEVEL` | `info` | Logging level |

### CORS Configuration

The server supports configurable CORS origins. Set multiple origins like this:
```
ALLOWED_ORIGINS=https://myapp.com,https://staging.myapp.com,http://localhost:3000
```

## Docker Deployment

### Build Image
```bash
docker build -t think-ai-cjs-api .
```

### Run Container
```bash
docker run -p 3002:3002 \
  -e NODE_ENV=production \
  -e ALLOWED_ORIGINS=https://myapp.com \
  think-ai-cjs-api
```

### Docker Compose
```yaml
version: '3.8'
services:
  cjs-api:
    build: .
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - ALLOWED_ORIGINS=https://myapp.com
      - MAX_FILE_SIZE=10485760
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Analysis Output

The API analyzes PDF scripts and extracts:

- **Scenes**: Location, time of day, actions, characters
- **Characters**: All speaking characters with dialogue counts
- **Dialogues**: All character lines with scene references
- **Interactions**: Character co-appearances in scenes
- **Summary**: Statistical overview of the script

### File Outputs

Analysis results are also saved locally to the `analysis_outputs` directory:

- `ALL_SCENES_COMPLETE.txt` - Complete scene breakdown
- `ALL_DIALOGUES_COMPLETE.txt` - All dialogue lines
- `ALL_CHARACTERS_COMPLETE.txt` - Character analysis
- `CHARACTER_INTERACTIONS.txt` - Character relationship mapping

## Error Handling

The API provides structured error responses:

```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "processing": {
    "timeMs": 123,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### Error Codes

- `NO_FILE` - No PDF file uploaded
- `FILE_TOO_LARGE` - File exceeds size limit
- `INVALID_FILE_TYPE` - Non-PDF file uploaded
- `CORS_ERROR` - Origin not allowed
- `ANALYSIS_ERROR` - PDF processing failed
- `INTERNAL_ERROR` - Server error

## Security Features

- ✅ **File Type Validation** - Only PDF files accepted
- ✅ **File Size Limits** - Configurable upload limits
- ✅ **CORS Protection** - Origin-based access control
- ✅ **Automatic Cleanup** - Temporary files removed after processing
- ✅ **Input Sanitization** - Filename sanitization
- ✅ **Error Boundaries** - Graceful error handling

## Performance

- **Memory Efficient** - Files processed in streams
- **Fast Processing** - Optimized PDF parsing
- **Automatic Cleanup** - No disk space accumulation
- **Health Monitoring** - Built-in performance tracking

## Monitoring

### Health Check
```bash
curl http://localhost:3002/health
```

### API Status
```bash
curl http://localhost:3002/api/info
```

### Logs
The server provides structured logging with timestamps and request tracking.

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :3002
   # Kill the process or change PORT in .env
   ```

2. **File Upload Fails**
   - Check file size (default limit: 10MB)
   - Verify file is PDF format
   - Check disk space for uploads directory

3. **CORS Errors**
   - Add your frontend domain to `ALLOWED_ORIGINS`
   - Include protocol (http/https) in origins

4. **PDF Analysis Fails**
   - Verify PDF is not password protected
   - Check PDF is text-based (not scanned images)
   - Review server logs for detailed error messages

## Development

### Local Setup
```bash
npm install
npm run dev
```

### Testing
```bash
# Test health endpoint
curl http://localhost:3002/health

# Test PDF upload
curl -X POST -F "pdf=@test.pdf" http://localhost:3002/api/analyze-pdf
```

### Adding Features
1. Modify `lib/pdfscript.cjs` for analysis logic
2. Update `server.cjs` for API endpoints
3. Test locally before deploying

## License

MIT License - see LICENSE file for details.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs
3. Verify environment configuration
4. Test with the health endpoint