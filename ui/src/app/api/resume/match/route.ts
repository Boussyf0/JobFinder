import { NextResponse } from 'next/server';
import axios from 'axios';

// The API backend URL
const API_BACKEND_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://localhost:5001';

// This is a mock API endpoint for resume matching
export async function POST(request: Request) {
  try {
    // Extract request body
    const body = await request.json();
    
    if (!body.resume) {
      return NextResponse.json(
        { error: 'No resume provided' },
        { status: 400 }
      );
    }

    // Forward the request to the Python backend
    const response = await axios.post(`${API_BACKEND_URL}/api/resume/match`, {
      resume: body.resume,
      file_type: body.file_type || 'text/plain',
      limit: body.limit || 10
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout for resume processing
    });

    // Transform backend response to match frontend expectations
    const backendData = response.data;
    const matchResults = {
      matches: (backendData.jobs || []).map((job: any) => ({
        job: {
          id: job.id || `job-${Math.random().toString(36).substring(2, 9)}`,
          title: job.title || 'Unknown Position',
          company: job.company || 'Unknown Company',
          location: job.location || 'Unknown Location',
          remote: job.remote_friendly || false,
          description: job.description || '',
          skills: job.matching_skills || [],
          posted_date: job.created || new Date().toISOString().split('T')[0],
          similarity_score: job.match_score / 100 || 0
        },
        match_score: job.match_score / 100 || 0,
        matching_skills: job.matching_skills || [],
        missing_skills: [] // Backend doesn't provide this yet
      })),
      total: (backendData.jobs || []).length,
      skills: backendData.skills || [],
      years_of_experience: backendData.years_of_experience || 0
    };

    return NextResponse.json(matchResults);
  } catch (error: any) {
    console.error('Error in resume match route:', error);
    const status = error.response?.status || 500;
    const errorMessage = error.response?.data?.error || error.message || 'Failed to process resume';
    
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
} 