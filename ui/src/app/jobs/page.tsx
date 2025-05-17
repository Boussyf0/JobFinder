'use client';

import React, { Suspense } from 'react';
import JobSearchContent from './JobSearchContent';

// Loading component for Suspense fallback
function JobsPageLoader() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Find Jobs</h1>
            <p className="text-gray-600 mt-1">Loading job search...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 lg:col-span-3">
            <div className="animate-pulse bg-white p-6 rounded-lg shadow-sm h-96"></div>
          </div>
          <div className="md:col-span-8 lg:col-span-9">
            <div className="animate-pulse bg-white p-6 rounded-lg shadow-sm h-96"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function JobsPage() {
  return (
    <Suspense fallback={<JobsPageLoader />}>
      <JobSearchContent />
    </Suspense>
  );
} 