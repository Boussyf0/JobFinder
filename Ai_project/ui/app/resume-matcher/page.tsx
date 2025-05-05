'use client';

import { useState } from 'react';
import { FiUpload, FiFileText, FiCheckCircle, FiAlertCircle, FiMic } from 'react-icons/fi';
import JobCard from '@/components/JobCard';
import { JobListing } from '@/lib/api';
import Link from 'next/link';

export default function ResumeMatcherPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [matchedJobs, setMatchedJobs] = useState<JobListing[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [experience, setExperience] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) return;
    
    // Check file type
    const validTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a PDF, DOC, DOCX, or TXT file');
      return;
    }
    
    // Check file size (5MB max)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size should be less than 5MB');
      return;
    }
    
    setFile(selectedFile);
    setIsUploaded(true);
  };

  const analyzeResume = async () => {
    if (!file) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Read the file as base64
      const reader = new FileReader();
      
      const fileReadPromise = new Promise<string>((resolve, reject) => {
        reader.onload = (e) => {
          const base64Content = e.target?.result as string;
          // Remove data URL prefix if present
          const base64Data = base64Content.includes(',') 
            ? base64Content.split(',')[1] 
            : base64Content;
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        
        // Read the file as data URL (base64)
        reader.readAsDataURL(file);
      });
      
      const base64Content = await fileReadPromise;
      
      // Call the API directly to the Python backend
      console.log('Calling Python API directly');
      try {
        const response = await fetch('http://localhost:8083/api/resume/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resume: base64Content,
            file_type: file.type,
            limit: 10
          }),
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        // Parse the response as text first to pre-process NaN values
        const responseText = await response.text();
        
        // Parse the processed text as JSON
        const processedText = responseText.replace(/:\s*NaN\b/g, ': null');
        const data = JSON.parse(processedText);
        
        // Handle API response
        if (data.error) {
          throw new Error(data.error);
        }
        
        setSkills(data.skills || []);
        setMatchedJobs(data.jobs || []);
        setMatchScore(data.match_score || 0);
        setExperience(data.years_of_experience || 0);
      } catch (apiError) {
        console.error('API error:', apiError);
        throw apiError;
      }
      
    } catch (err) {
      console.error('Resume analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze resume');
      
      // Fallback to mock data for development purposes
      setSkills(['JavaScript', 'React', 'Node.js', 'TypeScript', 'Python', 'Data Analysis']);
      setMatchScore(85);
      
      // Try to use the search API as a fallback
      try {
        const fallbackResponse = await fetch('http://localhost:8083/api/jobs/search?query=software+developer&limit=5');
        const fallbackText = await fallbackResponse.text();
        const processedFallbackText = fallbackText.replace(/:\s*NaN\b/g, ': null');
        const fallbackData = JSON.parse(processedFallbackText);
        setMatchedJobs(fallbackData.jobs || []);
      } catch (fallbackErr) {
        console.error('Fallback search also failed:', fallbackErr);
        setMatchedJobs([]);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container-custom py-10">
      <h1 className="text-3xl font-bold mb-2">Resume Matcher</h1>
      <p className="text-gray-600 mb-6">
        Upload your resume to find jobs that match your skills and experience
      </p>
      
      <div className="grid md:grid-cols-[1fr_2fr] gap-8">
        {/* Upload section */}
        <div className="bg-white p-6 rounded-lg shadow-md h-fit">
          <h2 className="text-xl font-semibold mb-4">Upload Your Resume</h2>
          
          <div className="mb-6">
            <label 
              htmlFor="resume-upload" 
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer 
                ${isUploaded ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:bg-gray-50'}`}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isUploaded ? (
                  <div className="text-center">
                    <FiCheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-700 truncate max-w-[200px]">{file?.name}</p>
                    <p className="text-xs text-gray-500 mt-1">File uploaded successfully</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <FiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-700">Click to upload your resume</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, or TXT (max 5MB)</p>
                  </div>
                )}
              </div>
              <input 
                id="resume-upload" 
                type="file" 
                className="hidden" 
                accept=".pdf,.doc,.docx,.txt" 
                onChange={handleFileChange}
              />
            </label>
            
            {error && (
              <div className="mt-2 text-sm text-red-600 flex items-center">
                <FiAlertCircle className="mr-1" />
                {error}
              </div>
            )}
          </div>
          
          <button
            onClick={analyzeResume}
            disabled={!isUploaded || isAnalyzing}
            className={`w-full py-2 px-4 rounded-md transition-colors 
              ${!isUploaded || isAnalyzing ? 
                'bg-gray-300 text-gray-600 cursor-not-allowed' : 
                'bg-primary-600 hover:bg-primary-700 text-white'}`}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
          </button>
          
          {skills.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-medium mb-2">Skills Detected</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {experience !== null && (
            <div className="mt-4">
              <h3 className="text-md font-medium mb-1">Experience Level</h3>
              <p className="text-gray-700">{experience} years</p>
            </div>
          )}
        </div>
        
        {/* Results section */}
        <div>
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">Analyzing your resume and finding matching jobs...</p>
            </div>
          ) : matchedJobs.length > 0 ? (
            <div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-green-800">Resume Match Score: {matchScore}%</h3>
                    <p className="text-sm text-green-700">
                      Your resume matches well with the jobs below. Consider applying to these positions.
                    </p>
                  </div>
                  <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-green-700 font-bold">{matchScore}%</span>
                    </div>
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#E8F5E9"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#4CAF50"
                        strokeWidth="3"
                        strokeDasharray={`${matchScore}, 100`}
                      />
                    </svg>
                  </div>
                </div>
              </div>
              
              <h2 className="text-xl font-semibold mb-4">Jobs Matching Your Resume</h2>
              
              <div className="space-y-4">
                {matchedJobs.map((job) => (
                  <div key={job.id} className="relative">
                    <JobCard job={job} />
                    <div className="absolute top-4 right-4 flex space-x-2">
                      <Link
                        href={`/ai-interview?jobId=${job.id}&jobTitle=${encodeURIComponent(job.title)}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm flex items-center shadow-sm"
                      >
                        <FiMic className="mr-1" /> AI Interview
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isUploaded ? (
            <div className="flex flex-col items-center justify-center bg-white p-8 rounded-lg shadow-md text-center h-64">
              <FiFileText className="w-12 h-12 text-gray-400 mb-3" />
              <h3 className="text-xl font-bold mb-2">Ready to analyze</h3>
              <p className="text-gray-600">
                Click "Analyze Resume" to find jobs that match your skills and experience.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center bg-white p-8 rounded-lg shadow-md text-center h-64">
              <FiUpload className="w-12 h-12 text-gray-400 mb-3" />
              <h3 className="text-xl font-bold mb-2">Upload your resume</h3>
              <p className="text-gray-600">
                Upload your resume to get started. We'll analyze it and find matching job opportunities.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 