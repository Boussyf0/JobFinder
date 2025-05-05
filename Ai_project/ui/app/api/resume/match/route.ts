import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Check if we have the required fields
    if (!body.resume) {
      return NextResponse.json(
        { error: 'No resume data provided' },
        { status: 400 }
      );
    }
    
    // Forward the request to the Python API
    const apiBaseUrl = process.env.API_URL || 'http://localhost:8083/api';
    const pythonApiUrl = `${apiBaseUrl}/resume/match`;
    
    console.log('[NextJS API] Forwarding resume matching request to:', pythonApiUrl);
    console.log('[NextJS API] Request payload size:', body.resume.length, 'characters');
    
    try {
      // Call the Python API with enhanced error handling
      const response = await axios.post(pythonApiUrl, body, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout for resume parsing
        validateStatus: status => status < 500, // Consider only 5xx as errors
        transformResponse: [(data) => {
          // Pre-process the response to handle NaN values before parsing JSON
          if (typeof data === 'string') {
            return data.replace(/:\s*NaN\b/g, ': null');
          }
          return data;
        }]
      });
      
      console.log('[NextJS API] Resume matcher response status:', response.status);
      
      if (response.status !== 200) {
        console.error('[NextJS API] Non-200 response:', response.status, response.data);
        return NextResponse.json(
          { error: response.data?.error || `API returned status ${response.status}`, success: false },
          { status: response.status }
        );
      }
      
      // Return the API response
      return NextResponse.json(response.data);
      
    } catch (apiError: any) {
      // Special handling for connection errors
      if (apiError.code === 'ECONNREFUSED') {
        console.error('[NextJS API] Connection refused to Python backend:', apiError.message);
        console.error('[NextJS API] Attempting to connect to:', pythonApiUrl);
        
        // Try alternate port if it was 8083
        if (pythonApiUrl.includes('8083')) {
          try {
            console.log('[NextJS API] Attempting fallback to port 8080...');
            const fallbackUrl = pythonApiUrl.replace('8083', '8080');
            const fallbackResponse = await axios.post(fallbackUrl, body, {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            });
            
            if (fallbackResponse.status === 200) {
              console.log('[NextJS API] Fallback connection successful!');
              return NextResponse.json(fallbackResponse.data);
            }
          } catch (fallbackError) {
            console.error('[NextJS API] Fallback connection also failed');
          }
        }
        
        // Provide a clear error for connection issues
        return NextResponse.json(
          { 
            error: 'Could not connect to the resume analysis service. Please try again later.',
            details: 'Backend service connection refused',
            success: false 
          },
          { status: 503 }
        );
      }
      
      // Handle timeout errors
      if (apiError.code === 'ETIMEDOUT' || apiError.code === 'ESOCKETTIMEDOUT') {
        console.error('[NextJS API] Connection timeout to Python backend:', apiError.message);
        return NextResponse.json(
          { 
            error: 'The resume analysis is taking too long. Please try again with a smaller file or try later.',
            details: 'Backend service timeout',
            success: false 
          },
          { status: 504 }
        );
      }
      
      // General API error handling
      console.error('[NextJS API] API request error:', apiError.message);
      if (apiError.response) {
        console.error('[NextJS API] Error response data:', apiError.response.data);
        return NextResponse.json(
          { error: apiError.response.data?.error || 'Failed to process resume', success: false },
          { status: apiError.response.status || 500 }
        );
      }
      
      throw apiError; // re-throw to be caught by the outer catch
    }
    
  } catch (error: any) {
    console.error('[NextJS API] Error processing resume:', error);
    
    // Fallback response with mock data for development
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process resume', 
        success: false,
        // Include this in development mode to help diagnose the issue
        debug: {
          errorCode: error.code,
          errorName: error.name,
          errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      },
      { status: 500 }
    );
  }
} 