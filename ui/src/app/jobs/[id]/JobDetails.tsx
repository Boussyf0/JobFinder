'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mic } from 'lucide-react';
import Button from '@/components/atoms/Button';
import { api } from '@/lib/api';

interface JobDetailsProps {
  id: string;
}

export default function JobDetails({ id }: JobDetailsProps) {
  const router = useRouter();
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchJobDetails = async () => {
      setIsLoading(true);
      try {
        const result = await api.getJobDetails(id);
        setJobDetails(result);
        if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        setError('Error loading job details');
        console.error('Error fetching job details:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchJobDetails();
  }, [id]);
  
  const handleBack = () => {
    router.back();
  };

  const startInterview = () => {
    const job = jobDetails?.job;
    if (job) {
      router.push(`/interview?jobId=${job.id}&jobTitle=${encodeURIComponent(job.title)}`);
    }
  };
  
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-6"
          leftIcon={<ArrowLeft size={16} />}
        >
          Back to search
        </Button>
        
        {isLoading ? (
          <div className="glass-card p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-8"></div>
              <div className="h-10 bg-gray-200 rounded w-40"></div>
            </div>
          </div>
        ) : error ? (
          <div className="glass-card p-8">
            <div className="text-center">
              <h2 className="text-xl font-bold text-red-500 mb-4">Error</h2>
              <p className="text-gray-700 mb-6">{error}</p>
              <Button variant="primary" onClick={handleBack}>Return to job search</Button>
            </div>
          </div>
        ) : jobDetails?.job ? (
          <>
            <div className="glass-card p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{jobDetails.job.title}</h1>
              <div className="text-lg text-gray-600 mb-6">
                {jobDetails.job.company} • {jobDetails.job.location}
              </div>
              
              {jobDetails.job.salary && (
                <div className="bg-gray-100 p-4 rounded-lg mb-6">
                  <div className="font-medium text-gray-900">Salary</div>
                  <div className="text-gray-700">{jobDetails.job.salary}</div>
                </div>
              )}
              
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Job Description</h2>
                <div className="text-gray-700 whitespace-pre-line">
                  {jobDetails.job.description}
                </div>
              </div>
              
              {jobDetails.job.skills && jobDetails.job.skills.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {jobDetails.job.skills.map((skill: string, index: number) => (
                      <span key={index} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-4 justify-between items-center mt-8">
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="primary"
                    onClick={() => window.open(jobDetails.job.url, '_blank')}
                  >
                    Apply Now
                  </Button>
                  
                  <Button
                    variant="secondary"
                    onClick={startInterview}
                    leftIcon={<Mic size={16} />}
                  >
                    Practice Interview
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    // Implement save job functionality
                    alert('Job saved functionality to be implemented');
                  }}
                >
                  Save Job
                </Button>
              </div>
            </div>
            
            <div className="mt-6 glass-card p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Prepare for this job</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="flex items-center justify-center text-left"
                  onClick={startInterview}
                >
                  <div className="mr-3">
                    <Mic size={24} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Practice Interview</h3>
                    <p className="text-sm text-gray-500">Get AI-generated interview questions and feedback</p>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex items-center justify-center text-left"
                  onClick={() => router.push(`/resume-match?preselectedJob=${id}`)}
                >
                  <div className="mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 w-6 h-6">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Check Resume Match</h3>
                    <p className="text-sm text-gray-500">See how your resume matches this job</p>
                  </div>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="glass-card p-8">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Job Not Found</h2>
              <p className="text-gray-700 mb-6">The job you're looking for doesn't exist or has been removed.</p>
              <Button variant="primary" onClick={handleBack}>Return to job search</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 