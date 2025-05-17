import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const JobDetails = dynamic(() => import('./JobDetails'), {
  loading: () => <div className="text-center p-8">Loading job details...</div>
});

export default async function JobDetailsPage({ params }: { params: { id: string } }) {
  const id = params.id;
  
  return (
    <Suspense fallback={<div className="text-center p-8">Loading job details...</div>}>
      <JobDetails id={id} />
    </Suspense>
  );
} 