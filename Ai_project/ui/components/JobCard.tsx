'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMapPin, FiDollarSign, FiBriefcase, FiClock, FiBookmark, FiWifi, FiInfo } from 'react-icons/fi';
import { JobListing } from '@/lib/api';
import { formatDistanceToNow, isToday, isYesterday, isFuture, format, differenceInDays } from 'date-fns';
import { useState } from 'react';

interface JobCardProps {
  job: JobListing;
  compact?: boolean;
}

const JobCard = ({ job, compact = false }: JobCardProps) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const toggleSaveJob = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSaved(!isSaved);
    // Here you would also call API to save/unsave job
  };
  
  const formatSalary = () => {
    if (job.salary) return job.salary;
    if (job.salaryMin && job.salaryMax) {
      return `${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()} MAD`;
    }
    if (job.salary_min && job.salary_max) {
      return `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()} MAD`;
    }
    return 'Salary not specified';
  };

  // Helper function to check if a job is new (posted within last 7 days)
  const isNewJob = (dateString?: string) => {
    if (!dateString) return false;
    try {
      const date = new Date(dateString);
      const today = new Date();
      return differenceInDays(today, date) <= 7;
    } catch (error) {
      return false;
    }
  };

  // Helper function to check if a job is very new (posted today, yesterday or in future)
  const isVeryNewJob = (dateString?: string) => {
    if (!dateString) return false;
    try {
      const date = new Date(dateString);
      return isToday(date) || isYesterday(date) || isFuture(date);
    } catch (error) {
      return false;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      // Handle current/future dates specially to highlight new jobs
      if (isFuture(date)) {
        return 'New!';
      }
      
      // Special formatting for very recent dates
      if (isToday(date)) {
        return 'Today';
      }
      
      if (isYesterday(date)) {
        return 'Yesterday';
      }
      
      // For other dates, use formatDistanceToNow
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const cardVariants = {
    hover: {
      y: -5,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <motion.div 
      className="card overflow-hidden relative"
      variants={cardVariants}
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {isVeryNewJob(job.postedAt) && (
        <div className="absolute top-0 right-0">
          <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-md shadow-sm">
            NEW
          </div>
        </div>
      )}
      
      <Link href={`/jobs/${job.id}`} className="block h-full">
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 hover:text-primary-600 transition-colors mb-1">
                {job.title}
              </h3>
              <p className="text-gray-700 font-medium">{job.company}</p>
            </div>
            <button 
              onClick={toggleSaveJob}
              className={`p-2 rounded-full ${isSaved ? 'text-primary-500 bg-primary-50' : 'text-gray-400 hover:text-primary-500 hover:bg-primary-50'} transition-colors`}
              title={isSaved ? "Remove from saved jobs" : "Save job"}
            >
              <FiBookmark className={isSaved ? 'fill-current' : ''} />
            </button>
          </div>

          {!compact && (
            <p className="text-gray-600 mb-4 line-clamp-2">
              {job.description?.replace(/<[^>]*>?/gm, '').substring(0, 120)}
              {job.description && job.description.length > 120 ? '...' : ''}
            </p>
          )}
          
          <div className="mt-auto">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="flex items-center text-gray-600">
                <FiMapPin className="mr-1 text-gray-400" />
                <span className="text-sm truncate">{job.location || 'Unknown location'}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <FiBriefcase className="mr-1 text-gray-400" />
                <span className="text-sm truncate">{job.jobType || 'Not specified'}</span>
                {job.inferredType && (
                  <span className="ml-2 text-xs text-amber-600 flex items-center">
                    <FiInfo className="mr-1" />
                    Inferred
                  </span>
                )}
              </div>
              <div className="flex items-center text-gray-600">
                <FiDollarSign className="mr-1 text-gray-400" />
                <span className="text-sm truncate">{formatSalary()}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <FiClock className="mr-1 text-gray-400" />
                <span className={`text-sm truncate ${isNewJob(job.postedAt) ? 'font-semibold text-green-600' : ''}`}>
                  {formatDate(job.postedAt)}
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {job.remote && (
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                  Remote
                </span>
              )}
              
              {job.skills && job.skills.slice(0, 3).map((skill, index) => (
                <span key={index} className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded">
                  {skill}
                </span>
              ))}
              
              {job.skills && job.skills.length > 3 && (
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                  +{job.skills.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default JobCard; 