'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  FiArrowLeft, FiMapPin, FiDollarSign, FiBriefcase, FiClock, 
  FiBookmark, FiShare2, FiExternalLink, FiCheck, FiX, FiTrendingUp
} from 'react-icons/fi';
import { getJobDetails, JobListing, saveJob, unsaveJob } from '@/lib/api';
import JobCard from '@/components/JobCard';

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<JobListing | null>(null);
  const [similarJobs, setSimilarJobs] = useState<JobListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!params?.id) return;
      
      setIsLoading(true);
      try {
        const response = await getJobDetails(params?.id as string);
        setJob(response.job);
        setSimilarJobs(response.similarJobs || []);
      } catch (error) {
        console.error('Error fetching job details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobDetails();
  }, [params?.id]);

  const handleSaveJob = async () => {
    if (!job) return;
    
    try {
      let response;
      if (isSaved) {
        response = await unsaveJob(job.id);
      } else {
        response = await saveJob(job.id);
      }
      
      if (response.success) {
        setIsSaved(!isSaved);
      }
    } catch (error) {
      console.error('Error saving/unsaving job:', error);
    }
  };

  const handleApply = () => {
    setApplyModalOpen(true);
  };

  const handleShare = async () => {
    try {
      const shareUrl = window.location.href;
      if (navigator.share) {
        await navigator.share({
          title: job?.title || 'Job Listing',
          text: `Check out this job: ${job?.title} at ${job?.company}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatSalary = () => {
    if (!job) return 'Salary not specified';
    if (job.salary) return job.salary;
    if (job.salaryMin && job.salaryMax) {
      return `${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()} MAD`;
    }
    if (job.salary_min && job.salary_max) {
      return `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()} MAD`;
    }
    return 'Salary not specified';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <div className="container-custom py-10">
        <div className="bg-white rounded-lg shadow-md p-8 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
          </div>
          <div className="h-40 bg-gray-200 rounded mb-6"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container-custom py-10">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Job Not Found</h2>
          <p className="text-gray-600 mb-6">The job you're looking for doesn't exist or has been removed.</p>
          <Link href="/jobs" className="btn btn-primary">
            <FiArrowLeft className="mr-2" /> Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Top Navigation Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="container-custom py-4">
          <div className="flex justify-between items-center">
            <button 
              onClick={() => router.back()} 
              className="flex items-center text-gray-600 hover:text-primary-600 transition-colors"
            >
              <FiArrowLeft className="mr-2" /> Back to Jobs
            </button>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleSaveJob}
                className={`p-2 rounded-full ${isSaved ? 'text-primary-500 bg-primary-50' : 'text-gray-400 hover:text-primary-500 hover:bg-primary-50'} transition-colors`}
                title={isSaved ? "Remove from saved jobs" : "Save job"}
              >
                <FiBookmark className={isSaved ? 'fill-current' : ''} />
              </button>
              <button 
                onClick={handleShare}
                className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-full transition-colors"
                title="Share job"
              >
                <FiShare2 />
              </button>
              {copySuccess && (
                <span className="text-green-600 text-sm">Link copied!</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Job Details */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-lg shadow-md p-6 mb-6"
            >
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
                <p className="text-xl text-gray-700 mb-4">{job.company}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-6 mb-6">
                  <div className="flex items-center text-gray-600">
                    <FiMapPin className="mr-2 text-gray-400" />
                    <span>{job.location || 'Unknown location'}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FiBriefcase className="mr-2 text-gray-400" />
                    <span>{job.jobType || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FiDollarSign className="mr-2 text-gray-400" />
                    <span>{formatSalary()}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FiClock className="mr-2 text-gray-400" />
                    <span>{formatDate(job.postedAt)}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {job.remote && (
                    <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                      Remote
                    </span>
                  )}
                  
                  {job.skills && job.skills.map((skill, index) => (
                    <span key={index} className="px-3 py-1 text-sm font-medium bg-primary-100 text-primary-800 rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
                
                <div className="flex flex-col sm:flex-row sm:space-x-4">
                  <button 
                    onClick={handleApply}
                    className="btn btn-primary w-full sm:w-auto mb-3 sm:mb-0 py-3 flex justify-center items-center"
                  >
                    Apply Now <FiExternalLink className="ml-2" />
                  </button>
                  
                  <button 
                    onClick={handleSaveJob}
                    className={`btn w-full sm:w-auto py-3 flex justify-center items-center ${
                      isSaved 
                        ? 'bg-primary-50 text-primary-600 border border-primary-200' 
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <FiBookmark className="mr-2 fill-current" /> Saved
                      </>
                    ) : (
                      <>
                        <FiBookmark className="mr-2" /> Save Job
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-xl font-semibold mb-4">Job Description</h2>
                <div 
                  className="prose prose-blue max-w-none"
                  dangerouslySetInnerHTML={{ __html: job.description || 'No description provided.' }}
                />
              </div>
            </motion.div>
            
            {/* Company Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-lg shadow-md p-6 mb-6"
            >
              <h2 className="text-xl font-semibold mb-4">About the Company</h2>
              <p className="text-gray-700 mb-4">
                {job.company} is a leading company in the field of {job.category || 'technology'}.
              </p>
              <a 
                href={job.url || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 font-medium flex items-center"
              >
                Visit Website <FiExternalLink className="ml-1" />
              </a>
            </motion.div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Job Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-lg shadow-md p-6 mb-6"
            >
              <h2 className="text-xl font-semibold mb-4">Job Summary</h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="bg-primary-100 p-2 rounded-full mr-3">
                    <FiBriefcase className="text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Job Type</h3>
                    <p className="text-gray-600">{job.jobType || 'Not specified'}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="bg-primary-100 p-2 rounded-full mr-3">
                    <FiDollarSign className="text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Salary Range</h3>
                    <p className="text-gray-600">{formatSalary()}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="bg-primary-100 p-2 rounded-full mr-3">
                    <FiMapPin className="text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Location</h3>
                    <p className="text-gray-600">{job.location || 'Unknown location'}</p>
                    {job.remote && <p className="text-green-600 text-sm">Remote work available</p>}
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="bg-primary-100 p-2 rounded-full mr-3">
                    <FiClock className="text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Posted Date</h3>
                    <p className="text-gray-600">{formatDate(job.postedAt)}</p>
                  </div>
                </li>
              </ul>
            </motion.div>
            
            {/* Similar Jobs */}
            {similarJobs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <h2 className="text-xl font-semibold mb-4">Similar Jobs</h2>
                <div className="space-y-4">
                  {similarJobs.map((similarJob) => (
                    <JobCard key={similarJob.id} job={similarJob} compact />
                  ))}
                </div>
                <div className="mt-4">
                  <Link href="/jobs" className="text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center">
                    View More Jobs <FiArrowLeft className="ml-1 rotate-180" />
                  </Link>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      
      {/* Apply Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setApplyModalOpen(false)}></div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full z-10 relative"
          >
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              onClick={() => setApplyModalOpen(false)}
            >
              <FiX />
            </button>
            
            <h2 className="text-2xl font-bold mb-4">Apply for this Job</h2>
            <p className="text-gray-600 mb-6">
              You are about to apply for <strong>{job.title}</strong> at <strong>{job.company}</strong>.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-gray-700 mb-2">Upload your Resume/CV</label>
                <div className="border border-dashed border-gray-300 rounded-md p-4 text-center">
                  <input type="file" className="hidden" id="resume" />
                  <label htmlFor="resume" className="cursor-pointer text-primary-600 font-medium">
                    Choose File
                  </label>
                  <p className="text-sm text-gray-500 mt-1">PDF, DOCX, or TXT (Max 5MB)</p>
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Cover Letter (Optional)</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={4}
                  placeholder="Why are you a good fit for this role?"
                ></textarea>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="btn btn-primary flex-1 flex justify-center items-center"
                onClick={() => {
                  // Handle application submission
                  alert("Application submitted! (This is a mock action)");
                  setApplyModalOpen(false);
                }}
              >
                <FiCheck className="mr-2" /> Submit Application
              </button>
              <button
                className="btn btn-secondary flex-1"
                onClick={() => setApplyModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
} 