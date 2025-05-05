import { safeJsonParse, sanitizeJson } from '@/lib/utils';
import axios from 'axios';

// Determine if we're running on the server
const isServer = typeof window === 'undefined';

// Flag to disable mock data (set to true to always try to use real API data)
const DISABLE_MOCK_DATA = true;

// Create an axios instance with the correct baseURL
const api = axios.create({
  baseURL: isServer ? 'http://localhost:8083/api' : '/api', // Use absolute URL for SSR
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Add a timeout for better error handling
  
  // Custom response parser that sanitizes NaN values
  transformResponse: [
    (data) => {
      if (typeof data === 'string') {
        try {
          return safeJsonParse(data);
        } catch (e) {
          return JSON.parse(data);
        }
      }
      return data;
    }
  ]
});

// Add logging to see the api instance config when created
console.log('API client created with baseURL:', isServer ? 'http://localhost:8083/api' : '/api');
console.log('isServer:', isServer);

// Types
export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  salaryCurrency?: string;
  salaryMin?: number;
  salaryMax?: number;
  salary_min?: number; // For API compatibility
  salary_max?: number; // For API compatibility
  jobType?: string;
  remote?: boolean;
  url?: string;
  postedAt?: string;
  skills?: string[];
  category?: string;
  similarityScore?: number;
  inferredType?: boolean; // Whether the job type was inferred rather than provided in the data
}

export interface SearchParams {
  query?: string;
  engineeringField?: string;
  location?: string;
  jobType?: string;
  minSalary?: number;
  remote?: boolean;
  moroccoOnly?: boolean;
  limit?: number;
  getLatest?: boolean; // New flag to force fetching the latest jobs
  sortByDate?: boolean; // Sort by date, newest first
}

export interface JobDetailsResponse {
  job: JobListing;
  similarJobs: JobListing[];
}

export interface InterviewRequest {
  job_id: string;
  resume_text?: string;
  num_questions?: number;
}

export interface InterviewQuestion {
  id: number;
  question: string;
}

export interface InterviewResponse {
  job_id: string;
  job_title: string;
  questions: InterviewQuestion[];
  error?: string;
}

export interface InterviewEvaluation {
  scores: {
    relevance: number;
    knowledge: number;
    clarity: number;
    examples: number;
    overall: number;
  };
  analysis: {
    strengths: string[];
    improvements: string[];
  };
  rating: number;
  suggestion: string;
}

export interface EvaluationResponse {
  job_id: string;
  job_title: string;
  question: string;
  answer: string;
  evaluation: InterviewEvaluation;
  error?: string;
}

export interface FaceVerificationResult {
  success: boolean;
  face_detected: boolean;
  position_analysis?: {
    face_centered: boolean;
    looking_away: boolean;
    face_too_close: boolean;
  };
  movement_analysis?: {
    movement_detected: boolean;
    rapid_movement: boolean;
    movement_score: number;
  };
  error?: string;
  message?: string;
}

export interface BehaviorAnalysis {
  attention_score: number;
  suspicious_activity: boolean;
  present_percentage: number;
  looking_away_percentage: number;
  centered_percentage: number;
  rapid_movements_count: number;
  message: string;
}

export interface BehaviorAnalysisResponse {
  success: boolean;
  session_id: string;
  frame_count: number;
  behavior_analysis: BehaviorAnalysis;
  error?: string;
}

export interface CodingEvaluation {
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
}

export interface CodingEvaluationResponse {
  success: boolean;
  job_id: string;
  job_title: string;
  language: string;
  evaluation: CodingEvaluation;
  error?: string;
}

