'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiServer, FiPlay, FiRefreshCw, FiCpu } from 'react-icons/fi';
import axios from 'axios';

// Debug Card Component
interface DebugCardProps {
  title: string;
  description: string;
  href: string;
}

const DebugCard = ({ title, description, href }: DebugCardProps) => (
  <Link href={href} className="block">
    <div className="border border-gray-200 rounded-lg p-5 hover:bg-gray-50 transition duration-150">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-gray-600">{description}</p>
    </div>
  </Link>
);

export default function DebugPage() {
  const [apiStatus, setApiStatus] = useState<string>('Testing API connection...');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [apiServerStatus, setApiServerStatus] = useState<'unknown' | 'running' | 'stopped'>('unknown');
  
  // Test direct API connection
  const testApi = async () => {
    setApiStatus('Testing API connection...');
    setError(null);
    
    try {
      // First, try a direct fetch which uses the Next.js rewrite
      const fetchResponse = await fetch('/api/jobs/search?limit=3');
      const fetchData = await fetchResponse.json();
      
      if (fetchResponse.ok && fetchData.jobs && fetchData.jobs.length > 0) {
        setApiStatus('✅ API connected successfully via fetch');
        setApiResponse(fetchData);
        setApiServerStatus('running');
      } else {
        setApiStatus('⚠️ Fetch received a response but no jobs');
        setApiResponse(fetchData);
        
        // Try with axios as fallback
        try {
          const axiosResponse = await axios.get('http://localhost:8082/api/jobs/search?limit=3');
          if (axiosResponse.data.jobs && axiosResponse.data.jobs.length > 0) {
            setApiStatus('✅ API connected successfully via direct axios call');
            setApiResponse(axiosResponse.data);
            setApiServerStatus('running');
          } else {
            setApiStatus('⚠️ Both fetch and axios received responses but no jobs');
            setApiServerStatus('running'); // Server is running but returned no jobs
          }
        } catch (axiosError: any) {
          setApiStatus('❌ Fetch worked but direct axios call failed');
          setError(`Axios error: ${axiosError.message}`);
          setApiServerStatus('stopped');
        }
      }
    } catch (fetchError: any) {
      setApiStatus('❌ Fetch API request failed');
      setError(`Fetch error: ${fetchError.message}`);
      
      // Try with axios as fallback
      try {
        const axiosResponse = await axios.get('http://localhost:8082/api/jobs/search?limit=3');
        if (axiosResponse.data.jobs && axiosResponse.data.jobs.length > 0) {
          setApiStatus('✅ API connected via axios but fetch failed');
          setApiResponse(axiosResponse.data);
          setApiServerStatus('running');
        } else {
          setApiStatus('⚠️ Axios received a response but no jobs');
          setApiResponse(axiosResponse.data);
          setApiServerStatus('running'); // Server is running but returned no jobs
        }
      } catch (axiosError: any) {
        setApiStatus('❌ Both fetch and axios failed');
        setError(`Combined errors: Fetch - ${fetchError.message}, Axios - ${axiosError.message}`);
        setApiServerStatus('stopped');
      }
    }
  };
  
  // Start the API server function
  const startApiServer = async () => {
    try {
      // This would typically be done via a backend service or admin API
      // For this example, we'll just show how you would do it
      setApiStatus('Attempting to start API server...');
      
      const response = await fetch('/api/admin/start-server', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ service: 'api' })
      });
      
      if (response.ok) {
        setApiStatus('API server start command sent. Please wait a moment and refresh.');
      } else {
        setApiStatus('Failed to start API server. You may need to start it manually.');
        setError('Failed to start API server through the admin API.');
      }
    } catch (error: any) {
      setApiStatus('⚠️ To start the API server, run this command in your terminal:');
      setError('cd Scraping && python api.py --port 8082');
    }
  };
  
  // Gather debug information
  useEffect(() => {
    const info = {
      environment: process.env.NODE_ENV,
      isServer: typeof window === 'undefined',
      baseUrl: window.location.origin,
      userAgent: navigator.userAgent,
      time: new Date().toISOString(),
    };
    
    setDebugInfo(info);
    testApi();
  }, []);
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Debug Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DebugCard 
          title="Local LLM Test"
          description="Test the local LLM integration for generating interview questions and evaluating answers."
          href="/debug/local-llm-test"
        />
        
        <DebugCard 
          title="Mixtral 8x7B"
          description="Test the Mixtral 8x7B model for generation tasks using browser-based inference."
          href="/debug/mixtral"
        />
      </div>
      
      {/* Debug Tools Navigation */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Debug Tools</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/debug/local-llm-test" 
            className="p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex flex-col items-center justify-center"
          >
            <FiCpu className="text-indigo-600 w-8 h-8 mb-2" />
            <span className="text-indigo-800 font-medium">Local LLM Test</span>
            <p className="text-xs text-center text-gray-600 mt-1">
              Test WebLLM local model for interview questions
            </p>
          </Link>
          {/* Add more debug tools here as needed */}
        </div>
      </div>
      
      {/* API Server Status Box */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <FiServer className="text-gray-700 w-6 h-6 mr-2" />
            <h2 className="text-xl font-semibold">API Server Status</h2>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={testApi}
              className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center"
            >
              <FiRefreshCw className="mr-2" />
              Check Status
            </button>
            
            {apiServerStatus === 'stopped' && (
              <button
                onClick={startApiServer}
                className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center"
              >
                <FiPlay className="mr-2" />
                Start Server
              </button>
            )}
          </div>
        </div>
        
        <div className={`p-4 rounded-lg flex items-center ${
          apiServerStatus === 'running' 
            ? 'bg-green-50 text-green-800'
            : apiServerStatus === 'stopped'
            ? 'bg-red-50 text-red-800'
            : 'bg-yellow-50 text-yellow-800'
        }`}>
          <div className={`w-4 h-4 rounded-full mr-3 ${
            apiServerStatus === 'running' 
              ? 'bg-green-500' 
              : apiServerStatus === 'stopped'
              ? 'bg-red-500'
              : 'bg-yellow-500'
          }`}></div>
          <div>
            {apiServerStatus === 'running' 
              ? 'API Server is running and responding to requests' 
              : apiServerStatus === 'stopped'
              ? 'API Server is not running or not responding'
              : 'Checking API Server status...'}
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mt-4">
          The API server runs on port 8082 and provides job search functionality.
          If the server is not running, job search and other data-dependent features will not work.
        </p>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">API Status</h2>
          <button
            onClick={testApi}
            className="px-4 py-2 bg-primary-600 text-white rounded-md"
          >
            Test Again
          </button>
        </div>
        
        <div className="text-lg font-medium mb-4">{apiStatus}</div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
            <h3 className="text-red-800 font-medium mb-2">Error</h3>
            <pre className="text-red-700 text-sm overflow-auto">{error}</pre>
          </div>
        )}
        
        <div className="mb-4">
          <h3 className="font-medium mb-2">Debug Information</h3>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>
      
      {apiResponse && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">API Response</h2>
          
          {apiResponse.jobs && apiResponse.jobs.length > 0 ? (
            <div>
              <p className="mb-4">
                ✅ Found {apiResponse.jobs.length} jobs in the response
              </p>
              
              <div className="grid gap-4">
                {apiResponse.jobs.slice(0, 2).map((job: any) => (
                  <div key={job.id} className="border border-gray-200 rounded p-4">
                    <h3 className="font-medium">{job.title}</h3>
                    <p className="text-gray-600">
                      {job.company} - {job.location}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-amber-700">
              ⚠️ No jobs found in the API response
            </p>
          )}
          
          <div className="mt-6">
            <h3 className="font-medium mb-2">Full Response</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <Link 
          href="/jobs" 
          className="px-4 py-2 bg-gray-800 text-white rounded-md inline-block hover:bg-gray-700"
        >
          Back to Jobs Page
        </Link>
      </div>
    </div>
  );
} 