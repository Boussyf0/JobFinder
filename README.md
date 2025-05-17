# Engineering Jobs Platform

A platform for searching engineering jobs with a Next.js frontend and Flask backend.

## Setup Instructions

### Backend (Flask API Server)

1. Navigate to the Scraping directory:
   ```
   cd Scraping
   ```

2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Start the Flask API server (Method 1 - Manual):
   ```
   python api.py
   ```

4. Start the Flask API server (Method 2 - Auto-restart):
   ```
   ./restart_api.sh
   ```
   
   This script will:
   - Monitor the API server
   - Automatically restart it if it crashes
   - Keep it running in the background

### Frontend (Next.js)

1. Navigate to the UI directory:
   ```
   cd ui
   ```

2. Install Node.js dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Troubleshooting

### API Connection Issues

If the frontend can't connect to the backend:

1. Check if the API server is running:
   ```
   curl http://localhost:8081/api/health
   ```

2. Ensure the API server is accessible from your network.

3. Verify CORS settings in `Scraping/api.py` if there are cross-origin issues.

4. Check the browser console for specific error messages.

### Fallback to Mock Data

The application is designed to automatically fall back to mock data if the backend is unavailable. You'll see a message in the browser console:

```
Backend API failed, falling back to mock API: TypeError: Failed to fetch
```

If this happens, verify that the Flask server is running correctly at port 8081.

## API Information

- Backend API URL: `http://localhost:8081/api`
- Health check endpoint: `http://localhost:8081/api/health`
- Job search endpoint: `http://localhost:8081/api/jobs/search`

## Development Notes

- The frontend is built with Next.js, React, and Tailwind CSS
- The backend uses Flask with a vector store for job search
- API calls use fetch with timeouts to prevent hanging requests
- CORS is configured to allow cross-origin requests 