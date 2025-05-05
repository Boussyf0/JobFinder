'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiMenu, FiX, FiBriefcase, FiUser, FiBarChart2, FiTool, FiFileText, FiSearch } from 'react-icons/fi';

const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: 'Home', path: '/', icon: null },
    { name: 'Find Jobs', path: '/jobs', icon: <FiSearch className="mr-1" /> },
    { name: 'Resume Matcher', path: '/resume-matcher', icon: <FiFileText className="mr-1" /> },
    { name: 'Salary Predictor', path: '/salary-predictor', icon: <FiBarChart2 className="mr-1" /> },
    { name: 'Market Insights', path: '/market-insights', icon: <FiTool className="mr-1" /> },
  ];

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const isActivePath = (path: string) => {
    if (path === '/') return pathname === '/';
    if (path.includes('?')) {
      // For paths with query parameters, just check the base path
      const basePath = path.split('?')[0];
      return pathname?.startsWith(basePath);
    }
    return pathname?.startsWith(path);
  };

  return (
    <nav className="bg-primary-600 text-white shadow-md">
      <div className="container-custom py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <FiBriefcase className="text-2xl" />
            <span className="text-xl font-bold">Morocco Job Search</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link 
                key={link.path} 
                href={link.path}
                className={`relative px-2 py-1 font-medium flex items-center ${
                  isActivePath(link.path)
                    ? 'text-white'
                    : 'text-primary-100 hover:text-white'
                }`}
              >
                {isActivePath(link.path) && (
                  <motion.span
                    layoutId="navbar-indicator"
                    className="absolute inset-0 bg-primary-500 rounded-md -z-10"
                    transition={{ duration: 0.3 }}
                  />
                )}
                {link.icon && link.icon}
                {link.name}
              </Link>
            ))}
          </div>

          {/* Authentication Buttons */}
          <div className="hidden md:flex items-center space-x-2">
            <button className="btn bg-primary-500 hover:bg-primary-400 px-3 py-1.5 rounded-md flex items-center space-x-1">
              <FiUser />
              <span>Login</span>
            </button>
            <button className="btn bg-white text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-md">
              Sign Up
            </button>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden" onClick={toggleMenu}>
            {isOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden mt-4 pb-4"
          >
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    isActivePath(link.path)
                      ? 'bg-primary-500 text-white'
                      : 'text-primary-100 hover:bg-primary-500 hover:text-white'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.icon && link.icon}
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col space-y-2 pt-2 border-t border-primary-500">
                <button className="btn bg-primary-500 hover:bg-primary-400 py-2 rounded-md">
                  Login
                </button>
                <button className="btn bg-white text-primary-600 hover:bg-primary-50 py-2 rounded-md">
                  Sign Up
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
};

export default NavBar; 