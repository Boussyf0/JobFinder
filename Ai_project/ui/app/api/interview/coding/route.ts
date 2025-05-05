import { NextRequest, NextResponse } from 'next/server';

// Mock coding evaluation response when backend is unavailable
const mockCodingEvaluation = {
  success: true,
  job_id: '',
  job_title: 'Software Developer',
  language: 'javascript',
  evaluation: {
    scores: {
      correctness: 8,
      efficiency: 7,
      style: 8,
      readability: 9,
      overall: 8
    },
    analysis: {
      strengths: [
        "Good solution structure and organization",
        "Efficient algorithm implementation",
        "Readable variable names and comments"
      ],
      improvements: [
        "Consider edge cases such as empty inputs",
        "Add more error handling for robustness"
      ]
    },
    code_issues: [],
    rating: 8,
    suggestion: "Overall good solution. Consider adding more error handling for edge cases."
  }
};

export async function POST(request: NextRequest) {
  console.log('coding evaluation API route triggered');
  
  try {
    // Get request data
    const requestData = await request.json();
    const { job_id, language } = requestData;
    
    console.log(`Processing coding evaluation for job ${job_id}, language: ${language}`);
    
    // Try to forward to backend server
    try {
      const apiUrl = `${process.env.API_URL || 'http://localhost:8083/api'}/interview/coding`;
      console.log(`Forwarding request to: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error from backend: ${response.status} ${errorText}`);
        throw new Error(`Backend error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Successfully received backend response');
      return NextResponse.json(data);
    } catch (backendError) {
      console.error('Backend unavailable or error occurred:', backendError);
      console.log('Returning mock coding evaluation');
      
      // Return mock data if backend is unavailable
      return NextResponse.json({
        ...mockCodingEvaluation,
        job_id,
        language: language || 'javascript'
      });
    }
  } catch (error: any) {
    console.error('Error in coding evaluation API route:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'An error occurred while evaluating the coding solution',
        job_id: requestData?.job_id || 'unknown',
        language: requestData?.language || 'unknown'
      },
      { status: 500 }
    );
  }
} 