// API functions
export const searchJobs = async (params: SearchParams): Promise<JobListing[]> => {
  try {
    console.log('[API] Searching jobs with params:', params);
    
    // First try using fetch directly (which uses Next.js rewrites)
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (params.query) queryParams.append('query', params.query);
      if (params.location) queryParams.append('location', params.location);
      if (params.jobType) queryParams.append('jobType', params.jobType);
      if (params.minSalary !== undefined) queryParams.append('minSalary', params.minSalary.toString());
      if (params.remote !== undefined) queryParams.append('remote', params.remote.toString());
      if (params.moroccoOnly !== undefined) queryParams.append('moroccoOnly', params.moroccoOnly.toString());
      if (params.engineeringField) queryParams.append('engineeringField', params.engineeringField);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      else queryParams.append('limit', '20'); // Default limit
      if (params.getLatest) queryParams.append('getLatest', 'true'); // Force latest data refresh
      if (params.sortByDate !== undefined) queryParams.append('sortByDate', params.sortByDate.toString()); // Sort by date
      
      const url = `/api/jobs/search?${queryParams.toString()}`;
      console.log('[API] Fetch URL:', url);
      
      const fetchResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!fetchResponse.ok) {
        throw new Error(`HTTP error! Status: ${fetchResponse.status}`);
      }
      
      const text = await fetchResponse.text();
      let data;
      
      // Use safe JSON parsing to handle NaN values
      try {
        console.log('[API] Parsing response text, first 100 chars:', text.substring(0, 100));
        data = safeJsonParse(text);
        console.log('[API] Parsed data type:', typeof data);
        console.log('[API] Data has jobs property:', 'jobs' in data);
        console.log('[API] Jobs is array:', Array.isArray(data.jobs));
        console.log('[API] Jobs length:', data.jobs?.length || 0);
      } catch (parseError) {
        console.error('[API] JSON parse error:', parseError);
        console.log('[API] Problematic JSON:', text.substring(0, 100) + '...');
        // Instead of throwing error, create a default structure
        data = { jobs: [] };
        console.warn('[API] Created default empty jobs array after parse error');
      }
      
      console.log('API response data (fetch):', data);
      
      // Ensure data.jobs exists and is an array
      if (!data.jobs) {
        console.warn('[API] No jobs property in response data, creating empty array');
        data.jobs = [];
      } else if (!Array.isArray(data.jobs)) {
        console.warn('[API] Jobs is not an array, converting to array');
        data.jobs = [];
      }
      
      // Sanitize the response data (replace NaN with null)
      const sanitizedData = sanitizeJson(data);
      
      // Return the jobs array
      return sanitizedData.jobs;
      
    } catch (fetchError) {
      console.error('Error with fetch approach:', fetchError);
      
      // Fallback to axios
      console.log('Falling back to axios approach');
      const axiosResponse = await api.get('/jobs/search', { params });
      console.log('API response (axios):', axiosResponse.data);
      
      if (!axiosResponse.data.jobs || !Array.isArray(axiosResponse.data.jobs)) {
        console.error('Invalid axios API response format:', axiosResponse.data);
        
        // If we've tried both methods and they failed, try with minimal parameters
        console.log('Trying with minimal parameters...');
        const fallbackResponse = await fetch('/api/jobs/search?limit=10');
        const fallbackText = await fallbackResponse.text();
        
        // Use safe JSON parsing
        const fallbackData = safeJsonParse(fallbackText);
        
        if (fallbackData && fallbackData.jobs && Array.isArray(fallbackData.jobs)) {
          console.log('Got jobs with minimal parameters');
          return sanitizeJson(fallbackData.jobs);
        }
        
        return [];
      }
      
      return sanitizeJson(axiosResponse.data.jobs);
    }
  } catch (error) {
    console.error('All job search approaches failed:', error);
    
    // Last resort - try a direct call to the API server
    try {
      console.log('Trying direct call to API server...');
      const directResponse = await fetch('http://localhost:8082/api/jobs/search?limit=10');
      const directText = await directResponse.text();
      
      // Parse with sanitization
      const directData = safeJsonParse(directText);
      
      if (directData && directData.jobs && Array.isArray(directData.jobs)) {
        console.log('Got jobs with direct server call');
        return sanitizeJson(directData.jobs);
      }
    } catch (directError) {
      console.error('Direct API call also failed:', directError);
    }
    
    if (DISABLE_MOCK_DATA) {
      return [];
    }
    
    return getMockSearchResults(params);
  }
};

