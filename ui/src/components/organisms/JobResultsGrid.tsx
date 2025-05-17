import React from 'react';
import { SearchResultsSkeleton } from '@/components/atoms/Skeleton';
import JobCard from '@/components/molecules/JobCard';
import Button from '@/components/atoms/Button';
import { Job, SearchResult } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface JobResultsGridProps {
  searchResult: SearchResult | null;
  isLoading: boolean;
  onSaveJob?: (jobId: string) => void;
  onUnsaveJob?: (jobId: string) => void;
  onPageChange?: (page: number) => void;
}

export default function JobResultsGrid({
  searchResult,
  isLoading,
  onSaveJob,
  onUnsaveJob,
  onPageChange,
}: JobResultsGridProps) {
  if (isLoading) {
    return <SearchResultsSkeleton count={5} />;
  }

  if (!searchResult || searchResult.results.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">No jobs found</h3>
        <p className="mt-2 text-sm text-gray-600">
          Try adjusting your search filters or search terms.
        </p>
      </div>
    );
  }

  const { results, total, page, limit, total_pages } = searchResult;

  return (
    <div>
      <div className="mb-4 text-sm text-gray-500">
        {total > 0 ? (
          <span>
            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total} jobs
          </span>
        ) : (
          <span>No jobs found</span>
        )}
      </div>
      
      <div className="space-y-4">
        {results.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onSaveJob={onSaveJob}
            onUnsaveJob={onUnsaveJob}
          />
        ))}
      </div>
      
      {total_pages > 1 && (
        <div className="mt-8 flex justify-center">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              leftIcon={<ChevronLeft size={16} />}
              aria-label="Previous page"
            >
              Prev
            </Button>
            
            <div className="flex items-center">
              {Array.from({ length: Math.min(5, total_pages) }, (_, i) => {
                // Show pages around the current page
                let pageNum = page;
                if (page < 3) {
                  pageNum = i + 1;
                } else if (page > total_pages - 2) {
                  pageNum = total_pages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                // Make sure we don't go beyond bounds
                if (pageNum <= 0 || pageNum > total_pages) {
                  return null;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange?.(pageNum)}
                    className="mx-1 min-w-[40px]"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              {total_pages > 5 && page < total_pages - 2 && (
                <>
                  <span className="mx-1">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(total_pages)}
                    className="mx-1 min-w-[40px]"
                  >
                    {total_pages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= total_pages}
              rightIcon={<ChevronRight size={16} />}
              aria-label="Next page"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 