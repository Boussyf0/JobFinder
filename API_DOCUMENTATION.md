# Job Search Platform API Documentation

## Base URL Configuration

```typescript
// Frontend configuration (Next.js)
// Create a file: ui/src/config/api.ts

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  ENDPOINTS: {
    JOBS: '/api/jobs',
    RESUME: '/api/resume',
    INTERVIEW: '/api/interview',
    USER: '/api/user',
    ANALYTICS: '/api/analytics',
    SALARY: '/api/salary',
    HEALTH: '/api/health'
  }
};
```

## Common Types

```typescript
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary: string;
  salaryMin: number;
  salaryMax: number;
  jobType: string;
  remote: boolean;
  url: string;
  postedAt: string;
  skills: string[];
  category: string;
  similarityScore?: number;
  inferredType?: boolean;
}

interface APIErrorResponse {
  success: false;
  error: string;
  code: number;
  details?: any;
}

interface APISuccessResponse<T> {
  success: true;
  data: T;
}
```

## Authentication & Security

All API requests should include an `Authorization` header:

```typescript
headers: {
  'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
  'Content-Type': 'application/json'
}
```

### Rate Limiting

All endpoints are subject to rate limiting:
- 200 requests per day
- 50 requests per hour

Rate limit headers included in all responses:
```typescript
interface RateLimitHeaders {
  'X-RateLimit-Limit': string;     // Maximum requests allowed
  'X-RateLimit-Remaining': string; // Requests remaining
  'X-RateLimit-Reset': string;     // Time until limit resets
}
```

## API Endpoints

### 1. Health Check

```typescript
GET /api/health

// Response
interface HealthCheckResponse {
  status: string;
  timestamp: string;
  version: string;
  services: {
    interview_evaluator: boolean;
    face_verification: boolean;
    vector_store: boolean;
  }
}
```

### 2. Job Search and Management

#### Search Jobs
```typescript
GET /api/jobs/search

// Request Parameters
interface JobSearchParams {
  query?: string;
  engineeringField?: string;
  location?: string;
  jobType?: string;
  minSalary?: number;
  remote?: boolean;
  moroccoOnly?: boolean;
  limit?: number;
  sortByDate?: boolean;
  removeDuplicates?: boolean;
}

// Response
interface JobSearchResponse {
  success: boolean;
  jobs: Job[];
}

// Frontend Implementation
const searchJobs = async (params: JobSearchParams) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOBS}/search?${queryString}`);
  return response.json();
};
```

#### Get Job Details
```typescript
GET /api/jobs/details/:jobId

// Response
interface JobDetailsResponse {
  job: Job;
  similarJobs: Job[];
}
```

#### Get Job Recommendations
```typescript
GET /api/jobs/recommendations

// Request Parameters
interface RecommendationParams {
  userId?: string;
  skills?: string; // Comma-separated
  limit?: number;
}

// Response
interface RecommendationResponse {
  success: boolean;
  jobs: Job[];
}
```

### 3. Resume Features

#### Match Resume with Jobs
```typescript
POST /api/resume/match

// Request
interface ResumeMatchRequest {
  resume: string; // Base64 encoded
  file_type: string;
  limit?: number;
}

// Response
interface ResumeMatchResponse {
  success: boolean;
  jobs: Job[];
  skills: string[];
  years_of_experience: number;
  match_score: number;
}
```

### 4. Interview Features

#### Generate Interview Questions
```typescript
POST /api/interview/generate

// Request
interface InterviewGenerateRequest {
  job_id: string;
  resume_text?: string;
  num_questions?: number;
}

// Response
interface InterviewGenerateResponse {
  job_id: string;
  job_title: string;
  questions: Array<{
    id: number;
    question: string;
  }>;
}
```

#### Evaluate Interview Answer
```typescript
POST /api/interview/evaluate

// Request
interface InterviewEvaluationRequest {
  job_id: string;
  question: string;
  answer: string;
}

// Response
interface InterviewEvaluationResponse {
  success: boolean;
  score: number;
  feedback: string;
  areas_of_improvement: string[];
}
```

#### Transcribe Interview Audio
```typescript
POST /api/interview/transcribe

// Request
interface TranscribeRequest {
  audio: string; // Base64 encoded audio data
}

// Response
interface TranscribeResponse {
  text: string;
}
```

#### Video Interview Monitoring
```typescript
POST /api/interview/verify-frame

// Request
interface VideoFrameRequest {
  frame: string; // Base64 encoded
  session_id: string;
}

// Response
interface VideoFrameResponse {
  success: boolean;
  face_detected: boolean;
  attention_score: number;
  warnings?: string[];
}
```

#### Analyze Interview Behavior
```typescript
POST /api/interview/analyze-behavior

