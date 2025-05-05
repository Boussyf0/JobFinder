'use client';

import { JobListing, searchJobs } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiArrowRight } from 'react-icons/fi';
import JobCard from './JobCard';

const FeaturedJobs = () => {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        // Fetch featured jobs with sortByDate=true to show newest jobs first
        const allJobs = await searchJobs({ 
          limit: 3,
          sortByDate: true 
        });
        setJobs(allJobs);
      } catch (error) {
        console.error('Error fetching featured jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  return (
    <section className="py-12 bg-gray-50">
      <div className="container-custom">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Featured Jobs</h2>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-md animate-pulse h-64">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : jobs.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/jobs"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
              >
                View all jobs
                <FiArrowRight className="ml-2" />
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500">No featured jobs available right now. Please check back later.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedJobs; 