import React from 'react';
import Link from 'next/link';
import { BriefcaseBusiness, Github, Twitter, Linkedin, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand and description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center">
              <BriefcaseBusiness className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">JobHub</span>
            </div>
            <p className="mt-4 text-base text-gray-600">
              Your gateway to professional opportunities. Find and apply to jobs that match your skills and career goals.
            </p>
            <div className="mt-6 flex space-x-6">
              <a href="#" className="text-gray-500 hover:text-gray-900">
                <span className="sr-only">Twitter</span>
                <Twitter className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-900">
                <span className="sr-only">GitHub</span>
                <Github className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-900">
                <span className="sr-only">LinkedIn</span>
                <Linkedin className="h-6 w-6" />
              </a>
            </div>
          </div>
          
          {/* Quick links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">Explore</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/jobs" className="text-base text-gray-600 hover:text-blue-600">
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link href="/companies" className="text-base text-gray-600 hover:text-blue-600">
                  Companies
                </Link>
              </li>
              <li>
                <Link href="/resume-match" className="text-base text-gray-600 hover:text-blue-600">
                  Resume Match
                </Link>
              </li>
              <li>
                <Link href="/insights" className="text-base text-gray-600 hover:text-blue-600">
                  Market Insights
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">Resources</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/help" className="text-base text-gray-600 hover:text-blue-600">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-base text-gray-600 hover:text-blue-600">
                  Career Blog
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-base text-gray-600 hover:text-blue-600">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-base text-gray-600 hover:text-blue-600">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-base text-gray-600 hover:text-blue-600">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-center text-base text-gray-500">
            &copy; {new Date().getFullYear()} JobHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
} 