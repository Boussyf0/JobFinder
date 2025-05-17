'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, BriefcaseBusiness, Heart, User, LogIn, BarChart, FileText, Bug } from 'lucide-react';
import Button from '@/components/atoms/Button';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  const navLinks = [
    { name: 'Jobs', path: '/jobs', icon: BriefcaseBusiness },
    { name: 'Saved Jobs', path: '/saved', icon: Heart },
    { name: 'Resume Match', path: '/resume-match', icon: FileText },
    { name: 'Market Insights', path: '/insights', icon: BarChart },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Debug', path: '/debug', icon: Bug },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center" onClick={closeMenu}>
              <BriefcaseBusiness className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">JobHub</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`flex items-center px-1 pt-1 text-sm font-medium ${
                  isActive(link.path)
                    ? 'text-indigo-600 border-b-2 border-indigo-500'
                    : 'text-gray-700 hover:text-indigo-600 hover:border-b-2 hover:border-indigo-300'
                }`}
              >
                <link.icon className="h-4 w-4 mr-2" />
                {link.name}
              </Link>
            ))}
          </nav>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-indigo-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
          
          {/* Sign in button (desktop) */}
          <div className="hidden md:flex items-center">
            <Button
              as={Link}
              href="/login"
              variant="outline"
              size="sm"
              className="ml-4"
              leftIcon={<LogIn size={16} />}
            >
              Sign in
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`flex items-center pl-3 pr-4 py-2 ${
                  isActive(link.path)
                    ? 'bg-indigo-50 border-l-4 border-indigo-500 text-indigo-700 font-medium'
                    : 'border-l-4 border-transparent text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
                }`}
                onClick={closeMenu}
              >
                <link.icon className="h-5 w-5 mr-3" />
                {link.name}
              </Link>
            ))}
            
            <div className="pt-4 pb-3 border-t border-gray-200">
              <Link
                href="/login"
                className="flex items-center pl-3 pr-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                onClick={closeMenu}
              >
                <LogIn className="h-5 w-5 mr-3 text-gray-500" />
                Sign in
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
} 