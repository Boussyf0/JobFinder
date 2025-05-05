export default function ResumeMatcherLoading() {
  return (
    <div className="container-custom py-10">
      <div className="h-10 w-1/3 bg-gray-200 rounded animate-pulse mb-4"></div>
      <div className="h-5 w-2/3 bg-gray-200 rounded animate-pulse mb-10"></div>
      
      <div className="grid md:grid-cols-[1fr_2fr] gap-8">
        {/* Upload section placeholder */}
        <div className="bg-white p-6 rounded-lg shadow-md h-80">
          <div className="h-7 w-1/2 bg-gray-200 rounded animate-pulse mb-6"></div>
          
          <div className="h-32 w-full border-2 border-dashed rounded-lg border-gray-300 mb-6">
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse mb-3"></div>
              <div className="h-4 w-36 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-3 w-48 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          
          <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        {/* Results section placeholder */}
        <div className="bg-white p-8 rounded-lg shadow-md h-80 flex flex-col items-center justify-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse mb-4"></div>
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-3"></div>
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
} 