# Job Search Platform

A comprehensive job search platform with features including job listings, resume matching, and market insights.

## Features

- **Job Search**: Find relevant jobs based on keywords, skills, and location
- **Resume Matcher**: Upload your resume to match with suitable job listings
- **Market Insights Dashboard**: Visualize job market trends, salary analysis, and in-demand skills
- **Interactive UI**: Built with Next.js and Tailwind CSS for a responsive experience

## Market Insights Dashboard

The Market Insights Dashboard provides valuable data about the job market:

- **Market Overview**: Key statistics on available positions, average salaries, and trending industries
- **Salary Analysis**: Breakdown of compensation by job role and experience level
- **Industry Distribution**: Visualization of job distribution across different sectors
- **Job Trends**: Time-based analysis of job market growth
- **Skills Demand**: Most requested skills in the current job market
- **Location Analysis**: Geographic distribution of job opportunities

## Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS, Recharts
- **Backend**: Node.js, Python for data analysis
- **Data Visualization**: Interactive charts with Recharts
- **Styling**: Tailwind CSS with custom components

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python 3.9+
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/job-search-platform.git
   cd job-search-platform
   ```

2. Install frontend dependencies
   ```
   cd ui
   npm install
   ```

3. Install Python dependencies
   ```
   pip install -r requirements.txt
   ```

4. Start the development server
   ```
   cd ui
   npm run dev
   ```

5. Generate market insights data
   ```
   python analyze_market_data.py
   ```

## Project Structure

- `ui/`: Next.js frontend application
- `analyze_market_data.py`: Script to generate market insights data
- `market_insights.json`: Generated data for market insights dashboard
- `Scraping/`: Web scraping tools for job data collection

## License

This project is licensed under the MIT License.

# Morocco Job Search Platform

A job search platform built for the Moroccan market, combining data scraping, vector storage, and a modern UI to help users find relevant jobs.

## Project Structure

- **Scraping/**: Backend code for scraping job data and the vector store
  - `api.py`: Flask API server providing job data to the frontend
  - `adzuna_vector_store.py`: Vector store implementation for job similarity search
  - `scrape_jobs_cron.py`: Automated job scraper for engineering jobs
  - `run_job_scraper.sh`: Cron job wrapper script for automated scraping
- **ui/**: Next.js frontend application
  - Modern UI with React components
  - Job search and filtering capabilities
  - Responsive design with Tailwind CSS

## Setup Instructions

To run the application:

1. Clone the repository
2. Run the setup script:
   ```bash
   ./setup_env.sh
   ```
   
3. Or use the restart script to restart the application:
   ```bash
   ./restart_all.sh
   ```

## API Endpoints

- `GET /api/jobs/search`: Search for jobs with filters
- `GET /api/jobs/details/:id`: Get details for a specific job
- `GET /api/jobs/recommendations`: Get job recommendations

## Recent Fixes

### JSON NaN Value Handling

We fixed an issue with NaN (Not a Number) values in the JSON API responses that was causing parsing errors in the frontend. The fix includes:

1. Added custom JSON encoder to the Flask API server to convert NaN values to null
2. Implemented sanitization of JSON responses in the API endpoints
3. Created Next.js API route handlers that properly handle and sanitize responses
4. Added a utils library in the frontend for safe JSON parsing

If you encounter the "No jobs found" error:

1. Run the debug page at `/debug` to test API connectivity
2. Try rebuilding the vector store with `./rebuild_vector_store.py`
3. Make sure the API server is running with `./restart_api.sh`

## Automated Job Scraping

The platform now includes an automated job scraper that runs every 6 hours to collect fresh engineering job listings. Features include:

- **Engineering Focus**: Specialized for Software, Data, Electrical, and Civil Engineering roles
- **Automated Collection**: Runs via cron job every 6 hours
- **Robust Logging**: Comprehensive logging for monitoring and troubleshooting
- **Vector Store Integration**: Automatically updates the searchable database

For setup instructions:
```bash
cat Scraping/SETUP_INSTRUCTIONS.md
```

For more detailed information:
```bash
cat Scraping/JOB_SCRAPER_README.md
```

## Tooling

- `rebuild_vector_store.py`: Rebuild the vector store from CSV data files
- `fix_csv_files.py`: Fix parsing issues in CSV data files
- `restart_api.sh`: Restart the API server
- `restart_all.sh`: Restart both API and Next.js servers
- `test_api.py`: Test API endpoints directly
- `test_nan_handling.py`: Test JSON handling of NaN values

# Job Search API Server

This project provides a job search API server that connects to a vector store of job listings. The API allows you to search for jobs, get recommendations, and manage user profiles.

## Getting Started

### Prerequisites

- Python 3.7 or higher
- pip (Python package installer)

### Installation

1. Clone this repository
2. Run the setup script:

```bash
./start_api.sh
```

This script will:
- Install the required dependencies
- Create necessary directories
- Start the API server

The server will run on http://localhost:8080 by default.

## API Endpoints

### Search Jobs

```
GET /api/jobs/search
```

Query parameters:
- `query`: Search query (job title, skills, etc.)
- `engineeringField`: Field of engineering (optional)
- `location`: Location (optional)
- `jobType`: Type of job (CDI, CDD, etc.) (optional)
- `minSalary`: Minimum salary (optional)
- `remote`: Filter for remote jobs (optional, boolean)
- `moroccoOnly`: Filter for Morocco-relevant jobs (optional, boolean)
- `limit`: Maximum number of results (default: 20)

### Job Recommendations

```
GET /api/jobs/recommendations
```

Query parameters:
- `userId`: User ID to get recommendations for (optional)
- `skills`: Comma-separated list of skills (optional)
- `limit`: Maximum number of results (default: 10)

### Job Details

```
GET /api/jobs/details/:jobId
```

Path parameters:
- `jobId`: ID of the job to retrieve

### Vector Data Visualization

```
GET /api/vector/data
```

Query parameters:
- `query`: Search query (optional)
- `remote`: Filter for remote jobs (optional, boolean)
- `moroccoOnly`: Filter for Morocco-relevant jobs (optional, boolean)
- `limit`: Maximum number of results (default: 100)

### User Profile

```
GET /api/user/profile
```

Returns the user profile, including saved jobs.

### Save Job

```
POST /api/user/saved
```

Request body:
```json
{
  "jobId": "job123"
}
```

### Unsave Job

```
DELETE /api/user/saved/:jobId
```

Path parameters:
- `jobId`: ID of the job to unsave

## Frontend UI

The API server also serves a modern frontend UI built with Next.js, Tailwind CSS, and Framer Motion. This provides a responsive and interactive user experience.

You can access the UI by navigating to http://localhost:3000 in your web browser after running the setup script.

Features include:
- Modern, responsive design for all devices
- Animated transitions using Framer Motion
- Real-time job search with filters
- Interactive job listings and detailed view
- User profiles and saved jobs
- Resume matching and skill analysis

### Running the UI Separately

If you want to run the UI separately:

```bash
cd ui
npm install  # Only needed first time
npm run dev
```

Then access the UI at http://localhost:3000.

## Vector Store

The API uses a vector store to efficiently search for job listings. The vector store is loaded from the `vector_store` directory.

## Troubleshooting

### Port already in use

If you see an error like "Address already in use", you can change the port:

```bash
cd Scraping
python api.py --port 8081
```

### Vector store not loading

If the vector store isn't loading properly, ensure:

1. The `vector_store` directory exists and contains valid vector database files
2. The `adzuna_data` directory exists
3. The server is started from the project root directory

### Dependencies missing

If you're missing dependencies, run:

```bash
pip install -r Scraping/requirements.txt
```

# Job Search Platform API Fix

This repository contains the fixes for the 404 errors encountered when making API calls to the interview evaluation endpoints.

## Problem

The following errors were observed:

```
Failed to load resource: net::ERR_NAME_NOT_RESOLVED

