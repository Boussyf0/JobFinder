'use client';

import JobCard from '@/components/JobCard';
import { JobListing, searchJobs, SearchParams } from '@/lib/api';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { FiClock, FiSearch } from 'react-icons/fi';

// Loading component for Suspense fallback
function JobsPageLoading() {
  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="container-custom">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded w-1/4"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-md">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// The main component that uses useSearchParams
function JobsPageContent() {
  // Get search params from URL
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State for search and filters
  const [query, setQuery] = useState(searchParams?.get('query') || '');
  const [location, setLocation] = useState(searchParams?.get('location') || '');
  const [jobType, setJobType] = useState(searchParams?.get('jobType') || '');
  const [remote, setRemote] = useState(searchParams?.get('remote') === 'true');
  const [moroccoOnly, setMoroccoOnly] = useState(searchParams?.get('moroccoOnly') === 'true');
  const [minSalary, setMinSalary] = useState(searchParams?.get('minSalary') ? parseInt(searchParams?.get('minSalary') || '0') : 0);
  const [experienceLevel, setExperienceLevel] = useState(searchParams?.get('experienceLevel') || '');
  
  // Jobs data state
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [totalJobs, setTotalJobs] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('');
  const [apiServerRunning, setApiServerRunning] = useState<boolean | null>(null);
  
  // Use useEffect to set the initial time on client-side only to avoid hydration mismatch
  useEffect(() => {
    setLastRefreshTime(new Date().toLocaleString());
    
    // Check if API server is running
    const checkApiServer = async () => {
      try {
        const response = await fetch('/api/jobs/search?limit=1');
        const data = await response.json();
        setApiServerRunning(true);
      } catch (err) {
        console.error('API server check failed:', err);
        setApiServerRunning(false);
      }
    };
    
    checkApiServer();
  }, []);
  
  // Job types for filters
  const jobTypes = ['CDI', 'CDD', 'Freelance', 'Stage', 'Part-time'];
  
  // Experience levels
  const experienceLevels = [
    { id: 'entry', name: 'Entry Level (0-2 years)' },
    { id: 'mid', name: 'Mid Level (3-5 years)' },
    { id: 'senior', name: 'Senior (5+ years)' },
    { id: 'lead', name: 'Lead/Management' }
  ];
  
  // Function to search jobs
  const fetchJobs = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // Prepare search parameters
      const searchQueryParams: SearchParams = { 
        query, 
        location, 
        jobType, 
        remote, 
        moroccoOnly,
        minSalary: minSalary > 0 ? minSalary : undefined,
        getLatest: forceRefresh, // Force fetch latest data when refreshing
        sortByDate: true // Always sort by date, newest first
      };
      
      // Add experience level filter
      if (experienceLevel) {
        const expTerms = {
          'entry': 'junior entry level intern stage stagiaire',
          'mid': 'intermediate mid-level mid level',
          'senior': 'senior experienced sr',
          'lead': 'lead manager head chief director cto'
        }[experienceLevel] || '';
        
        if (expTerms) {
          searchQueryParams.query = searchQueryParams.query ? 
            `${searchQueryParams.query} ${expTerms}` : expTerms;
        }
      }
      
      console.log('[fetchJobs] Searching with params:', searchQueryParams);
      
      // Default to an empty query if none is provided to ensure we get results
      if (!searchQueryParams.query && !searchQueryParams.location) {
        searchQueryParams.limit = 50; // Increase limit for empty searches
      }
      
      const results = await searchJobs(searchQueryParams);
      
      console.log('[fetchJobs] Results received:', results);
      console.log('[fetchJobs] Number of jobs found:', results?.length || 0);
      console.log('[fetchJobs] First job:', results?.[0]);
      
      // Important: Make sure results is always an array
      let jobsArray = Array.isArray(results) ? results : [];
      
      // If no results but no errors, try a fallback search with minimal parameters
      if (jobsArray.length === 0 && forceRefresh) {
        console.log('[fetchJobs] No results found, trying fallback search');
        const fallbackResults = await searchJobs({ limit: 20 });
        jobsArray = Array.isArray(fallbackResults) ? fallbackResults : [];
        console.log('[fetchJobs] Fallback search found', jobsArray.length, 'jobs');
      }
      
      // Ensure each job has the required fields
      jobsArray = jobsArray.map(job => ({
        ...job,
        id: job.id || `job-${Math.random().toString(36).substring(2, 9)}`,
        title: job.title || 'Unknown Position',
        company: job.company || 'Unknown Company',
        location: job.location || 'Unknown Location',
        description: job.description || ''
      }));
      
      setJobs(jobsArray);
      setTotalJobs(jobsArray.length);
      setHasSearched(true);
      setLastRefreshTime(new Date().toLocaleString());
      
      console.log('[fetchJobs] State updated. Jobs count:', jobsArray.length);
    } catch (err: any) {
      console.error('[fetchJobs] Error searching jobs:', err);
      setError(err.message || 'Failed to search jobs. Please try again.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [query, location, jobType, remote, moroccoOnly, minSalary, experienceLevel]);
  
  // Update URL when search params change
  const updateSearchParams = useCallback(() => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (location) params.set('location', location);
    if (jobType) params.set('jobType', jobType);
    if (remote) params.set('remote', 'true');
    if (moroccoOnly) params.set('moroccoOnly', 'true');
    if (minSalary > 0) params.set('minSalary', minSalary.toString());
    if (experienceLevel) params.set('experienceLevel', experienceLevel);
    
    router.push(`/jobs?${params.toString()}`, { scroll: false });
  }, [query, location, jobType, remote, moroccoOnly, minSalary, experienceLevel, router]);
  
  // Search on initial load
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);
  
  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearchParams();
    fetchJobs();
  };
  
  // Function to reset search to defaults
  const resetSearch = () => {
    setQuery('');
    setLocation('');
    setJobType('');
    setRemote(false);
    setMoroccoOnly(false);
    setMinSalary(0);
    setExperienceLevel('');
    
    // Clear URL params and search again
    router.push('/jobs', { scroll: false });
    setTimeout(() => fetchJobs(), 100); // Small delay to ensure state updates
  };
  
  // Handle API error retry
  const handleRetry = () => {
    fetchJobs();
  };
  
  return (
    <div className="container-custom py-10">
      <h1 className="text-3xl font-bold mb-2">Find Jobs</h1>
      <p className="text-gray-600 mb-6">Search for jobs globally with advanced filtering options for location, remote work, and more</p>
      
      {apiServerRunning === false && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">API Server Not Running</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  The job search API server is not running. Job search functionality will not work properly.
                  Please contact the administrator or visit the <Link href="/debug" className="font-medium underline">debug page</Link> for more information.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-primary-700 font-medium">
              <span className="mr-2">🔄</span>
              Job listings are updated every 6 hours (at midnight, 6am, noon, and 6pm)
            </p>
            <p className="text-primary-600 text-sm mt-1">
              <span className="mr-2">⏱️</span>
              Results are automatically sorted with newest jobs first
            </p>
            <p className="text-primary-500 text-sm mt-1">
              Last refreshed: {lastRefreshTime || 'Never'}
            </p>
          </div>
          <button
            onClick={() => fetchJobs(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded transition"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>
      </div>
      
      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        {/* Search filters panel */}
        <div className="bg-white p-6 rounded-lg shadow-md h-fit">
          <h2 className="text-xl font-semibold mb-4">Search & Filters</h2>
          
          <form onSubmit={handleSearch}>
            <div className="space-y-6">
              <div>
                <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-1">
                  Keywords
                </label>
                <input
                  type="text"
                  id="query"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Job title, skills, keywords"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="City, region"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="jobType" className="block text-sm font-medium text-gray-700 mb-1">
                  Job Type
                </label>
                <select
                  id="jobType"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="CDI">CDI (Permanent)</option>
                  <option value="CDD">CDD (Contract)</option>
                  <option value="Stage">Internship</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700 mb-1">
                  Experience Level
                </label>
                <select
                  id="experienceLevel"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                >
                  <option value="">All Experience Levels</option>
                  {experienceLevels.map(level => (
                    <option key={level.id} value={level.id}>{level.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="minSalary" className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Salary (MAD)
                </label>
                <input
                  type="number"
                  id="minSalary"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., 20000"
                  value={minSalary || ''}
                  onChange={(e) => setMinSalary(e.target.value ? parseInt(e.target.value) : 0)}
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remote"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={remote}
                    onChange={(e) => setRemote(e.target.checked)}
                  />
                  <label htmlFor="remote" className="ml-2 block text-sm text-gray-700">
                    Remote Jobs Only
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="moroccoOnly"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={moroccoOnly}
                    onChange={(e) => setMoroccoOnly(e.target.checked)}
                  />
                  <label htmlFor="moroccoOnly" className="ml-2 block text-sm text-gray-700">
                    Morocco Relevant
                  </label>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  Search Jobs
                </button>
                <button
                  type="button"
                  onClick={resetSearch}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition duration-150 ease-in-out"
                >
                  Reset
                </button>
              </div>
            </div>
          </form>
        </div>
        
        {/* Results area */}
        <div className="w-full">
          {/* Loading state */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-10">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">Searching for jobs...</p>
            </div>
          ) : (
            <>
              {/* Search stats and sorting info */}
              <div className="flex flex-wrap justify-between items-center mb-4">
                <div>
                  {hasSearched && (
                    <p className="text-gray-600">
                      Found <span className="font-semibold">{totalJobs}</span> jobs
                      {query && <span> matching <span className="font-semibold">"{query}"</span></span>}
                      {location && <span> in <span className="font-semibold">{location}</span></span>}
                    </p>
                  )}
                </div>
                
                {/* Sort indicator */}
                <div className="flex items-center text-sm text-gray-600 mt-2 sm:mt-0">
                  <FiClock className="mr-1" /> 
                  <span>Sorted by newest first</span>
                </div>
              </div>
              
              {/* Error display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                        <button 
                          onClick={handleRetry}
                          className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded transition"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* No results message */}
              {hasSearched && jobs.length === 0 && !error && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">No jobs found matching your criteria.</p>
                  <button
                    onClick={resetSearch}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md inline-flex items-center"
                  >
                    <FiSearch className="mr-2" /> Show all jobs
                  </button>
                </div>
              )}
              
              {/* Job listings grid */}
              {jobs.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Export the page component with Suspense
export default function JobsPage() {
  return (
    <Suspense fallback={<JobsPageLoading />}>
      <JobsPageContent />
    </Suspense>
  );
} 