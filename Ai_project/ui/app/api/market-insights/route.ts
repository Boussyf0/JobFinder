import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Paths to check for the JSON file with pre-generated market insights
const INSIGHTS_FILE_PATHS = [
  path.join(process.cwd(), 'market_insights.json'),  // Check in ui directory first
  path.join(process.cwd(), '..', 'market_insights.json')  // Then check in parent directory
];
// Path to the Python script that generates the insights
const INSIGHTS_GENERATOR_SCRIPT = path.join(process.cwd(), 'analyze_market_data.py');

interface MarketSummary {
  totalJobs: number;
  avgSalary: number;
  itMarketShare: number;
  topLocation: string;
  remotePercentage: number;
}

interface SalaryRole {
  name: string;
  salary: number;
}

interface IndustryData {
  name: string;
  value: number;
}

interface TrendData {
  month: string;
  jobs: number;
}

interface SkillData {
  name: string;
  value: number;
}

interface CityData {
  name: string;
  jobs: number;
}

interface FeatureImportance {
  name: string;
  importance: number;
}

interface ModelMetrics {
  accuracy: number;
  r2Score: number;
  meanError: number;
  importantFeatures: FeatureImportance[];
}

interface MarketInsights {
  summary: MarketSummary;
  salaryByRole: SalaryRole[];
  jobsByIndustry: IndustryData[];
  jobTrends: TrendData[];
  skillDemand: SkillData[];
  topCities: CityData[];
  modelMetrics: ModelMetrics;
  lastUpdated: string;
}

// Default data in case the file doesn't exist or there's an error
const defaultData: MarketInsights = {
  summary: {
    totalJobs: 15000,
    avgSalary: 45000,
    itMarketShare: 23,
    topLocation: 'Casablanca',
    remotePercentage: 15
  },
  salaryByRole: [
    { name: 'Software Engineer', salary: 48000 },
    { name: 'Data Scientist', salary: 52000 },
    { name: 'DevOps Engineer', salary: 50000 },
    { name: 'Product Manager', salary: 60000 },
    { name: 'UX Designer', salary: 45000 }
  ],
  jobsByIndustry: [
    { name: 'IT & Technology', value: 5200 },
    { name: 'Manufacturing', value: 3100 },
    { name: 'Finance', value: 2800 },
    { name: 'Retail', value: 2000 },
    { name: 'Healthcare', value: 1900 }
  ],
  jobTrends: [
    { month: 'Jan', jobs: 1200 },
    { month: 'Feb', jobs: 1150 },
    { month: 'Mar', jobs: 1300 },
    { month: 'Apr', jobs: 1400 },
    { month: 'May', jobs: 1350 },
    { month: 'Jun', jobs: 1500 }
  ],
  skillDemand: [
    { name: 'JavaScript', value: 150 },
    { name: 'Python', value: 140 },
    { name: 'React', value: 120 },
    { name: 'AWS', value: 100 },
    { name: 'SQL', value: 95 }
  ],
  topCities: [
    { name: 'Casablanca', jobs: 6500 },
    { name: 'Rabat', jobs: 3200 },
    { name: 'Tangier', jobs: 2100 },
    { name: 'Marrakech', jobs: 1800 },
    { name: 'Agadir', jobs: 1400 }
  ],
  modelMetrics: {
    accuracy: 0.85,
    r2Score: 0.78,
    meanError: 2300,
    importantFeatures: [
      { name: 'Experience Years', importance: 0.35 },
      { name: 'Industry', importance: 0.25 },
      { name: 'Location', importance: 0.20 },
      { name: 'Education Level', importance: 0.15 },
      { name: 'Company Size', importance: 0.05 }
    ]
  },
  lastUpdated: new Date().toISOString()
};

// Function to regenerate market insights data
async function regenerateInsights(): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn('python3', [INSIGHTS_GENERATOR_SCRIPT]);
    
    process.stderr.on('data', (data) => {
      console.error(`Error running market data analysis: ${data}`);
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log('Market insights data successfully regenerated');
        resolve(true);
      } else {
        console.error(`Market insights generator exited with code ${code}`);
        resolve(false);
      }
    });
  });
}

// Function to find the market insights file
function findInsightsFile(): string | null {
  for (const filePath of INSIGHTS_FILE_PATHS) {
    if (fs.existsSync(filePath)) {
      console.log(`Found market insights file at: ${filePath}`);
      return filePath;
    }
  }
  console.log('No market insights file found in any of the checked locations');
  return null;
}

export async function GET() {
  try {
    // Check if the insights file exists in any of the locations
    const insightsFilePath = findInsightsFile();
    
    if (insightsFilePath) {
      const fileContent = fs.readFileSync(insightsFilePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      // Check if the data is more than 24 hours old
      const lastUpdated = new Date(data.lastUpdated);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      // If insights are older than 24 hours, trigger a regeneration
      // but still return the existing data to the client quickly
      if (hoursSinceUpdate > 24) {
        console.log('Market insights data is stale, triggering regeneration in background');
        regenerateInsights().catch(console.error);
      }
      
      return NextResponse.json(data);
    } else {
      console.log('No market insights file found, generating new data');
      
      // Try to regenerate the data
      const success = await regenerateInsights();
      
      // If regeneration was successful, read and return the new data
      const newInsightsFilePath = findInsightsFile();
      if (success && newInsightsFilePath) {
        const fileContent = fs.readFileSync(newInsightsFilePath, 'utf8');
        return NextResponse.json(JSON.parse(fileContent));
      }
      
      // If regeneration failed or file still doesn't exist, return default data
      console.log('Using default market insights data');
      return NextResponse.json(defaultData);
    }
  } catch (error) {
    console.error('Error in market insights API:', error);
    return NextResponse.json(defaultData);
  }
} 