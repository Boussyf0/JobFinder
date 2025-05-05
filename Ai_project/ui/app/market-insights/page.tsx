'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Initial data structure
const initialData = {
  summary: {
    totalJobs: 15000,
    avgSalary: 45000,
    itMarketShare: 23,
    topLocation: 'Casablanca',
    remotePercentage: 15
  },
  salaryByRole: [],
  jobsByIndustry: [],
  jobTrends: [],
  skillDemand: [],
  topCities: [],
  modelMetrics: {
    accuracy: 0.85,
    r2Score: 0.78,
    meanError: 2300,
    importantFeatures: []
  },
  lastUpdated: new Date().toISOString()
};

// Color arrays for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];
const INDUSTRY_COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658'];
const SKILL_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#9d31e2', '#41ab5d'];

const MarketInsightsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(initialData);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch market insights data from API
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/market-insights');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const marketData = await response.json();
        setData(marketData);
        setError('');
      } catch (err) {
        console.error('Error fetching market insights data:', err);
        setError('Failed to load market insights data. Using sample data instead.');
        // Keep using initialData as fallback
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Format currency for display
  const formatSalary = (value: number): string => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Overview section showing summary statistics
  const OverviewSection = () => {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
              <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"></path>
              <path d="M12 14c-4 0-8 1.79-8 4v2h16v-2c0-2.21-4-4-8-4z"></path>
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalJobs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all industries
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Salary</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSalary(data.summary.avgSalary)}</div>
            <p className="text-xs text-muted-foreground">
              Annual gross salary
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IT Market Share</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.itMarketShare}%</div>
            <p className="text-xs text-muted-foreground">
              Of total job market
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remote Work</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.remotePercentage}%</div>
            <p className="text-xs text-muted-foreground">
              Jobs offering remote work
            </p>
          </CardContent>
        </Card>
      </div>
    )
  };

  // Salary by role chart
  const SalarySection = () => {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Salary by Role</CardTitle>
          <CardDescription>
            Average annual gross salary by job role in Morocco
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                width={500}
                height={300}
                data={data.salaryByRole}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 50,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" height={70} />
                <YAxis tickFormatter={(value) => `${(Number(value) / 1000).toFixed(0)}k MAD`} />
                <Tooltip formatter={(value) => formatSalary(Number(value))} />
                <Bar dataKey="salary" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  };

  // Industry distribution chart
  const IndustrySection = () => {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Jobs by Industry</CardTitle>
          <CardDescription>
            Distribution of job listings across industries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.jobsByIndustry}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.jobsByIndustry.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={INDUSTRY_COLORS[index % INDUSTRY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${Number(value).toLocaleString()} jobs`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  };

  // Job trends chart
  const TrendsSection = () => {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Job Market Trends</CardTitle>
          <CardDescription>
            Monthly job posting trends over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                width={500}
                height={300}
                data={data.jobTrends}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="jobs" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  };

  // Skills demand chart
  const SkillsSection = () => {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>In-Demand Skills</CardTitle>
          <CardDescription>
            Most requested technical and soft skills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                width={500}
                height={300}
                data={data.skillDemand}
                layout="vertical"
                margin={{
                  top: 5,
                  right: 30,
                  left: 100,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  };

  // Cities job distribution
  const CitiesSection = () => {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Geographic Distribution</CardTitle>
          <CardDescription>
            Job opportunities by city
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                width={500}
                height={300}
                data={data.topCities}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `${Number(value).toLocaleString()} jobs`} />
                <Legend />
                <Bar dataKey="jobs" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  };
  
  // Model metrics section
  const ModelSection = () => {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4">Model Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-500">R² Score</h4>
            <p className="text-2xl font-bold">{(data.modelMetrics.r2Score * 100).toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Percentage of variance explained</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-500">Accuracy</h4>
            <p className="text-2xl font-bold">{(data.modelMetrics.accuracy * 100).toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Classification accuracy</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-500">Mean Error</h4>
            <p className="text-2xl font-bold">±{formatSalary(data.modelMetrics.meanError)}</p>
            <p className="text-xs text-gray-500">Average prediction error</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-sm font-semibold mb-4">Feature Importance</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data.modelMetrics.importantFeatures}
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 1]} />
                <YAxis type="category" dataKey="name" />
                <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(3) : value} />
                <Bar dataKey="importance" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-2">Market Insights Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Comprehensive market analysis of engineering job trends in Morocco
        {data.lastUpdated && (
          <span className="text-sm italic ml-2">
            (Last updated: {new Date(data.lastUpdated).toLocaleDateString()})
          </span>
        )}
      </p>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="mt-4">Loading market insights data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
          <p className="text-yellow-700">{error}</p>
        </div>
      ) : (
        <Tabs defaultValue="overview" onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="salary">Salary Analysis</TabsTrigger>
            <TabsTrigger value="industry">Industry</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-8">
            <OverviewSection />
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
              <SalarySection />
              <IndustrySection />
            </div>
          </TabsContent>
          
          <TabsContent value="salary" className="space-y-8">
            <SalarySection />
            <ModelSection />
          </TabsContent>
          
          <TabsContent value="industry" className="space-y-8">
            <IndustrySection />
          </TabsContent>
          
          <TabsContent value="trends" className="space-y-8">
            <TrendsSection />
          </TabsContent>
          
          <TabsContent value="skills" className="space-y-8">
            <SkillsSection />
          </TabsContent>
          
          <TabsContent value="location" className="space-y-8">
            <CitiesSection />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default MarketInsightsPage; 