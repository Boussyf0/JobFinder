'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { FiAward, FiBarChart2, FiCheckCircle, FiFileText, FiSearch } from 'react-icons/fi';
import JobCard from '../components/JobCard';
import { JobListing, searchJobs } from '../lib/api';

// Inline FeaturedJobs component
function FeaturedJobs() {
  const [featuredJobs, setFeaturedJobs] = useState<JobListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch featured jobs on component mount
  useEffect(() => {
    const fetchFeaturedJobs = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('FeaturedJobs: Fetching jobs from API...');
        const jobs = await searchJobs({ 
          limit: 3,
          sortByDate: true // Sort by date, newest first
        });
        console.log('FeaturedJobs: Received jobs:', jobs);
        
        if (jobs.length === 0) {
          console.warn('FeaturedJobs: No jobs returned from API');
          setError('No jobs available. Data may be static mock data.');
        }
        
        setFeaturedJobs(jobs);
      } catch (error) {
        console.error('FeaturedJobs: Error fetching jobs:', error);
        setError('Error loading jobs. Check console for details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedJobs();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array(3).fill(null).map((_, index) => (
          <div key={index} className="card p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="h-20 bg-gray-200 rounded mb-4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <p className="text-yellow-700">{error}</p>
        <p className="text-sm text-yellow-600 mt-2">Try refreshing the browser or check if the API server is running.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {featuredJobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [moroccoOnly, setMoroccoOnly] = useState(false);

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/jobs?query=${encodeURIComponent(searchQuery)}&remote=${remoteOnly}&moroccoOnly=${moroccoOnly}`);
  };

  const features = [
    {
      icon: <FiSearch className="text-4xl text-primary-500" />,
      title: 'AI-Powered Job Search',
      description: 'Find the most relevant jobs using our advanced semantic search technology.'
    },
    {
      icon: <FiBarChart2 className="text-4xl text-primary-500" />,
      title: 'Salary Insights',
      description: 'Get accurate salary predictions based on global job market data.'
    },
    {
      icon: <FiFileText className="text-4xl text-primary-500" />,
      title: 'Resume Matcher',
      description: 'See how well your resume matches with job requirements and get improvement suggestions.'
    },
    {
      icon: <FiAward className="text-4xl text-primary-500" />,
      title: 'Skills Analyzer',
      description: 'Discover the most in-demand skills for your desired role and where to learn them.'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-700 to-primary-500 text-white py-20">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl md:text-5xl font-bold mb-4"
              >
                Find Your Dream Tech Job Worldwide
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-xl mb-8"
              >
                Discover opportunities with AI-powered search and insights based on global job market data
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <form onSubmit={handleSearch} className="bg-white rounded-lg p-2 shadow-lg">
                  <div className="flex flex-col md:flex-row">
                    <div className="flex-grow p-1">
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-3 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full py-2 pl-10 pr-4 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Job title, skills, or keywords"
                        />
                      </div>
                    </div>
                    <div className="p-1">
                      <button type="submit" className="w-full md:w-auto px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                        Search
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap p-1 mt-2">
                    <div className="flex items-center mr-4">
                      <input
                        type="checkbox"
                        id="remoteOnly"
                        checked={remoteOnly}
                        onChange={() => setRemoteOnly(!remoteOnly)}
                        className="mr-2"
                      />
                      <label htmlFor="remoteOnly" className="text-gray-700 text-sm">Remote Only</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="moroccoOnly"
                        checked={moroccoOnly}
                        onChange={() => setMoroccoOnly(!moroccoOnly)}
                        className="mr-2"
                      />
                      <label htmlFor="moroccoOnly" className="text-gray-700 text-sm">Morocco Relevant</label>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="hidden lg:block"
            >
              <img 
                src="https://via.placeholder.com/600x400?text=Job+Search+Illustration" 
                alt="Job Search" 
                className="rounded-lg shadow-xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Discover Our Features</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tools and insights to help you navigate the global job market effectively
            </p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={itemVariants} className="card p-6 flex flex-col items-center text-center">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Jobs Section */}
      <section className="py-16">
        <div className="container-custom">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Featured Jobs</h2>
            <Link href="/jobs" className="text-primary-600 hover:text-primary-700 font-medium flex items-center">
              View all jobs <FiSearch className="ml-1" />
            </Link>
          </div>

          <Suspense fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(3).fill(null).map((_, index) => (
                <div key={index} className="card p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="h-20 bg-gray-200 rounded mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          }>
            <FeaturedJobs />
          </Suspense>
        </div>
      </section>

      {/* AI-Powered Tools Section */}
      <section className="py-16 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">AI-Powered Resume Matching</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our intelligent algorithm matches your resume with the perfect job opportunities
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg shadow-lg overflow-hidden max-w-3xl mx-auto"
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-primary-100 rounded-full">
                  <FiFileText className="text-2xl text-primary-600" />
                </div>
                <h3 className="text-2xl font-bold ml-4">Resume Matcher</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Upload your resume and our AI will analyze your skills, experience, and qualifications to match you with the most relevant job opportunities. Get personalized job recommendations based on your unique profile.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                  <span>AI-powered skill extraction and analysis</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                  <span>Personalized job matching algorithm</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                  <span>Detailed match score with each job listing</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                  <span>Skip manual job hunting - let AI find the perfect match</span>
                </li>
              </ul>
              <Link 
                href="/resume-matcher" 
                className="w-full block text-center py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                Try Resume Matcher
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-primary-50">
        <div className="container-custom">
          <div className="bg-white rounded-lg shadow-xl p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to Find Your Next Opportunity?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Our AI-powered platform helps you discover job opportunities that match your skills and career goals. Upload your resume to get started!
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link href="/resume-matcher" className="btn btn-primary px-8 py-3 text-lg">
                Upload Your Resume
              </Link>
              <Link href="/jobs" className="btn btn-secondary px-8 py-3 text-lg">
                Browse All Jobs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 