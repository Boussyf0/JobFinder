'use client';

import Link from 'next/link';
import { FiGithub, FiLinkedin, FiTwitter, FiFacebook, FiBriefcase } from 'react-icons/fi';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container-custom py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Info */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <FiBriefcase className="text-2xl text-primary-400" />
              <span className="text-xl font-bold text-white">Morocco Job Search</span>
            </div>
            <p className="text-sm mb-4">
              Finding the best tech jobs in Morocco with AI-powered search and market insights.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <FiGithub />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <FiLinkedin />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <FiTwitter />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <FiFacebook />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/jobs" className="hover:text-white transition-colors">
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link href="/salary-predictor" className="hover:text-white transition-colors">
                  Salary Predictor
                </Link>
              </li>
              <li>
                <Link href="/resume-matcher" className="hover:text-white transition-colors">
                  Resume Matcher
                </Link>
              </li>
            </ul>
          </div>

          {/* Job Categories */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Job Categories</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/jobs?category=software-engineering" className="hover:text-white transition-colors">
                  Software Engineering
                </Link>
              </li>
              <li>
                <Link href="/jobs?category=data-science" className="hover:text-white transition-colors">
                  Data Science
                </Link>
              </li>
              <li>
                <Link href="/jobs?category=electrical" className="hover:text-white transition-colors">
                  Electrical Engineering
                </Link>
              </li>
              <li>
                <Link href="/jobs?category=civil" className="hover:text-white transition-colors">
                  Civil Engineering
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Contact Us</h3>
            <ul className="space-y-2">
              <li>Email: info@moroccojobs.com</li>
              <li>Phone: +212 5XX-XXXXXX</li>
              <li>Address: Casablanca, Morocco</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-sm text-center md:flex md:justify-between">
          <p>© {new Date().getFullYear()} Morocco Job Search. All rights reserved.</p>
          <div className="mt-4 md:mt-0 space-x-4">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 