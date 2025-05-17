import { NextResponse } from 'next/server';
import axios from 'axios';

// The API backend URL
const API_BACKEND_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://localhost:5001';

export async function POST(request: Request) {
  try {
    // Extract request body
    const body = await request.json();
    
    if (!body.job_id || !body.question || !body.answer) {
      return NextResponse.json(
        { error: 'Missing required fields: job_id, question, or answer' },
        { status: 400 }
      );
    }

    try {
      // Try to forward the request to the Python backend
      const response = await axios.post(`${API_BACKEND_URL}/api/interview/evaluate`, {
        job_id: body.job_id,
        question: body.question,
        answer: body.answer
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 seconds timeout for evaluation
      });

      // Return the backend response directly
      return NextResponse.json(response.data);
    } catch (apiError) {
      console.log('Backend API not available, using mock implementation');
      
      // Mock implementation when the backend is not available
      const answerLength = body.answer.length;
      const hasKeywords = containsKeywords(body.question, body.answer);
      
      // Generate mock evaluation scores based on answer length and keywords
      const mockEvaluation = {
        job_id: body.job_id,
        question: body.question,
        answer: body.answer,
        evaluation: {
          scores: {
            relevance: Math.min(Math.round(hasKeywords * 10), 10),
            knowledge: Math.min(Math.round(answerLength / 100) + 5, 10),
            clarity: Math.min(Math.round(answerLength / 80) + 6, 10),
            examples: hasKeywords ? 8 : 5,
            overall: Math.min(Math.round((answerLength / 100) + hasKeywords * 5), 10)
          },
          analysis: {
            strengths: [
              "Good articulation of concepts",
              "Demonstrated relevant knowledge",
              hasKeywords ? "Used appropriate terminology" : "Provided a complete answer"
            ],
            improvements: [
              "Could provide more specific examples",
              "Consider adding more technical details",
              "Expand on practical applications"
            ]
          },
          rating: Math.min(Math.round((answerLength / 100) + hasKeywords * 5) / 2 + 4, 10),
          suggestion: "Try to include more concrete examples from your experience to strengthen your answer."
        }
      };
      
      return NextResponse.json(mockEvaluation);
    }
  } catch (error: any) {
    console.error('Error evaluating interview answer:', error);
    const status = error.response?.status || 500;
    const errorMessage = error.response?.data?.error || error.message || 'Failed to evaluate answer';
    
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}

// Helper function to check if the answer contains keywords from the question
function containsKeywords(question: string, answer: string): number {
  // Extract potential keywords from the question
  const questionWords = question.toLowerCase().split(/\s+/);
  const keywords = questionWords.filter(word => 
    word.length > 4 && 
    !['what', 'when', 'where', 'which', 'would', 'could', 'should', 'about', 'there', 'their', 'with'].includes(word)
  );
  
  // Count how many keywords appear in the answer
  const answerLower = answer.toLowerCase();
  const matchedKeywords = keywords.filter(keyword => answerLower.includes(keyword));
  
  // Return a score between 0 and 1 based on keyword matches
  return matchedKeywords.length / Math.max(1, Math.min(keywords.length, 5));
} 