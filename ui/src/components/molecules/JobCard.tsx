import React from 'react';
import Link from 'next/link';
import { Briefcase, MapPin, Clock, Building, Heart, ExternalLink } from 'lucide-react';
import Badge from '@/components/atoms/Badge';
import Button from '@/components/atoms/Button';
import { Job } from '@/types';
import { formatDate, formatLocation, truncateText } from '@/lib/utils';

interface JobCardProps {
  job: Job;
  onSaveJob?: (jobId: string) => void;
  onUnsaveJob?: (jobId: string) => void;
  className?: string;
  showActions?: boolean;
}

export default function JobCard({
  job,
  onSaveJob,
  onUnsaveJob,
  className = '',
  showActions = true,
}: JobCardProps) {
  const {
    id,
    title,
    company,
    location,
    description,
    posted_date,
    remote,
    salary,
    category,
    is_saved,
  } = job;

  const handleSaveToggle = () => {
    if (is_saved && onUnsaveJob) {
      onUnsaveJob(id);
    } else if (!is_saved && onSaveJob) {
      onSaveJob(id);
    }
  };

  return (
    <div className={`glass-card hover-lift rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg ${className}`}>
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <Link href={`/jobs/${id}`} className="inline-block group">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                {title}
              </h3>
            </Link>
            <div className="flex items-center mt-1 text-gray-600">
              <Building size={16} className="mr-1 text-gray-400" />
              <span className="text-sm">{company}</span>
            </div>
          </div>
          
          {showActions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveToggle}
              aria-label={is_saved ? "Unsave job" : "Save job"}
              className={`text-gray-500 hover:text-indigo-600 ${is_saved ? 'text-red-500' : ''}`}
              leftIcon={
                <Heart
                  size={18}
                  className={is_saved ? "fill-red-500 text-red-500" : ""}
                />
              }
            />
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3">
          <div className="flex items-center text-sm text-gray-500">
            <MapPin size={14} className="mr-1 text-gray-400" />
            <span>{formatLocation(location)}</span>
          </div>
          {remote && (
            <Badge variant="success" size="sm" rounded withShadow>
              Remote
            </Badge>
          )}
          {posted_date && (
            <div className="flex items-center text-sm text-gray-500">
              <Clock size={14} className="mr-1 text-gray-400" />
              <span>{formatDate(posted_date)}</span>
            </div>
          )}
          {category && (
            <Badge variant="info" size="sm" rounded withShadow>
              {category}
            </Badge>
          )}
        </div>
        
        <p className="mt-3 text-sm text-gray-600">
          {truncateText(description, 150)}
        </p>
        
        <div className="flex items-center justify-between mt-4">
          {salary && (
            <div className="text-sm font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
              {salary}
            </div>
          )}
          
          <div className="flex gap-2">
            {showActions && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  as={Link}
                  href={`/jobs/${id}`}
                  className="text-sm"
                  animated
                >
                  View Details
                </Button>
                
                {job.url && (
                  <Button
                    variant="gradient"
                    size="sm"
                    as="a"
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm"
                    rightIcon={<ExternalLink size={14} />}
                    animated
                  >
                    Apply
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 