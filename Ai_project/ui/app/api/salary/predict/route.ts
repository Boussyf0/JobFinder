import { NextRequest, NextResponse } from 'next/server';

interface SalaryPredictionRequest {
  title: string;
  dept_category: string;
  job_type: string;
  experience_years: number;
  is_remote: number;
  is_hybrid: number;
  is_fulltime: number;
  is_contract: number;
  skills_count: number;
  is_senior: number;
  is_junior: number;
  is_manager: number;
  location: string;
  skills: string[];
}

// Fallback prediction when API is down
function getFallbackPrediction(input: SalaryPredictionRequest) {
  // Base salary by experience and position
  let baseSalary = 30000;
  
  // Adjust for experience
  if (input.experience_years >= 5) {
    baseSalary += 25000;
  } else if (input.experience_years >= 3) {
    baseSalary += 15000;
  } else if (input.experience_years >= 1) {
    baseSalary += 5000;
  }
  
  // Adjust for seniority
  if (input.is_manager) {
    baseSalary *= 1.3;
  } else if (input.is_senior) {
    baseSalary *= 1.2;
  } else if (input.is_junior) {
    baseSalary *= 0.8;
  }
  
  // Adjust for department
  if (input.dept_category === 'IT & Technology' || input.dept_category === 'Data Science') {
    baseSalary *= 1.1;
  } else if (input.dept_category === 'Finance & Accounting') {
    baseSalary *= 1.05;
  }
  
  // Adjust for remote status
  if (input.is_remote) {
    baseSalary *= 0.95;
  }
  
  // Adjust for contract status
  if (input.is_contract) {
    baseSalary *= 1.2;
  }
  
  // Adjust for location
  const locationAdjustments: Record<string, number> = {
    'casablanca': 1.15,
    'rabat': 1.08,
    'tanger': 1.02,
    'marrakech': 1.0,
    'agadir': 0.98
  };
  
  let locationMultiplier = 1.0;
  if (input.location) {
    const locationLower = input.location.toLowerCase();
    for (const [city, adjustment] of Object.entries(locationAdjustments)) {
      if (locationLower.includes(city)) {
        locationMultiplier = adjustment;
        break;
      }
    }
  }
  
  baseSalary *= locationMultiplier;
  
  // Add skills bonus
  baseSalary += input.skills_count * 1000;
  
  return {
    predicted: Math.round(baseSalary),
    min: Math.round(baseSalary * 0.85),
    max: Math.round(baseSalary * 1.15),
    currency: 'MAD',
    confidence: 0.6,
    source: 'fallback'
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: SalaryPredictionRequest = await request.json();
    
    // Ensure all values are correct types for the ML model
    const enhancedPayload = {
      ...body,
      experience_years: Number(body.experience_years),
      is_remote: Number(body.is_remote),
      is_hybrid: Number(body.is_hybrid),
      is_fulltime: Number(body.is_fulltime),
      is_contract: Number(body.is_contract),
      skills_count: Number(body.skills_count),
      is_senior: Number(body.is_senior),
      is_junior: Number(body.is_junior),
      is_manager: Number(body.is_manager),
    };
    
    // Log payload for debugging
    console.log('Salary prediction request:', enhancedPayload);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${process.env.API_URL || 'http://localhost:8082'}/api/salary/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enhancedPayload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`API responded with status ${response.status}`);
        const fallbackResult = getFallbackPrediction(enhancedPayload);
        return NextResponse.json(fallbackResult);
      }
      
      const data = await response.json();
      return NextResponse.json(data);
    } catch (fetchError) {
      console.error('Error fetching from backend API:', fetchError);
      // If the fetch fails, use our fallback prediction
      const fallbackResult = getFallbackPrediction(enhancedPayload);
      return NextResponse.json(fallbackResult);
    }
    
  } catch (error) {
    console.error('Error in salary prediction route:', error);
    // Return a generalized fallback with minimum information
    return NextResponse.json({
      predicted: 50000,
      min: 40000,
      max: 60000,
      currency: 'MAD',
      confidence: 0.5,
      source: 'error_fallback'
    });
  }
} 