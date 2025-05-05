import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test backend connectivity
    const backendUrl = process.env.API_URL || 'http://localhost:8082';
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${backendUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return NextResponse.json({
          status: 'ok',
          message: 'Backend API is available',
          backend_url: backendUrl
        });
      } else {
        return NextResponse.json({
          status: 'warning',
          message: `Backend API returned status ${response.status}`,
          backend_url: backendUrl
        });
      }
    } catch (error) {
      return NextResponse.json({
        status: 'error',
        message: 'Backend API is unavailable',
        error: error instanceof Error ? error.message : String(error),
        backend_url: backendUrl
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Test endpoint error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 