export const getJobDetails = async (jobId: string): Promise<JobDetailsResponse> => {
  try {
    const response = await api.get(`/jobs/details/${jobId}`);
    return sanitizeJson(response.data);
  } catch (error) {
    console.error('Error fetching job details:', error);
    
    if (DISABLE_MOCK_DATA) {
      throw new Error('Failed to fetch job details and mock data is disabled');
    }
    
    return {
      job: getMockJobDetails(jobId),
      similarJobs: getMockSimilarJobs(),
    };
  }
};

export const getJobRecommendations = async (
  userId?: string,
  skills?: string[],
  limit: number = 10
): Promise<JobListing[]> => {
  try {
    const params = { 
      ...(userId && { userId }),
      ...(skills && { skills: skills.join(',') }),
      limit 
    };
    const response = await api.get('/jobs/recommendations', { params });
    const data = sanitizeJson(response.data);
    return data.jobs || [];
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    
    if (DISABLE_MOCK_DATA) {
      return [];
    }
    
    return getMockRecommendations();
  }
};

export const saveJob = async (jobId: string): Promise<{ success: boolean }> => {
  try {
    const response = await api.post('/user/saved', { jobId });
    return { success: true };
  } catch (error) {
    console.error('Error saving job:', error);
    return { success: false };
  }
};

export const unsaveJob = async (jobId: string): Promise<{ success: boolean }> => {
  try {
    const response = await api.delete(`/user/saved/${jobId}`);
    return { success: true };
  } catch (error) {
    console.error('Error unsaving job:', error);
    return { success: false };
  }
};

export const getUserProfile = async (): Promise<any> => {
  try {
    const response = await api.get('/user/profile');
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return getMockUserProfile();
  }
};

export const generateInterview = async (params: InterviewRequest): Promise<InterviewResponse> => {
  try {
    console.log('[API] Generating interview questions with params:', params);
    
    // API endpoint - configurable for testing
    // Use the test server by default, or allow override through window.API_CONFIG
    const apiEndpoint = typeof window !== 'undefined' && (window as any).API_CONFIG?.generateQuestionsUrl 
      ? (window as any).API_CONFIG.generateQuestionsUrl 
      : 'http://localhost:3008/api/interview/generate';
    
    console.log(`[API] Using endpoint: ${apiEndpoint}`);
    
    // Call the API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for API errors
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data;
  } catch (error: any) {
    console.error('[API] Error generating interview questions:', error);
    return {
      job_id: params.job_id,
      job_title: 'Unknown Job',
      questions: [],
      error: error.message
    };
  }
};

export const transcribeAudio = async (audioBase64: string): Promise<string> => {
  try {
    console.log('[API] Transcribing audio with Whisper');
    
    // API endpoint - configurable for testing
    // Use the test server by default, or allow override through window.API_CONFIG
    const apiEndpoint = typeof window !== 'undefined' && (window as any).API_CONFIG?.transcribeUrl 
      ? (window as any).API_CONFIG.transcribeUrl 
      : 'http://localhost:3008/api/interview/transcribe';
    
    console.log(`[API] Using endpoint: ${apiEndpoint}`);
    
    // Call the API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio: audioBase64 }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for API errors
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.text || '';
  } catch (error: any) {
    console.error('[API] Error transcribing audio:', error);
    return '';
  }
};

export const evaluateAnswer = async (
  jobId: string,
  question: string,
  answer: string
): Promise<EvaluationResponse> => {
  try {
    console.log('[API] Evaluating interview answer');
    
    // API endpoint - configurable for testing
    // Use the test server by default, or allow override through window.API_CONFIG
    const apiEndpoint = typeof window !== 'undefined' && (window as any).API_CONFIG?.interviewEvaluationUrl 
      ? (window as any).API_CONFIG.interviewEvaluationUrl 
      : 'http://localhost:3008/api/interview/evaluate';
    
    console.log(`[API] Using endpoint: ${apiEndpoint}`);
    
    // Call the API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_id: jobId,
        question,
        answer,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for API errors
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data;
  } catch (error: any) {
    console.error('[API] Error evaluating answer:', error);
    
    // Return a default response
    return {
      job_id: jobId,
      job_title: 'Unknown Job',
      question,
      answer,
      evaluation: {
        scores: {
          relevance: 5,
          knowledge: 5,
          clarity: 5,
          examples: 5,
          overall: 5,
        },
        analysis: {
          strengths: ['Unable to analyze response'],
          improvements: ['Please try again'],
        },
        rating: 5,
        suggestion: 'Error analyzing your response. Please try again.',
      },
      error: error.message,
    };
  }
};

