'use client';

import React, { useState, useEffect } from 'react';
import { api, ENDPOINTS } from '@/lib/api';
import Button from '@/components/atoms/Button';
import Badge from '@/components/atoms/Badge';

export default function DebugPage() {
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [jobSearchResults, setJobSearchResults] = useState<any>(null);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Helper function to set loading state
  const setTestLoading = (test: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [test]: isLoading }));
  };

  // Test API health
  const testApiHealth = async () => {
    setActiveTest('health');
    setTestLoading('health', true);
    try {
      const result = await api.checkHealth();
      setApiStatus(result);
      console.log('API Health result:', result);
    } catch (error) {
      console.error('API Health error:', error);
      setApiStatus({ error: String(error) });
    } finally {
      setTestLoading('health', false);
    }
  };

  // Test job search
  const testJobSearch = async () => {
    setActiveTest('search');
    setTestLoading('search', true);
    try {
      const result = await api.searchJobs({ query: 'software engineer', limit: 5 });
      setJobSearchResults(result);
      console.log('Job Search result:', result);
    } catch (error) {
      console.error('Job Search error:', error);
      setJobSearchResults({ error: String(error) });
    } finally {
      setTestLoading('search', false);
    }
  };

  // Test job details (using first job from search results)
  const testJobDetails = async () => {
    if (!jobSearchResults?.results?.length) {
      alert('Please run a job search first to get job IDs');
      return;
    }

    setActiveTest('details');
    setTestLoading('details', true);
    try {
      const jobId = jobSearchResults.results[0].id;
      
      // First check if this job exists in the search results
      console.log(`Testing job details for ${jobId}:`, jobSearchResults.results[0]);
      
      // Make the API call
      const result = await api.getJobDetails(jobId);
      setJobDetails(result);
      console.log('Job Details result:', result);
    } catch (error) {
      console.error('Job Details error:', error);
      setJobDetails({ error: String(error) });
    } finally {
      setTestLoading('details', false);
    }
  };

  // Test recommendations
  const testRecommendations = async () => {
    setActiveTest('recommendations');
    setTestLoading('recommendations', true);
    try {
      const result = await api.getRecommendations({ limit: 5 });
      setRecommendations(result);
      console.log('Recommendations result:', result);
    } catch (error) {
      console.error('Recommendations error:', error);
      setRecommendations({ error: String(error) });
    } finally {
      setTestLoading('recommendations', false);
    }
  };

  // Clear all results
  const clearResults = () => {
    setApiStatus(null);
    setJobSearchResults(null);
    setJobDetails(null);
    setRecommendations(null);
    setActiveTest(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">API Debug Page</h1>
        <p className="text-gray-600">
          Test the connection between the UI and Flask API endpoints
        </p>
      </div>

      <div className="glass-card p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">API Tests</h2>
        <div className="flex flex-wrap gap-4 mb-6">
          <Button 
            variant="primary" 
            onClick={testApiHealth} 
            isLoading={loading.health}
          >
            Test API Health
          </Button>
          <Button 
            variant="primary" 
            onClick={testJobSearch} 
            isLoading={loading.search}
          >
            Test Job Search
          </Button>
          <Button 
            variant="primary" 
            onClick={testJobDetails} 
            isLoading={loading.details}
            disabled={!jobSearchResults?.results?.length}
          >
            Test Job Details
          </Button>
          <Button 
            variant="primary" 
            onClick={testRecommendations} 
            isLoading={loading.recommendations}
          >
            Test Recommendations
          </Button>
          <Button 
            variant="outline" 
            onClick={clearResults}
          >
            Clear Results
          </Button>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">API Status</h3>
          <div className="flex items-center gap-2 mb-2">
            <Badge 
              variant={apiStatus?.status === 'ok' ? 'success' : apiStatus ? 'danger' : 'secondary'}
              rounded
            >
              {apiStatus?.status === 'ok' ? 'Connected' : apiStatus?.error ? 'Error' : 'Not Tested'}
            </Badge>
            <span className="text-sm text-gray-500">
              {apiStatus?.timestamp ? `Last checked: ${new Date(apiStatus.timestamp).toLocaleString()}` : ''}
            </span>
          </div>
          {apiStatus && (
            <div className="border border-gray-200 rounded p-3 bg-gray-50 overflow-auto max-h-40">
              {apiStatus.error && <div className="text-red-500 mb-2">{apiStatus.error}</div>}
              <pre className="text-xs">{JSON.stringify(apiStatus, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      {activeTest === 'search' && jobSearchResults && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Job Search Results</h2>
          <div className="mb-2">
            <Badge variant="info" rounded>Total: {jobSearchResults.total || 0}</Badge>
          </div>
          {jobSearchResults.error ? (
            <div className="text-red-500">{jobSearchResults.error}</div>
          ) : (
            <div className="border border-gray-200 rounded overflow-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {jobSearchResults.results?.map((job: any) => (
                    <tr key={job.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{job.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.company}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTest === 'details' && jobDetails && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Job Details</h2>
          {jobDetails.error ? (
            <div className="text-red-500">{jobDetails.error}</div>
          ) : (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-medium">{jobDetails.job?.title}</h3>
                <p className="text-gray-600">{jobDetails.job?.company} • {jobDetails.job?.location}</p>
              </div>
              <div className="border border-gray-200 rounded p-3 bg-gray-50 overflow-auto max-h-96">
                <pre className="text-xs">{JSON.stringify(jobDetails, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTest === 'recommendations' && recommendations && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Job Recommendations</h2>
          {recommendations.error ? (
            <div className="text-red-500">{recommendations.error}</div>
          ) : (
            <div className="border border-gray-200 rounded overflow-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recommendations.results?.map((job: any) => (
                    <tr key={job.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{job.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.company}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Badge variant={job.similarity_score > 0.7 ? 'success' : 'warning'}>
                          {Math.round(job.similarity_score * 100)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-4">API Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-md font-medium mb-2">Endpoints</h3>
            <ul className="space-y-2 text-sm">
              {Object.entries(ENDPOINTS).map(([key, value]) => (
                <li key={key} className="flex items-start">
                  <span className="font-medium mr-2">{key}:</span>
                  <span className="text-gray-600 break-all">{typeof value === 'function' ? value('example-id') : value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-md font-medium mb-2">API Base URL</h3>
            <div className="text-sm border border-gray-200 rounded p-3 bg-gray-50">
              {'/api'}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              This base URL is configured in next.config.ts to proxy requests to the Flask backend (http://localhost:5001)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 