:3003/favicon.ico:1 
 Failed to load resource: the server responded with a status of 404 (Not Found)
:3003/api/interview/analyze-behavior:1 
 Failed to load resource: the server responded with a status of 404 (Not Found)
hook.js:608 [API] Error analyzing behavior: Error: API error: 404
    at analyzeBehavior (api.ts:580:13)
```

## Solution

We've implemented a lightweight API server that simulates responses for the behavioral analysis and coding evaluation endpoints.

### Implementation Details

1. Created a standalone Express server (`test-server.js`) that provides mock API endpoints:
   - `/api/interview/analyze-behavior` - For behavioral analysis during video interviews
   - `/api/interview/coding` - For evaluating coding solutions during technical interviews

2. Updated the client-side API functions to:
   - Use configurable endpoints via a global `window.API_CONFIG` object
   - Point to the test server when the backend is unavailable
   - Provide meaningful error responses

3. Modified the Next.js configuration to prevent rewrites for specific API paths, ensuring they're handled by our local API routes

### How to Use

1. Start the test server:
   ```
   node test-server.js
   ```
   
   This will start a server on port 3008 that handles:
   - Behavior analysis: http://localhost:3008/api/interview/analyze-behavior
   - Coding evaluation: http://localhost:3008/api/interview/coding

2. Access the test page to verify API functionality:
   ```
   open test-api.html
   ```

3. Configure the application to use the test server by ensuring the following code runs early in the application lifecycle:
   ```js
   if (typeof window !== 'undefined') {
     window.API_CONFIG = {
       behaviorAnalysisUrl: 'http://localhost:3008/api/interview/analyze-behavior',
       codingEvaluationUrl: 'http://localhost:3008/api/interview/coding'
     };
   }
   ```

## Testing

You can use the included test page (`test-api.html`) to verify that the API endpoints are working correctly. The page provides simple buttons to test both the behavior analysis and coding evaluation endpoints.

## Next Steps

For production deployment, replace the test server with a proper backend implementation that provides these endpoints with real functionality instead of mock responses. 