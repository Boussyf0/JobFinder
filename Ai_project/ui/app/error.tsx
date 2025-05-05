'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FiAlertCircle, FiRefreshCw, FiHome } from 'react-icons/fi';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-50">
          <FiAlertCircle className="w-8 h-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">
          Something went wrong
        </h1>
        
        <p className="text-gray-600 text-center mb-6">
          We're sorry, but there was an error processing your request.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-primary-600 text-white rounded-md font-medium flex items-center justify-center hover:bg-primary-700"
          >
            <FiRefreshCw className="mr-2" />
            Try again
          </button>
          
          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium flex items-center justify-center hover:bg-gray-300"
          >
            <FiHome className="mr-2" />
            Back to home
          </Link>
        </div>
      </div>
      
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-6 bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-xl text-white font-semibold mb-4">Error Details</h2>
          <div className="bg-gray-900 p-4 rounded overflow-auto">
            <pre className="text-red-400 text-sm whitespace-pre-wrap">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
} 