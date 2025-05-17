import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Path to the JSON file with pre-generated market insights
const INSIGHTS_FILE_PATH = path.join(process.cwd(), 'market_insights.json');
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

interface LocationData {
  name: string;
  jobs: number;
}

interface ModelMetrics {
  modelType: string;
  r2Score: number;
  mae: number;
  percentError: number;
}

interface MarketInsights {
  summary: MarketSummary;
  salaryByRole: SalaryRole[];
  jobsByIndustry: IndustryData[];
  jobTrends: TrendData[];
  skillDemand: SkillData[];
  topCities: LocationData[];
  modelMetrics: ModelMetrics;
  lastUpdated?: string;
  dataSource?: string;
}

// Function to check if insights file exists and is recent (less than 1 day old)
function insightsFileIsValid(): boolean {
  try {
    if (!fs.existsSync(INSIGHTS_FILE_PATH)) {
      return false;
    }
    
    const stats = fs.statSync(INSIGHTS_FILE_PATH);
    const fileAgeDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
    
    return fileAgeDays < 1;  // File is less than 1 day old
  } catch (error) {
    console.error('Error checking insights file:', error);
    return false;
  }
}

// Function to read insights from the JSON file
function readInsightsFile(): MarketInsights | null {
  try {
    const data = fs.readFileSync(INSIGHTS_FILE_PATH, 'utf8');
    return JSON.parse(data) as MarketInsights;
  } catch (error) {
    console.error('Error reading insights file:', error);
    return null;
  }
}

// Function to regenerate insights using the Python script
async function regenerateInsights(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Check if the script exists
      if (!fs.existsSync(INSIGHTS_GENERATOR_SCRIPT)) {
        console.error('Insights generator script not found:', INSIGHTS_GENERATOR_SCRIPT);
        resolve(false);
        return;
      }
      
      console.log('Regenerating market insights...');
      const pythonProcess = spawn('python3', [INSIGHTS_GENERATOR_SCRIPT]);
      
      pythonProcess.stdout.on('data', (data) => {
        console.log(`Python script output: ${data}`);
      });
      
      pythonProcess.stderr.on('data', (data) => {
        console.error(`Python script error: ${data}`);
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Successfully regenerated market insights');
          resolve(true);
        } else {
          console.error(`Python script exited with code ${code}`);
          resolve(false);
        }
      });
    } catch (error) {
      console.error('Error running insights generator script:', error);
      resolve(false);
    }
  });
}

// Fallback data for when both file and script fail
const fallbackData: MarketInsights = {
  summary: {
    totalJobs: 23506,
    avgSalary: 73904,
    itMarketShare: 45,
    topLocation: 'Casablanca',
    remotePercentage: 35
  },
  
  salaryByRole: [
    { name: 'Junior Dev', salary: 53213 },
    { name: 'Mid-level Dev', salary: 78189 },
    { name: 'Senior Dev', salary: 96273 },
    { name: 'DevOps', salary: 72840 },
    { name: 'Data Scientist', salary: 90450 },
    { name: 'Engineering Manager', salary: 86585 },
    { name: 'CTO', salary: 121879 },
  ],
  
  jobsByIndustry: [
    { name: 'IT & Technology', value: 45 },
    { name: 'Electrical Engineering', value: 15 },
    { name: 'Industrial Engineering', value: 12 },
    { name: 'Civil Engineering', value: 10 },
    { name: 'Mechanical Engineering', value: 8 },
    { name: 'Other', value: 10 },
  ],
  
  jobTrends: [
    { month: 'Jan', jobs: 1200 },
    { month: 'Feb', jobs: 1400 },
    { month: 'Mar', jobs: 1300 },
    { month: 'Apr', jobs: 1700 },
    { month: 'May', jobs: 1800 },
    { month: 'Jun', jobs: 2000 },
    { month: 'Jul', jobs: 1900 },
    { month: 'Aug', jobs: 2200 },
    { month: 'Sep', jobs: 2400 },
    { month: 'Oct', jobs: 2600 },
    { month: 'Nov', jobs: 2550 },
    { month: 'Dec', jobs: 2300 },
  ],
  
  skillDemand: [
    { name: 'React', value: 120 },
    { name: 'Python', value: 110 },
    { name: 'JavaScript', value: 100 },
    { name: 'Java', value: 80 },
    { name: 'DevOps', value: 70 },
    { name: 'AWS', value: 65 },
    { name: 'SQL', value: 60 },
    { name: 'Node.js', value: 50 },
  ],
  
  topCities: [
    { name: 'Casablanca', jobs: 450 },
    { name: 'Rabat', jobs: 320 },
    { name: 'Marrakech', jobs: 180 },
    { name: 'Tangier', jobs: 150 },
    { name: 'Agadir', jobs: 90 },
  ],
  
  modelMetrics: {
    modelType: 'LightGBM',
    r2Score: 0.2429,
    mae: 26704.01,
    percentError: 40.03,
  }
};

export async function GET() {
  try {
    let marketData: MarketInsights | null = null;
    
    // Check if we have a valid insights file
    if (insightsFileIsValid()) {
      console.log('Using existing market insights file');
      marketData = readInsightsFile();
    }
    
    // If no valid file, try to regenerate
    if (!marketData) {
      console.log('No valid insights file found, regenerating...');
      const regenerated = await regenerateInsights();
      
      if (regenerated) {
        marketData = readInsightsFile();
      }
    }
    
    // If all else fails, use fallback data
    if (!marketData) {
      console.log('Using fallback market insights data');
      marketData = fallbackData;
    }

    return NextResponse.json(marketData);
  } catch (error) {
    console.error('Error fetching market insights data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market insights data' },
      { status: 500 }
    );
  }
} 