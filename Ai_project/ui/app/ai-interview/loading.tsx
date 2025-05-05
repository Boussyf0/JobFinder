export default function AIInterviewLoading() {
  return (
    <div className="container-custom py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-5 bg-gray-200 rounded w-80"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
      
      <div className="mb-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-2 bg-gray-200 rounded-full w-full"></div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-8 mb-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-6"></div>
        
        <div className="flex items-center mb-6">
          <div className="h-10 w-10 bg-gray-200 rounded-full mr-3"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
        
        <div className="mb-6">
          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-32 bg-gray-200 rounded w-full"></div>
        </div>
        
        <div className="flex justify-between">
          <div className="h-10 bg-gray-200 rounded w-28"></div>
          <div className="h-10 bg-gray-200 rounded w-28"></div>
        </div>
      </div>
      
      <div className="bg-gray-200 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-full"></div>
          <div className="h-4 bg-gray-300 rounded w-5/6"></div>
          <div className="h-4 bg-gray-300 rounded w-4/6"></div>
          <div className="h-4 bg-gray-300 rounded w-5/6"></div>
          <div className="h-4 bg-gray-300 rounded w-3/6"></div>
        </div>
      </div>
    </div>
  );
} 