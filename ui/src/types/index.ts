// Job type definitions
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  summary?: string;
  salary?: string;
  posted_date?: string;
  remote?: boolean;
  url?: string;
  category?: string;
  skills?: string[];
  similarity_score?: number;
  is_saved?: boolean;
}

// Search result type
export interface SearchResult {
  results: Job[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// User profile type
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  saved_jobs: string[];
  preferences?: {
    locations?: string[];
    job_types?: string[];
    remote?: boolean;
  };
  resume?: {
    text: string;
    skills: string[];
    experience: string[];
  };
}

// Resume match result
export interface ResumeMatch {
  job: Job;
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
}

// Resume match response
export interface ResumeMatchResponse {
  matches: ResumeMatch[];
  total: number;
}

// API error response
export interface ApiError {
  message: string;
  status: number;
  details?: any;
}

// Search filters
export interface SearchFilters {
  query?: string;
  location?: string;
  remote?: boolean;
  categories?: string[];
  page: number;
  limit: number;
  sort?: 'relevance' | 'date' | 'salary';
}

// API health status
export interface HealthStatus {
  status: 'ok' | 'error' | 'warning';
  version?: string;
  timestamp?: string;
  services?: Record<string, boolean>;
} 