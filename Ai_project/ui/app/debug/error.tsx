'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FiAlertCircle, FiRefreshCw, FiHome, FiCode } from 'react-icons/fi';

export default function DebugError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console in development
    console.error('Debug page error:', error);
  }, [error]);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Debug Error</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex items-center mb-4">
          <FiAlertCircle className="text-red-600 w-6 h-6 mr-2" />
          <h2 className="text-xl font-semibold">An error occurred in the debug page</h2>
        </div>
        
        <p className="text-gray-600 mb-6">
          The debug tools encountered an error. This might be due to API connection issues or missing components.
        </p>
        
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-primary-600 text-white rounded-md font-medium flex items-center hover:bg-primary-700"
          >
            <FiRefreshCw className="mr-2" />
            Try again
          </button>
          
          <Link
            href="/jobs"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium flex items-center hover:bg-gray-300"
          >
            <FiHome className="mr-2" />
            Back to jobs
          </Link>
          
          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium flex items-center hover:bg-gray-300"
          >
            <FiHome className="mr-2" />
            Back to home
          </Link>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center mb-3">
            <FiCode className="text-white mr-2" />
            <h3 className="text-lg text-white font-medium">Error Details</h3>
          </div>
          <div className="bg-gray-900 p-4 rounded overflow-auto">
            <pre className="text-red-400 text-sm whitespace-pre-wrap">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </div>
        </div>
      </div>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <FiAlertCircle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              If you're seeing API connection errors, make sure the backend API server is running at
              <code className="mx-1 px-2 py-1 bg-yellow-100 rounded font-mono">http://localhost:8082</code>
            </p>
            <p className="mb-2">
              Run the API server with: <br />
              <code className="mx-1 px-2 py-1 bg-gray-800 text-white rounded font-mono">
                cd Scraping && python api.py --port 8082
              </code>
            </p>
            <p className="mb-2">
              The API server should be running on: <br />
              <code className="mx-1 px-2 py-1 bg-yellow-100 rounded font-mono">http://localhost:8082</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 