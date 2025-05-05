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

// Safe JSON parse function that handles invalid JSON
function safeJsonParse(text: string): any {
  try {
    // First replace any NaN or Infinity with null
    const sanitized = text
      .replace(/:\s*NaN\s*([,}])/g, ': null$1')
      .replace(/:\s*Infinity\s*([,}])/g, ': null$1')
      .replace(/:\s*-Infinity\s*([,}])/g, ': null$1');
      
    return JSON.parse(sanitized);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return { jobs: [] };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the URL search params
    const searchParams = request.nextUrl.searchParams;
    
    // Build the URL to forward to the Flask API
    const apiUrl = 'http://localhost:8082/api/jobs/search';
    
    console.log('[NextJS API] Forwarding search request to:', apiUrl);
    console.log('[NextJS API] With params:', Object.fromEntries(searchParams.entries()));
    
    // Forward the request to the Flask API
    const response = await axios.get(apiUrl, {
      params: Object.fromEntries(searchParams.entries()),
      timeout: 10000, // 10 seconds timeout
    });
    
    console.log('[NextJS API] Response status:', response.status);
    console.log('[NextJS API] Response type:', typeof response.data);
    
    // Handle when response data is a string instead of an object
    let parsedData = response.data;
    if (typeof response.data === 'string') {
      console.log('[NextJS API] Data is string, attempting to parse');
      parsedData = safeJsonParse(response.data);
    }
    
    console.log('[NextJS API] Response has jobs?', Boolean(parsedData?.jobs));
    console.log('[NextJS API] Jobs is array?', Array.isArray(parsedData?.jobs));
    console.log('[NextJS API] Jobs count:', parsedData?.jobs?.length || 0);
    
    // Ensure we have a jobs array
    if (!parsedData.jobs) {
      console.log('[NextJS API] No jobs found in response, adding empty array');
      parsedData.jobs = [];
    }
    
    // Sanitize the JSON data to handle NaN values
    const sanitizedData = sanitizeJson(parsedData);
    console.log('[NextJS API] Sanitized jobs count:', sanitizedData?.jobs?.length || 0);
    
    // Return the response
    return NextResponse.json(sanitizedData);
    
  } catch (error) {
    console.error('[NextJS API] Error forwarding search request:', error);
    
    // Return an error response
    return NextResponse.json(
      { error: 'Failed to fetch jobs', jobs: [] },
      { status: 500 }
    );
  }
} 