'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Filter } from 'lucide-react';
import SearchFilters from '@/components/organisms/SearchFilters';
import JobResultsGrid from '@/components/organisms/JobResultsGrid';
import Button from '@/components/atoms/Button';
import { api } from '@/lib/api';
import { SearchResult, SearchFilters as SearchFiltersType } from '@/types';

export default function JobSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Initialize filters from URL parameters
  const [filters, setFilters] = useState<SearchFiltersType>({
    query: searchParams.get('query') || '',
    location: searchParams.get('location') || '',
    remote: searchParams.get('remote') === 'true',
    categories: searchParams.has('category') ? [searchParams.get('category') as string] : [],
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '10', 10),
    sort: (searchParams.get('sort') as 'relevance' | 'date' | 'salary') || 'relevance',
  });
  
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  
  // Locations for suggestions
  const suggestedLocations = [
    'Casablanca, Morocco',
    'Rabat, Morocco',
    'Marrakech, Morocco',
    'Tangier, Morocco',
    'Fez, Morocco',
    'Agadir, Morocco',
    'Remote',
    'London, UK',
    'Paris, France',
    'New York, USA',
  ];
  
  const performSearch = async () => {
    setIsLoading(true);
    
    try {
      // Build search parameters
      const searchParams: Record<string, any> = {
        query: filters.query,
        location: filters.location,
        remote: filters.remote,
        page: filters.page,
        limit: filters.limit,
        sort: filters.sort,
      };
      
      if (filters.categories && filters.categories.length > 0) {
        searchParams.category = filters.categories[0];
      }
      
      // Update URL with search parameters
      const urlParams = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          urlParams.set(key, String(value));
        }
      });
      
      router.push(`/jobs?${urlParams.toString()}`);
      
      // Fetch search results from API
      const result = await api.searchJobs(searchParams);
      
      // Convert API result to match SearchResult type
      setSearchResult({
        results: result.results || [],
        total: result.total || 0,
        page: filters.page,
        limit: filters.limit,
        total_pages: Math.ceil((result.total || 0) / filters.limit)
      });
    } catch (error) {
      console.error('Error searching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Effect to perform search when component mounts or when page changes
  useEffect(() => {
    performSearch();
  }, [filters.page]);
  
  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    // Reset to page 1 when filters change
    if (newFilters.query !== filters.query || 
        newFilters.location !== filters.location || 
        newFilters.remote !== filters.remote || 
        newFilters.sort !== filters.sort) {
      newFilters.page = 1;
    }
    
    setFilters(newFilters);
  };
  
  const handleSearch = () => {
    performSearch();
  };
  
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };
  
  const handleSaveJob = async (jobId: string) => {
    try {
      await api.saveJob(jobId);
      // Update UI to reflect saved state
      if (searchResult) {
        setSearchResult({
          ...searchResult,
          results: searchResult.results.map(job => 
            job.id === jobId ? { ...job, is_saved: true } : job
          ),
        });
      }
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };
  
  const handleUnsaveJob = async (jobId: string) => {
    try {
      await api.unsaveJob(jobId);
      // Update UI to reflect unsaved state
      if (searchResult) {
        setSearchResult({
          ...searchResult,
          results: searchResult.results.map(job => 
            job.id === jobId ? { ...job, is_saved: false } : job
          ),
        });
      }
    } catch (error) {
      console.error('Error removing saved job:', error);
    }
  };
  
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };
  
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Find Jobs</h1>
            <p className="text-gray-600 mt-1">
              {searchResult?.total 
                ? `${searchResult.total} jobs found`
                : 'Search for your dream job'}
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFilters}
            className="md:hidden"
            leftIcon={<Filter size={16} />}
          >
            {showFilters ? 'Hide filters' : 'Show filters'}
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Filters sidebar */}
          <div className={`md:col-span-4 lg:col-span-3 ${!showFilters ? 'hidden md:block' : ''}`}>
            <SearchFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onSearch={handleSearch}
              isLoading={isLoading}
              suggestedLocations={suggestedLocations}
            />
          </div>
          
          {/* Job results */}
          <div className="md:col-span-8 lg:col-span-9">
            <JobResultsGrid
              searchResult={searchResult}
              isLoading={isLoading}
              onSaveJob={handleSaveJob}
              onUnsaveJob={handleUnsaveJob}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 