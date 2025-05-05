import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    // Test connectivity to the backend API
    const directResult = await testDirectConnection();
    
    // Check environment
    const environment = {
      nodeEnv: process.env.NODE_ENV,
      apiUrl: process.env.API_URL || 'http://localhost:8082/api',
      version: process.version,
    };
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment,
      apiTests: directResult,
    });
    
  } catch (error: any) {
    console.error('Debug API error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

async function testDirectConnection() {
  try {
    const results = {
      directApi: { success: false, message: '', data: null as any },
      jobsApi: { success: false, message: '', data: null as any },
    };
    
    // Test direct connection to API
    try {
      const response = await axios.get('http://localhost:8082/api/jobs/search?limit=1', {
        timeout: 5000, // 5 second timeout
      });
      
      results.directApi = { 
        success: true, 
        message: 'Connected successfully',
        data: {
          statusCode: response.status,
          hasJobs: response.data?.jobs?.length > 0,
          jobCount: response.data?.jobs?.length || 0,
        }
      };
    } catch (error: any) {
      results.directApi = { 
        success: false, 
        message: `Failed: ${error.message}`,
        data: null
      };
    }
    
    // Test Next.js API route
    try {
      const response = await axios.get('/api/jobs/search?limit=1', {
        timeout: 5000, // 5 second timeout
      });
      
      results.jobsApi = { 
        success: true, 
        message: 'Connected successfully',
        data: {
          statusCode: response.status,
          hasJobs: response.data?.jobs?.length > 0,
          jobCount: response.data?.jobs?.length || 0,
        }
      };
    } catch (error: any) {
      results.jobsApi = { 
        success: false, 
        message: `Failed: ${error.message}`,
        data: null
      };
    }
    
    return results;
  } catch (error: any) {
    return {
      success: false,
      message: `Test failed: ${error.message}`,
    };
  }
} 