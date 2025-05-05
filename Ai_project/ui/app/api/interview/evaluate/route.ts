import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get request data
    const requestData = await request.json();
    
    // Forward the request to the Python backend
    const apiUrl = `${process.env.API_URL || 'http://localhost:8083/api'}/interview/evaluate`;
    
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
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('Error in answer evaluation API route:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while evaluating the answer' },
      { status: 500 }
    );
  }
} 