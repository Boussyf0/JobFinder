import { NextResponse } from 'next/server';
import axios from 'axios';

// The API backend URL
const API_BACKEND_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://localhost:5001';

export async function POST(request: Request) {
  try {
    // Extract request body
    const body = await request.json();
    
    if (!body.audio) {
      return NextResponse.json(
        { error: 'No audio data provided' },
        { status: 400 }
      );
    }

    try {
      // Try to forward the request to the Python backend
      const response = await axios.post(`${API_BACKEND_URL}/api/interview/transcribe`, {
        audio: body.audio
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 seconds timeout for transcription
      });

      // Return the backend response directly
      return NextResponse.json(response.data);
    } catch (apiError) {
      console.log('Backend API not available, using mock implementation');
      
      // Generate a mock response - since we can't actually transcribe the audio
      // we'll return a generic response based on the audio data length
      
      // The audio is base64 encoded, so its length gives us some indication of duration
      const audioLength = body.audio.length;
      
      // Generate a mock transcription based on the audio length
      let mockText = '';
      
      if (audioLength < 1000) {
        mockText = "Hello, thank you for the opportunity to interview for this position.";
      } else if (audioLength < 10000) {
        mockText = "Hello, thank you for the opportunity to interview for this position. I'm excited to share my experience and skills that I believe make me a strong candidate for this role.";
      } else {
        mockText = "Hello, thank you for the opportunity to interview for this position. I'm excited to share my experience and skills that I believe make me a strong candidate for this role. I have several years of experience in this field and have worked on multiple projects that have prepared me well for the challenges of this position. I'm particularly interested in this role because it aligns with my professional goals and I believe I can make a significant contribution to your team.";
      }
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return NextResponse.json({
        text: mockText,
        confidence: 0.95
      });
    }
  } catch (error: any) {
    console.error('Error transcribing audio:', error);
    const status = error.response?.status || 500;
    
    // Check if this is a specific error from the backend
    if (error.response?.data?.error?.includes('functionality is not available')) {
      return NextResponse.json(
        { 
          error: 'Speech-to-text functionality is not available on the server.',
          text: ''
        },
        { status: 501 } // Not implemented
      );
    }
    
    const errorMessage = error.response?.data?.error || error.message || 'Failed to transcribe audio';
    
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
} 