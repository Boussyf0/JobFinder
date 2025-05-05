import Link from 'next/link';
import { FiHome, FiSearch } from 'react-icons/fi';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-primary-600 mb-6">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-4 py-2 bg-primary-600 text-white rounded-md font-medium flex items-center justify-center hover:bg-primary-700"
          >
            <FiHome className="mr-2" />
            Back to home
          </Link>
          <Link
            href="/jobs"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium flex items-center justify-center hover:bg-gray-300"
          >
            <FiSearch className="mr-2" />
            Browse jobs
          </Link>
        </div>
      </div>
    </div>
  );
} 