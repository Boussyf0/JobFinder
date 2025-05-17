'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Search, MapPin, Briefcase, TrendingUp, Users, Building, ChevronDown } from 'lucide-react';
import Button from '@/components/atoms/Button';

export default function Home() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/bg-pattern.svg')] opacity-10"></div>
        <div className="absolute inset-0 bg-grid-white/[0.05]"></div>
        
        {/* Floating shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative z-10">
          <div className="text-center">
            <div className="inline-block animate-bounce-in">
              <span className="bg-white/20 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-sm font-medium mb-5 inline-block">
                Over 130,000 jobs available
              </span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              <span className="block">Find Your Dream Job</span>
              <span className="block mt-2 text-indigo-200">Build Your Career</span>
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-blue-100">
              Search from thousands of jobs worldwide. Find opportunities that match your skills
              and career aspirations.
            </p>
            <div className="mt-12 sm:mx-auto sm:max-w-xl lg:max-w-2xl">
              <div className="glass-card p-3 backdrop-blur-md shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="col-span-1 md:col-span-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Job title, skills or keywords"
                      className="block w-full pl-10 pr-3 py-3 rounded-md border-0 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Location"
                      className="block w-full pl-10 pr-3 py-3 rounded-md border-0 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 flex">
                  <Button
                    as={Link}
                    href="/jobs"
                    variant="gradient"
                    size="lg"
                    className="w-full justify-center"
                    leftIcon={<Search className="h-5 w-5" />}
                    animated
                  >
                    Search Jobs
                  </Button>
                </div>
              </div>
              <div className="mt-5">
                <p className="text-sm text-blue-100">
                  Popular searches: Software Engineer, Data Scientist, Marketing, Remote
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 120"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-16 md:h-24 fill-white"
            preserveAspectRatio="none"
          >
            <path d="M0 120L48 105C96 90 192 60 288 55C384 50 480 70 576 70C672 70 768 50 864 50C960 50 1056 70 1152 75C1248 80 1344 70 1392 65L1440 60V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0Z" />
          </svg>
        </div>
      </section>
      
      {/* Stats section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="glass-card p-6 rounded-xl hover-lift"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Featured Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Browse Jobs by Category</h2>
            <p className="mt-4 text-lg text-gray-600">
              Explore opportunities in various industries and sectors
            </p>
          </div>
          <div className="mt-12 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(isExpanded ? jobCategories : jobCategories.slice(0, 8)).map((category, index) => (
              <Link
                key={category.name}
                href={`/jobs?category=${category.slug}`}
                className="group hover-lift glass-card rounded-xl overflow-hidden border border-gray-100"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <category.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {category.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">{category.count} jobs available</p>
                </div>
              </Link>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            {jobCategories.length > 8 && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsExpanded(!isExpanded)}
                rightIcon={<ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
              >
                {isExpanded ? 'Show Less' : 'Show More Categories'}
              </Button>
            )}
          </div>
        </div>
      </section>
      
      {/* Feature Section */}
      <section className="py-16 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-50/[0.05]"></div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-100 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-30"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Why Choose JobHub</h2>
            <p className="mt-4 text-lg text-gray-600">
              Powerful features to help you find your perfect job
            </p>
          </div>
          <div className="mt-12 grid gap-8 grid-cols-1 md:grid-cols-3">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="glass-card rounded-xl p-6 hover-lift"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05]"></div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl font-bold text-white">Ready to find your dream job?</h2>
          <p className="mt-4 text-xl text-blue-100">
            Join thousands of job seekers who found their perfect career match on JobHub
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              as={Link}
              href="/jobs"
              variant="subtle-gradient"
              size="lg"
              className="min-w-[160px]"
              animated
            >
              Browse Jobs
            </Button>
            <Button
              as={Link}
              href="/upload-resume"
              variant="outline"
              size="lg"
              className="min-w-[160px] bg-transparent text-white border-white hover:bg-white hover:text-indigo-600"
              animated
            >
              Upload Your Resume
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Sample data for job categories
const jobCategories = [
  { name: 'Software Engineering', slug: 'software-engineering', count: 12463, icon: Briefcase },
  { name: 'Data Science', slug: 'data-science', count: 6878, icon: Briefcase },
  { name: 'Marketing', slug: 'marketing', count: 4521, icon: Briefcase },
  { name: 'Design', slug: 'design', count: 3654, icon: Briefcase },
  { name: 'Finance', slug: 'finance', count: 2100, icon: Briefcase },
  { name: 'Sales', slug: 'sales', count: 5231, icon: Briefcase },
  { name: 'Customer Service', slug: 'customer-service', count: 3254, icon: Briefcase },
  { name: 'Engineering', slug: 'engineering', count: 8645, icon: Briefcase },
  { name: 'Human Resources', slug: 'human-resources', count: 1987, icon: Briefcase },
  { name: 'Healthcare', slug: 'healthcare', count: 4356, icon: Briefcase },
  { name: 'Education', slug: 'education', count: 2765, icon: Briefcase },
  { name: 'Legal', slug: 'legal', count: 1543, icon: Briefcase },
];

// Sample stats data
const stats = [
  { value: '130K+', label: 'Active Jobs' },
  { value: '50K+', label: 'Companies' },
  { value: '12M+', label: 'Job Seekers' },
  { value: '18K+', label: 'Remote Jobs' },
];

// Sample features data
const features = [
  { 
    title: 'Curated Job Listings', 
    icon: Briefcase,
    description: 'Access to thousands of verified job opportunities from top companies around the world.'
  },
  { 
    title: 'Resume Matching', 
    icon: Users,
    description: 'Our AI-powered system matches your skills to find jobs that are a perfect fit for your profile.'
  },
  { 
    title: 'Market Insights', 
    icon: TrendingUp,
    description: 'Get valuable insights into salary trends, in-demand skills, and job market conditions.'
  }
];