export const verifyVideoFrame = async (
  frameBase64: string,
  sessionId: string
): Promise<FaceVerificationResult> => {
  try {
    console.log('[API] Verifying video frame');
    
    // Call the API
    const response = await fetch('/api/interview/verify-frame', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        frame: frameBase64,
        session_id: sessionId
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for API errors
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data;
  } catch (error: any) {
    console.error('[API] Error verifying video frame:', error);
    
    // Return a default error response
    return {
      success: false,
      face_detected: false,
      error: error.message || 'Failed to verify video frame'
    };
  }
};

export const analyzeBehavior = async (
  sessionId: string,
  clearSession: boolean = false
): Promise<BehaviorAnalysisResponse> => {
  try {
    console.log('[API] Analyzing candidate behavior');
    
    // API endpoint - configurable for testing
    // Use the test server by default, or allow override through window.API_CONFIG
    const apiEndpoint = typeof window !== 'undefined' && (window as any).API_CONFIG?.behaviorAnalysisUrl 
      ? (window as any).API_CONFIG.behaviorAnalysisUrl 
      : 'http://localhost:3008/api/interview/analyze-behavior';
    
    console.log(`[API] Using endpoint: ${apiEndpoint}`);
    
    // Call the API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        clear_session: clearSession
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for API errors
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data;
  } catch (error: any) {
    console.error('[API] Error analyzing behavior:', error);
    
    // Return a default error response
    return {
      success: false,
      session_id: sessionId,
      frame_count: 0,
      behavior_analysis: {
        attention_score: 0,
        suspicious_activity: false,
        present_percentage: 0,
        looking_away_percentage: 0,
        centered_percentage: 0,
        rapid_movements_count: 0,
        message: error.message || 'Failed to analyze behavior'
      },
      error: error.message
    };
  }
};

export const evaluateCodingSolution = async (
  jobId: string,
  problem: string,
  solution: string,
  language: string = 'javascript'
): Promise<CodingEvaluationResponse> => {
  try {
    console.log('[API] Evaluating coding solution');
    
    // API endpoint - configurable for testing
    // Use the test server by default, or allow override through window.API_CONFIG
    const apiEndpoint = typeof window !== 'undefined' && (window as any).API_CONFIG?.codingEvaluationUrl 
      ? (window as any).API_CONFIG.codingEvaluationUrl 
      : 'http://localhost:3008/api/interview/coding';
    
    console.log(`[API] Using endpoint: ${apiEndpoint}`);
    
    // Call the API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_id: jobId,
        problem,
        solution,
        language
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for API errors
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data;
  } catch (error: any) {
    console.error('[API] Error evaluating coding solution:', error);
    
    // Return a default error response
    return {
      success: false,
      job_id: jobId,
      job_title: 'Unknown Job',
      language,
      evaluation: {
        scores: {
          correctness: 5,
          efficiency: 5,
          style: 5,
          readability: 5,
          overall: 5
        },
        analysis: {
          strengths: ['Unable to analyze solution'],
          improvements: ['Please try again']
        },
        code_issues: [],
        rating: 5,
        suggestion: 'Error analyzing your solution. Please try again.'
      },
      error: error.message
    };
  }
};

// Mock data for development and when API is unavailable
const getMockSearchResults = (params: SearchParams): JobListing[] => {
  return Array(10).fill(null).map((_, i) => ({
    id: `job-${i + 1}`,
    title: `${params.query || 'Software Engineer'} ${i + 1}`,
    company: `Company ${i + 1}`,
    location: params.location || 'Casablanca, Morocco',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget ultricies aliquam, nunc nisl aliquet nunc, quis aliquam nisl nunc quis nisl.',
    salary: `${30000 + i * 5000} - ${40000 + i * 5000} MAD`,
    salaryMin: 30000 + i * 5000,
    salaryMax: 40000 + i * 5000,
    jobType: params.jobType || (i % 2 === 0 ? 'CDI' : 'CDD'),
    remote: params.remote || (i % 3 === 0),
    postedAt: new Date(Date.now() - i * 86400000).toISOString(),
    skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
  }));
};

const getMockJobDetails = (jobId: string): JobListing => {
  const id = parseInt(jobId.replace('job-', '')) || 1;
  return {
    id: jobId,
    title: `Software Engineer ${id}`,
    company: `Company ${id}`,
    location: 'Casablanca, Morocco',
    description: `
      <p>We are looking for a talented Software Engineer to join our growing team.</p>
      <h3>Responsibilities:</h3>
      <ul>
        <li>Design and develop high-quality software solutions</li>
        <li>Collaborate with cross-functional teams to define, design, and ship new features</li>
        <li>Write clean, efficient, and maintainable code</li>
        <li>Work with outside data sources and APIs</li>
        <li>Unit-test code for robustness, including edge cases, usability, and general reliability</li>
      </ul>
      <h3>Requirements:</h3>
      <ul>
        <li>Bachelor's degree in Computer Science or related field</li>
        <li>3+ years of experience in software development</li>
        <li>Proficiency in JavaScript, TypeScript, and React</li>
        <li>Experience with Node.js and Express</li>
        <li>Familiarity with database technologies (SQL, NoSQL)</li>
        <li>Knowledge of cloud computing platforms (AWS, Azure, GCP)</li>
      </ul>
    `,
    salary: `${30000 + id * 5000} - ${40000 + id * 5000} MAD`,
    salaryMin: 30000 + id * 5000,
    salaryMax: 40000 + id * 5000,
    jobType: id % 2 === 0 ? 'CDI' : 'CDD',
    remote: id % 3 === 0,
    url: 'https://example.com/job',
    postedAt: new Date(Date.now() - id * 86400000).toISOString(),
    skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'Express', 'MongoDB'],
  };
};

