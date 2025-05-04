'use client';

import { useEffect, useState } from 'react';
import {
  FiActivity,
  FiBarChart2,
  FiBriefcase,
  FiDollarSign,
  FiMapPin,
  FiPieChart,
  FiTrendingUp
} from 'react-icons/fi';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

// Initial empty data structure
const initialData = {
  summary: {
    totalJobs: 0,
    avgSalary: 0,
    itMarketShare: 0,
    topLocation: '',
  },
  salaryByRole: [],
  jobsByIndustry: [],
  jobTrends: [],
  skillDemand: [],
  topCities: [],
  modelMetrics: {
    modelType: '',
    r2Score: 0,
    mae: 0,
    percentError: 0,
  }
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

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
        setError('Failed to load market insights data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'salaries':
        return renderSalariesTab();
      case 'trends':
        return renderTrendsTab();
      case 'locations':
        return renderLocationsTab();
      case 'skills':
        return renderSkillsTab();
      default:
        return renderOverviewTab();
    }
  };

  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FiPieChart className="mr-2 text-primary-500" />
          Job Distribution by Industry
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.jobsByIndustry}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.jobsByIndustry.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} %`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FiBarChart2 className="mr-2 text-primary-500" />
          Average Salary by Role
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.salaryByRole}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toLocaleString()} MAD`} />
              <Bar dataKey="salary" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FiTrendingUp className="mr-2 text-primary-500" />
          Job Postings Trend (2025)
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.jobTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="jobs" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FiActivity className="mr-2 text-primary-500" />
          Top Skills in Demand
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.skillDemand} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderSalariesTab = () => (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-6">Detailed Salary Analysis</h3>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.salaryByRole}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => `${value.toLocaleString()} MAD`} />
            <Legend />
            <Bar dataKey="salary" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="font-medium text-gray-700">Highest Paying Role</h4>
          <p className="text-2xl font-bold text-primary-600">CTO</p>
          <p className="text-lg text-gray-600">121,879 MAD</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="font-medium text-gray-700">Average IT Salary</h4>
          <p className="text-2xl font-bold text-primary-600">84,797 MAD</p>
          <p className="text-sm text-gray-600">Across all seniority levels</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="font-medium text-gray-700">Experience Premium</h4>
          <p className="text-2xl font-bold text-primary-600">+81%</p>
          <p className="text-sm text-gray-600">Senior vs Junior roles</p>
        </div>
      </div>
    </div>
  );

  const renderTrendsTab = () => (
    <div className="grid grid-cols-1 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Monthly Job Posting Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.jobTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="jobs" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Skill Demand Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.skillDemand} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderLocationsTab = () => (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Job Distribution by Location</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.topCities}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="jobs" fill="#FF8042" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-8">
        <h4 className="font-medium text-gray-700 mb-4">Regional Job Market Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <h5 className="font-medium">Casablanca</h5>
            <p className="text-sm text-gray-600">Highest concentration of IT & Technology jobs (58%)</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-md">
            <h5 className="font-medium">Rabat</h5>
            <p className="text-sm text-gray-600">Growing technology hub with government/enterprise jobs</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-md">
            <h5 className="font-medium">Tangier</h5>
            <p className="text-sm text-gray-600">Manufacturing and logistics technology opportunities</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-md">
            <h5 className="font-medium">Marrakech</h5>
            <p className="text-sm text-gray-600">Tourism tech and hospitality systems development</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSkillsTab = () => (
    <div className="grid grid-cols-1 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">In-Demand Technical Skills</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.skillDemand} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Demand Score" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Skills Analysis</h3>
        <div className="prose max-w-none">
          <p>
            The Moroccan job market shows a strong demand for technical skills, particularly in:
          </p>
          <ul className="list-disc pl-5 mb-4">
            <li><strong>Web Development:</strong> React, JavaScript, and Node.js remain the most sought-after frontend and backend technologies.</li>
            <li><strong>Data Technologies:</strong> Python, SQL, and data analysis tools are increasingly required as companies invest in data-driven decision making.</li>
            <li><strong>Cloud & DevOps:</strong> AWS and Docker skills show high demand as companies migrate to cloud infrastructure.</li>
          </ul>
          <p>
            For engineering roles outside of IT, common technical requirements include:
          </p>
          <ul className="list-disc pl-5">
            <li><strong>Electrical Engineering:</strong> Automation, control systems, and IoT experience</li>
            <li><strong>Industrial Engineering:</strong> Process optimization, lean manufacturing, and supply chain knowledge</li>
            <li><strong>Civil Engineering:</strong> BIM software proficiency and sustainable construction experience</li>
          </ul>
        </div>
      </div>
    </div>
  );

  // Error state
  if (error) {
    return (
      <div className="container-custom py-10">
        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-md"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold mb-2">Morocco Job Market Insights</h1>
      <p className="text-gray-600 mb-6">
        Data-driven analysis of engineering job market trends in Morocco
        {data.lastUpdated && (
          <span className="text-sm ml-2 text-gray-500">
            (Last updated: {new Date(data.lastUpdated).toLocaleDateString()})
          </span>
        )}
      </p>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-700">
          {error}
        </div>
      ) : (
        <>
          {/* Market Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-4 flex flex-col">
              <span className="text-gray-600 text-sm mb-1">Total Jobs</span>
              <span className="text-2xl font-bold text-primary-600 flex items-center">
                {data.summary.totalJobs.toLocaleString()}
                <FiBriefcase className="ml-2 text-primary-400" />
              </span>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 flex flex-col">
              <span className="text-gray-600 text-sm mb-1">Average Salary</span>
              <span className="text-2xl font-bold text-primary-600 flex items-center">
                {data.summary.avgSalary.toLocaleString()} MAD
                <FiDollarSign className="ml-2 text-primary-400" />
              </span>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 flex flex-col">
              <span className="text-gray-600 text-sm mb-1">IT Market Share</span>
              <span className="text-2xl font-bold text-primary-600 flex items-center">
                {data.summary.itMarketShare}%
                <FiPieChart className="ml-2 text-primary-400" />
              </span>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 flex flex-col">
              <span className="text-gray-600 text-sm mb-1">Top Location</span>
              <span className="text-2xl font-bold text-primary-600 flex items-center">
                {data.summary.topLocation}
                <FiMapPin className="ml-2 text-primary-400" />
              </span>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 flex flex-col">
              <span className="text-gray-600 text-sm mb-1">Remote Jobs</span>
              <span className="text-2xl font-bold text-primary-600 flex items-center">
                {data.summary.remotePercentage || 0}%
                <FiActivity className="ml-2 text-primary-400" />
              </span>
            </div>
          </div>
          
          {/* Tabs navigation */}
          <div className="flex flex-wrap space-x-1 border-b border-gray-200 mb-6">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium text-sm rounded-t-md transition ${
                activeTab === 'overview' 
                  ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600' 
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('salaries')}
              className={`px-4 py-2 font-medium text-sm rounded-t-md transition ${
                activeTab === 'salaries' 
                  ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600' 
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              Salary Analysis
            </button>
            <button 
              onClick={() => setActiveTab('trends')}
              className={`px-4 py-2 font-medium text-sm rounded-t-md transition ${
                activeTab === 'trends' 
                  ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600' 
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              Job Trends
            </button>
            <button 
              onClick={() => setActiveTab('locations')}
              className={`px-4 py-2 font-medium text-sm rounded-t-md transition ${
                activeTab === 'locations' 
                  ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600' 
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              Location Analysis
            </button>
            <button 
              onClick={() => setActiveTab('skills')}
              className={`px-4 py-2 font-medium text-sm rounded-t-md transition ${
                activeTab === 'skills' 
                  ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600' 
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              Skills Demand
            </button>
          </div>
          
          {/* Tab content */}
          {renderTabContent()}
          
          {/* Prediction Model Info */}
          {data.modelMetrics && (
            <div className="mt-8 bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">About the Salary Prediction Model</h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="block text-gray-500">Model Type</span>
                  <span className="font-medium">{data.modelMetrics.modelType}</span>
                </div>
                <div>
                  <span className="block text-gray-500">R² Score</span>
                  <span className="font-medium">{data.modelMetrics.r2Score.toFixed(2)}</span>
                </div>
                <div>
                  <span className="block text-gray-500">Mean Absolute Error</span>
                  <span className="font-medium">{data.modelMetrics.mae.toFixed(2)} MAD</span>
                </div>
                <div>
                  <span className="block text-gray-500">Average Error</span>
                  <span className="font-medium">±{data.modelMetrics.percentError.toFixed(1)}%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                The salary predictions are based on a machine learning model trained on job market data.
                Due to limited salary data availability in job listings, the model has moderate accuracy and should be used as a general guide only.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MarketInsightsPage; 