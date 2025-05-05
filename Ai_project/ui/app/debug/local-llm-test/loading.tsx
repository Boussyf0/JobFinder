import Link from 'next/link';

export default function Loading() {
  return (
    <div className="container mx-auto p-4">
      {/* Navigation Links */}
      <div className="mb-6 flex space-x-4 items-center">
        <Link href="/debug" className="text-blue-600 hover:text-blue-800">
          ← Back to Debug
        </Link>
        <span className="text-gray-400">|</span>
        <Link href="/" className="text-blue-600 hover:text-blue-800">
          Home
        </Link>
      </div>

      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        
        {/* LLM Status skeleton */}
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded w-1/5 mt-4"></div>
        </div>
        
        {/* Job Details skeleton */}
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
          
          <div className="mb-3">
            <div className="h-5 bg-gray-200 rounded w-1/5 mb-1"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
          
          <div className="mb-3">
            <div className="h-5 bg-gray-200 rounded w-1/5 mb-1"></div>
            <div className="h-24 bg-gray-200 rounded w-full"></div>
          </div>
          
          <div className="mb-3">
            <div className="h-5 bg-gray-200 rounded w-1/5 mb-1"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
        
        {/* Generate Questions skeleton */}
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded w-1/4 mb-4"></div>
        </div>
        
        {/* Answer Evaluation skeleton */}
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          
          <div className="mb-3">
            <div className="h-5 bg-gray-200 rounded w-1/5 mb-1"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
          
          <div className="mb-3">
            <div className="h-5 bg-gray-200 rounded w-1/5 mb-1"></div>
            <div className="h-32 bg-gray-200 rounded w-full"></div>
          </div>
          
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  );
} 