// Request
interface BehaviorAnalysisRequest {
  session_id: string;
  clear_session?: boolean;
}

// Response
interface BehaviorAnalysisResponse {
  success: boolean;
  session_id: string;
  frame_count: number;
  behavior_analysis: {
    attention_score: number;
    engagement_level: string;
    eye_contact: number;
    facial_expressions: string[];
  };
}
```

#### Evaluate Coding Answer
```typescript
POST /api/interview/coding

// Request
interface CodingEvaluationRequest {
  job_id: string;
  problem: string;
  solution: string;
  language: string;
}

// Response
interface CodingEvaluationResponse {
  success: boolean;
  job_id: string;
  job_title: string;
  language: string;
  evaluation: {
    scores: {
      correctness: number;
      efficiency: number;
      style: number;
      readability: number;
      overall: number;
    };
    analysis: {
      strengths: string[];
      improvements: string[];
    };
    code_issues: Array<{
      line: number;
      message: string;
    }>;
    rating: number;
    suggestion: string;
  };
}
```

### 5. User Management

#### Get User Profile
```typescript
GET /api/user/profile

// Response
interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  skills: string[];
  savedJobs: string[];
  applications: any[];
}
```

#### Save/Unsave Jobs
```typescript
POST /api/user/saved
DELETE /api/user/saved/:jobId

// Request (POST)
interface SaveJobRequest {
  jobId: string;
}

// Response
interface SaveJobResponse {
  success: boolean;
  saved_jobs: string[];
}
```

### 6. Salary Features

#### Predict Salary
```typescript
POST /api/salary/predict

// Request
interface SalaryPredictionRequest {
  title: string;
  location: string;
  experience: number;
  department?: string;
  remote?: boolean;
  skills?: string[];
}

// Response
interface SalaryPredictionResponse {
  predicted_salary: number;
  salary_range: {
    min: number;
    max: number;
  };
  confidence: number;
  market_data: {
    average: number;
    percentiles: Record<string, number>;
  };
}
```

#### Get Salary Departments
```typescript
GET /api/salary/departments

// Response
interface DepartmentsResponse {
  departments: string[];
}
```

### 7. Analytics

```typescript
GET /api/analytics

// Response
interface AnalyticsResponse {
  total_jobs: number;
  jobs_with_salary: number;
  field_distribution: Record<string, number>;
  location_distribution: Record<string, number>;
  job_type_distribution: Record<string, number>;
  salary_ranges: Record<string, number>;
  top_skills: Record<string, number>;
  timestamp: string;
}
```

## WebSocket Integration

```typescript
// ui/src/services/websocket.ts

interface WebSocketEvents {
  'interview_feedback': {
    session_id: string;
    feedback: string;
    score: number;
  };
  'job_update': {
    action: 'create' | 'update' | 'delete';
    job: Job;
  };
}

export class WebSocketService {
  private socket: WebSocket;
  private static instance: WebSocketService;

  private constructor() {
    this.socket = new WebSocket(`ws://${API_CONFIG.BASE_URL.replace('http://', '')}`);
    this.setupEventHandlers();
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  private setupEventHandlers() {
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Handle different message types
      switch (data.type) {
        case 'interview_feedback':
          // Handle real-time interview feedback
          break;
        case 'job_update':
          // Handle real-time job updates
          break;
      }
    };
  }
}
```

## Development Setup

1. Start the Backend:
```bash
cd Scraping
python api.py --port 8080 --host 0.0.0.0 --debug
```

2. Configure Frontend:
```bash
# ui/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8080
```

3. Start the Frontend:
```bash
cd ui
npm run dev
```

## Production Considerations

1. **CORS Configuration**
```python
# Backend (api.py)
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "https://your-production-domain.com"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

2. **Error Monitoring**
```typescript
// Frontend (ui/src/services/monitoring.ts)
export const initErrorMonitoring = () => {
  window.onerror = (message, source, lineno, colno, error) => {
    // Send to your error monitoring service
    console.error('Global error:', { message, source, lineno, colno, error });
  };
};
```

3. **Health Checks**
```typescript
const checkAPIHealth = async () => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.HEALTH}`);
    const health = await response.json();
    return {
      api: health.status === 'ok',
      vector_store: health.services.vector_store,
      interview_evaluator: health.services.interview_evaluator,
      face_verification: health.services.face_verification
    };
  } catch (error) {
    return {
      api: false,
      vector_store: false,
      interview_evaluator: false,
      face_verification: false
    };
  }
};
``` 