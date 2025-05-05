'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Local LLM test page error:', error);
  }, [error]);

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6 flex space-x-4 items-center">
        <Link href="/debug" className="text-blue-600 hover:text-blue-800">
          ← Back to Debug
        </Link>
        <span className="text-gray-400">|</span>
        <Link href="/" className="text-blue-600 hover:text-blue-800">
          Home
        </Link>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-red-500 p-4">
          <h1 className="text-white text-2xl font-bold">Error Loading Local LLM Test Page</h1>
        </div>
        
        <div className="p-6">
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <h2 className="text-red-800 font-semibold text-lg mb-2">Error Details</h2>
            <p className="text-red-700 font-mono text-sm">{error.message || 'Unknown error occurred'}</p>
            {error.digest && (
              <p className="text-gray-500 text-xs mt-2">Error ID: {error.digest}</p>
            )}
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Troubleshooting Steps</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                <strong>Restart the Next.js server</strong> - Run the following commands in your terminal:
                <pre className="bg-gray-100 p-2 mt-1 rounded-md text-sm overflow-auto">
                  pkill -f "next dev"<br />
                  cd /path/to/project/ui<br />
                  npm run dev
                </pre>
              </li>
              <li>
                <strong>Try alternative URLs</strong> - Sometimes the app directory structure can cause routing issues:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li><a href="/debug/local-llm-test" className="text-blue-600 hover:underline">/debug/local-llm-test</a></li>
                  <li><a href="/app/debug/local-llm-test" className="text-blue-600 hover:underline">/app/debug/local-llm-test</a></li>
                </ul>
              </li>
              <li>
                <strong>Check browser console</strong> - Open your browser's developer tools (F12) to check for any errors.
              </li>
              <li>
                <strong>Direct Access Link</strong> - Try the direct access HTML page we created:
                <div className="mt-1">
                  <a href="/llm-test-link.html" className="text-blue-600 hover:underline">/llm-test-link.html</a>
                </div>
              </li>
              <li>
                <strong>Check build configuration</strong> - Make sure your Next.js routing configuration is correct.
              </li>
            </ol>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
            <Link 
              href="/debug"
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Return to Debug Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 