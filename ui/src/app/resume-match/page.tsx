'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Upload, FileText, Briefcase, X, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { ResumeMatch } from '@/types';
import Button from '@/components/atoms/Button';

// Loading fallback component
function ResumeMatchLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
        <p className="mt-4 text-lg text-gray-700">Loading resume matcher...</p>
      </div>
    </div>
  );
}

// Main resume match component that uses the search params
function ResumeMatchContent() {
  const searchParams = useSearchParams();
  const preselectedJobId = searchParams.get('preselectedJob');
  
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [matchResults, setMatchResults] = useState<ResumeMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [preselectedJob, setPreselectedJob] = useState<any>(null);
  const [loadingPreselectedJob, setLoadingPreselectedJob] = useState(false);

  // Load preselected job data if a job ID is provided in the URL
  useEffect(() => {
    if (preselectedJobId) {
      fetchPreselectedJob(preselectedJobId);
    }
  }, [preselectedJobId]);

  const fetchPreselectedJob = async (jobId: string) => {
    try {
      setLoadingPreselectedJob(true);
      const result = await api.getJobDetails(jobId);
      if (result && result.job && !result.error) {
        setPreselectedJob(result.job);
      }
    } catch (err) {
      console.error('Error fetching preselected job:', err);
    } finally {
      setLoadingPreselectedJob(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const uploadedFile = e.dataTransfer.files[0];
      handleFileChange(uploadedFile);
    }
  };

  const handleFileChange = (uploadedFile: File) => {
    // Check if file is PDF or DOCX
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!validTypes.includes(uploadedFile.type)) {
      setError('Please upload a PDF or DOCX file');
      return;
    }
    
    // Check file size (max 5MB)
    if (uploadedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB');
      return;
    }
    
    setFile(uploadedFile);
    setError(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileChange(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please upload a resume file');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      const result = await api.matchResume(file);
      
      if (result && result.matches && result.matches.length > 0) {
        // If we have a preselected job, put it at the top of the results
        if (preselectedJob) {
          const matches = [...result.matches];
          const preselectedIndex = matches.findIndex(match => match.job.id === preselectedJobId);
          
          if (preselectedIndex > 0) {
            // Move the preselected job to the top
            const [preselectedMatch] = matches.splice(preselectedIndex, 1);
            matches.unshift(preselectedMatch);
          }
          
          setMatchResults(matches);
        } else {
          setMatchResults(result.matches);
        }
        setUploadSuccess(true);
      } else {
        setError('No matching jobs found. Please try a different resume.');
      }
    } catch (err: any) {
      console.error('Resume upload error:', err);
      if (err.status === 405) {
        setError('Server error: Method not allowed. The API endpoint may not be properly configured.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to match resume. Please try again later.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const getFileTypeIcon = () => {
    if (!file) return null;
    
    if (file.type === 'application/pdf') {
      return <FileText className="text-red-500" size={24} />;
    } else {
      return <FileText className="text-blue-500" size={24} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Resume Match</h1>
          <p className="mt-2 text-lg text-gray-600">
            Upload your resume to find jobs that match your skills and experience
            {preselectedJob && ` - specifically for "${preselectedJob.title}"`}
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 sm:p-8">
            {preselectedJob && (
              <div className="mb-6 p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Selected Job:</h2>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{preselectedJob.title}</h3>
                    <p className="text-sm text-gray-600">{preselectedJob.company} • {preselectedJob.location}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.history.pushState({}, '', '/resume-match')}
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              {!uploadSuccess ? (
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
                    isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
                  } ${error ? 'border-red-300' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {!file ? (
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4 flex text-sm text-gray-600 justify-center">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept=".pdf,.docx"
                            onChange={handleFileInputChange}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PDF or DOCX up to 5MB</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getFileTypeIcon()}
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-500"
                        onClick={removeFile}
                      >
                        <X size={20} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        Resume uploaded successfully!
                      </p>
                    </div>
                    <div className="ml-auto pl-3">
                      <div className="-mx-1.5 -my-1.5">
                        <button
                          type="button"
                          className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100"
                          onClick={removeFile}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="mt-4 bg-red-50 p-4 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-6">
                <Button 
                  type="submit"
                  variant="primary"
                  fullWidth
                  size="lg"
                  isLoading={isUploading}
                  disabled={!file || isUploading}
                >
                  {isUploading ? 'Analyzing Resume...' : 'Find Matching Jobs'}
                </Button>
              </div>
            </form>
          </div>
        </div>
        
        {/* Results Section */}
        {matchResults.length > 0 && (
          <div className="mt-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Matching Jobs</h2>
            <div className="space-y-6">
              {matchResults.map((match) => (
                <div key={match.job.id} className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{match.job.title}</h3>
                        <p className="text-gray-600">{match.job.company}</p>
                        <div className="flex items-center mt-2 text-gray-500">
                          <Briefcase size={18} className="mr-1" />
                          <span>{match.job.location}{match.job.remote ? ' (Remote)' : ''}</span>
                        </div>
                      </div>
                      <div className="bg-indigo-100 text-indigo-800 font-bold rounded-full px-3 py-1 text-sm">
                        {Math.round(match.match_score * 100)}% Match
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Matching Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {match.matching_skills.map((skill, index) => (
                          <span 
                            key={index} 
                            className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {match.missing_skills.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-gray-700 mb-2">Skills to Develop</h4>
                        <div className="flex flex-wrap gap-2">
                          {match.missing_skills.map((skill, index) => (
                            <span 
                              key={index} 
                              className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-6">
                      <a 
                        href={`/jobs/${match.job.id}`} 
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        View Job Details →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResumeMatchPage() {
  return (
    <Suspense fallback={<ResumeMatchLoading />}>
      <ResumeMatchContent />
    </Suspense>
  );
} 