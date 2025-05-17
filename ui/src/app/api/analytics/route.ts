import { NextResponse } from 'next/server';
import axios from 'axios';

// The API backend URL
const API_BACKEND_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://localhost:5001';

export async function GET(request: Request) {
  try {
    try {
      // Try to forward the request to the Python backend
      const response = await axios.get(`${API_BACKEND_URL}/api/analytics`, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 seconds timeout
      });

      // Return the backend response directly
      return NextResponse.json(response.data);
    } catch (apiError) {
      console.log('Backend API not available, using mock implementation');
      
      // Mock analytics data
      const mockAnalytics = {
        total_jobs: 2450,
        jobs_with_salary: 1876,
        field_distribution: {
          'IT & Technology': 45,
          'Electrical Engineering': 15,
          'Industrial Engineering': 12,
          'Civil Engineering': 10,
          'Mechanical Engineering': 8,
          'Chemical Engineering': 5,
          'Other Engineering': 5
        },
        location_distribution: {
          'Casablanca': 450,
          'Rabat': 320,
          'Marrakech': 180,
          'Tangier': 150,
          'Agadir': 120,
          'Fez': 110,
          'Other': 1120
        },
        job_type_distribution: {
          'CDI': 1650,
          'CDD': 450,
          'Stage': 280,
          'Freelance': 70
        },
        salary_ranges: {
          '0-30k': 320,
          '30k-50k': 780,
          '50k-80k': 540,
          '80k-120k': 180,
          '120k+': 56
        },
        top_skills: {
          'Python': 45,
          'JavaScript': 42,
          'SQL': 38,
          'Java': 35,
          'React': 32,
          'Node.js': 28,
          'Angular': 25,
          'TypeScript': 24,
          'C#': 22,
          'Docker': 20
        },
        monthly_trends: {
          'Jan': 210,
          'Feb': 240,
          'Mar': 280,
          'Apr': 310,
          'May': 350,
          'Jun': 320,
          'Jul': 290,
          'Aug': 270,
          'Sep': 330,
          'Oct': 360,
          'Nov': 340,
          'Dec': 290
        },
        remote_percentage: 35,
        avg_salary: 65000,
        timestamp: new Date().toISOString()
      };
      
      return NextResponse.json(mockAnalytics);
    }
  } catch (error: any) {
    console.error('Error fetching analytics data:', error);
    const status = error.response?.status || 500;
    const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch analytics data';
    
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
} 