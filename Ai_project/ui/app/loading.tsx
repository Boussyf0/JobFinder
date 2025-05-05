export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading</h2>
        <p className="text-gray-500">Please wait while we load your content...</p>
      </div>
    </div>
  );
} 