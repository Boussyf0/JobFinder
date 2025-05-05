export default function DebugLoading() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">API Connection Debug</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Loading Debug Tools</h2>
        </div>
        
        <div className="flex flex-col items-center py-10">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-6"></div>
          <p className="text-lg text-gray-600">
            Initializing debug environment...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Testing API connections and gathering system information
          </p>
        </div>
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              The debug page is loading. This may take a moment while we test API connectivity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 