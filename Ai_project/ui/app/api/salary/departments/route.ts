import { NextRequest, NextResponse } from 'next/server';

// Match these with the MODEL_DEPARTMENTS in SalaryPredictorForm.tsx
const DEPARTMENTS = [
  'IT & Technology',
  'Data Science',
  'Engineering',
  'Electrical Engineering',
  'Civil Engineering',
  'Finance & Accounting',
  'Marketing',
  'Sales & Business Development',
  'General',
];

export async function GET(request: NextRequest) {
  try {
    // Attempt to fetch from backend first
    try {
      const response = await fetch(`${process.env.API_URL || 'http://localhost:8082'}/api/salary/departments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Set a short timeout since this is optional
        signal: AbortSignal.timeout(1000),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.departments && Array.isArray(data.departments) && data.departments.length > 0) {
          return NextResponse.json(data);
        }
      }
    } catch (fetchError) {
      console.log('Could not fetch departments from backend, using predefined list');
    }
    
    // Fall back to our predefined list
    return NextResponse.json({
      departments: DEPARTMENTS
    });
    
  } catch (error) {
    console.error('Error in departments route:', error);
    // Even on error, return our predefined departments
    return NextResponse.json({
      departments: DEPARTMENTS 
    });
  }
} 