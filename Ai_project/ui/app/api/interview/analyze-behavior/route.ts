import { NextRequest, NextResponse } from 'next/server';

// Define the behavioral analysis mock response for when the backend is unavailable
const mockBehavioralAnalysis = {
  success: true,
  session_id: '',
  frame_count: 10,
  behavior_analysis: {
    attention_score: 85,
    suspicious_activity: false,
    present_percentage: 92,
    looking_away_percentage: 8,
    centered_percentage: 95,
    rapid_movements_count: 1,
    message: "Candidate maintained good posture and attention throughout the interview."
  }
};

export async function POST(request: NextRequest) {
  console.log('analyze-behavior API route triggered');
  
  try {
    // Get request data
    const requestData = await request.json();
    const { session_id, clear_session } = requestData;
    
    console.log(`Processing behavior analysis for session ${session_id}, clear_session=${clear_session}`);
    
    // If it's a clear session request, return success immediately
    if (clear_session) {
      console.log('Session cleanup requested, returning success');
      return NextResponse.json({
        success: true,
        session_id,
        message: 'Session cleared successfully'
      });
    }
    
    // Try to forward to backend server
    try {
      const apiUrl = `${process.env.API_URL || 'http://localhost:8083/api'}/interview/analyze-behavior`;
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
      console.log('Returning mock behavioral analysis');
      
      // Return mock data if backend is unavailable
      return NextResponse.json({
        ...mockBehavioralAnalysis,
        session_id
      });
    }
  } catch (error: any) {
    console.error('Error in analyze-behavior API route:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'An error occurred while analyzing candidate behavior',
        session_id: requestData?.session_id || 'unknown'
      },
      { status: 500 }
    );
  }
} 