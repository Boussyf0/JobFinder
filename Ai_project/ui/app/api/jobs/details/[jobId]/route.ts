import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Helper function to sanitize JSON data
function sanitizeJson(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeJson);
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Handle NaN and Infinity
      if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
        result[key] = null;
      } else {
        result[key] = sanitizeJson(value);
      }
    }
    return result;
  }
  
  // Return primitive values as is
  return obj;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    
    // Build the URL to forward to the Flask API
    const apiUrl = `http://localhost:8082/api/jobs/details/${jobId}`;
    
    console.log('Forwarding job details request to:', apiUrl);
    
    // Forward the request to the Flask API
    const response = await axios.get(apiUrl, {
      timeout: 10000, // 10 seconds timeout
    });
    
    // Sanitize the JSON data to handle NaN values
    const sanitizedData = sanitizeJson(response.data);
    
    // Return the response
    return NextResponse.json(sanitizedData);
    
  } catch (error) {
    console.error('Error forwarding job details request:', error);
    
    // Return an error response
    return NextResponse.json(
      { error: 'Failed to fetch job details' },
      { status: 500 }
    );
  }
} 