import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const insightsPath = path.join(process.cwd(), 'market_insights.json');
    
    // Check if insights file exists and is less than 24 hours old
    try {
      const stats = await fs.stat(insightsPath);
      const fileAge = Date.now() - stats.mtimeMs;
      const isRecent = fileAge < 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (isRecent) {
        const insights = await fs.readFile(insightsPath, 'utf-8');
        return NextResponse.json(JSON.parse(insights));
      }
    } catch (error) {
      // File doesn't exist or can't be read, continue to generate new data
      console.log('No recent insights file found, generating new data...');
    }
    
    // Generate new insights
    try {
      // Run the Python script
      const { stdout, stderr } = await execAsync('python backend/scripts/analyze_market_data.py');
      
      if (stderr) {
        console.error('Error running analysis script:', stderr);
        throw new Error('Failed to generate market insights');
      }
      
      // Read the generated insights
      const insights = await fs.readFile(insightsPath, 'utf-8');
      return NextResponse.json(JSON.parse(insights));
      
    } catch (error) {
      console.error('Error generating insights:', error);
      // Return fallback data matching the structure from analyze_market_data.py
      return NextResponse.json({
        summary: {
          totalJobs: 15000,
          avgSalary: 85000,
          itMarketShare: 45,
          topLocation: "Casablanca",
          remotePercentage: 35
        },
        salaryByRole: [
          { name: "Junior Dev", salary: 53213 },
          { name: "Mid-level Dev", salary: 78189 },
          { name: "Senior Dev", salary: 96273 },
          { name: "DevOps", salary: 72840 },
          { name: "Data Scientist", salary: 90450 }
        ],
        jobsByIndustry: [
          { name: "IT & Technology", value: 45 },
          { name: "Electrical Engineering", value: 15 },
          { name: "Industrial Engineering", value: 12 },
          { name: "Civil Engineering", value: 10 },
          { name: "Mechanical Engineering", value: 8 }
        ],
        jobTrends: [
          { month: "Jan", jobs: 1200 },
          { month: "Feb", jobs: 1320 },
          { month: "Mar", jobs: 1260 },
          { month: "Apr", jobs: 1440 },
          { month: "May", jobs: 1560 }
        ],
        skillDemand: [
          { name: "Python", value: 45 },
          { name: "JavaScript", value: 42 },
          { name: "SQL", value: 38 },
          { name: "Java", value: 35 },
          { name: "React", value: 32 }
        ],
        topCities: [
          { name: "Casablanca", jobs: 450 },
          { name: "Rabat", jobs: 320 },
          { name: "Marrakech", jobs: 180 },
          { name: "Tangier", jobs: 150 },
          { name: "Agadir", jobs: 90 }
        ],
        modelMetrics: {
          modelType: "LightGBM",
          r2Score: 0.2429,
          mae: 26704.01,
          percentError: 40.03,
          accuracy: 0.85,
          importantFeatures: [
            { name: "Experience Years", importance: 0.35 },
            { name: "Industry", importance: 0.25 },
            { name: "Location", importance: 0.20 },
            { name: "Education Level", importance: 0.15 },
            { name: "Company Size", importance: 0.05 }
          ]
        },
        lastUpdated: new Date().toISOString(),
        dataSource: "fallback_data"
      });
    }
  } catch (error) {
    console.error('Error in market insights API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market insights' },
      { status: 500 }
    );
  }
} 