const getMockSimilarJobs = (): JobListing[] => {
  return Array(5).fill(null).map((_, i) => ({
    id: `job-similar-${i + 1}`,
    title: `Similar Software Engineer ${i + 1}`,
    company: `Company ${i + 1}`,
    location: 'Rabat, Morocco',
    description: 'This is a similar job...',
    salary: `${32000 + i * 3000} - ${42000 + i * 3000} MAD`,
    salaryMin: 32000 + i * 3000,
    salaryMax: 42000 + i * 3000,
    jobType: i % 2 === 0 ? 'CDD' : 'CDI',
    remote: i % 2 === 0,
    similarityScore: 0.95 - (i * 0.05),
  }));
};

const getMockRecommendations = (): JobListing[] => {
  return Array(10).fill(null).map((_, i) => ({
    id: `job-rec-${i + 1}`,
    title: `Recommended Job ${i + 1}`,
    company: `Top Company ${i + 1}`,
    location: i % 2 === 0 ? 'Casablanca, Morocco' : 'Rabat, Morocco',
    description: 'This is a recommended job based on your profile...',
    salary: `${35000 + i * 4000} - ${45000 + i * 4000} MAD`,
    salaryMin: 35000 + i * 4000,
    salaryMax: 45000 + i * 4000,
    jobType: i % 2 === 0 ? 'CDI' : 'CDD',
    remote: i % 3 === 0,
    similarityScore: 0.98 - (i * 0.03),
  }));
};

const getMockUserProfile = () => {
  return {
    id: 'user-1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
    savedJobs: Array(3).fill(null).map((_, i) => ({
      id: `job-saved-${i + 1}`,
      title: `Saved Job ${i + 1}`,
      company: `Company ${i + 1}`,
      location: 'Casablanca, Morocco',
      savedAt: new Date(Date.now() - i * 86400000).toISOString(),
    })),
    applications: Array(2).fill(null).map((_, i) => ({
      id: `application-${i + 1}`,
      jobId: `job-${i + 1}`,
      jobTitle: `Applied Job ${i + 1}`,
      company: `Company ${i + 1}`,
      status: i === 0 ? 'Pending' : 'Viewed',
      appliedAt: new Date(Date.now() - i * 86400000 * 2).toISOString(),
    })),
  };
};

export default api; 