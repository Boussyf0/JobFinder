"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiDollarSign, FiInfo, FiAlertTriangle } from 'react-icons/fi';

interface DepartmentOption {
  value: string;
  label: string;
}

interface SalaryPrediction {
  min: number;
  max: number;
  predicted: number;
  currency: string;
  confidence: number;
  source?: string;
}

// Department categories based on our model
const MODEL_DEPARTMENTS = [
  { value: 'IT & Technology', label: 'IT & Technology' },
  { value: 'Data Science', label: 'Data Science' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Electrical Engineering', label: 'Electrical Engineering' },
  { value: 'Civil Engineering', label: 'Civil Engineering' },
  { value: 'Finance & Accounting', label: 'Finance & Accounting' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Sales & Business Development', label: 'Sales & Business Development' },
  { value: 'General', label: 'General/Other' },
];

// Top skills that impact salary (based on model feature importance)
const TOP_SKILLS = [
  'Python', 'JavaScript', 'React', 'Java', 'Node.js', 'SQL', 'AWS', 'Azure',
  'DevOps', 'Docker', 'Kubernetes', 'Machine Learning', 'Data Analysis',
  'Git', 'CI/CD', 'Agile', 'Project Management', 'Full Stack', 'Embedded Systems',
  'Cloud Computing', 'Angular', 'Vue.js', 'PHP', 'C++', 'C#', '.NET'
];

const SalaryPredictorForm: React.FC = () => {
  // Form state
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [experience, setExperience] = useState('3');
  const [isRemote, setIsRemote] = useState(false);
  const [isHybrid, setIsHybrid] = useState(false);
  const [isFulltime, setIsFulltime] = useState(true);
  const [isContract, setIsContract] = useState(false);
  const [isSenior, setIsSenior] = useState(false);
  const [isJunior, setIsJunior] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [location, setLocation] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [skillsCount, setSkillsCount] = useState(0);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<SalaryPrediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Update skills count when skills array changes
  useEffect(() => {
    setSkillsCount(skills.length);
  }, [skills]);

  // Automatically update senior/junior based on title
  useEffect(() => {
    const titleLower = title.toLowerCase();
    
    // Check for senior terms
    if (
      titleLower.includes('senior') || 
      titleLower.includes('lead') || 
      titleLower.includes('sr.') || 
      titleLower.includes('principal') || 
      titleLower.includes('chief') || 
      titleLower.includes('head')
    ) {
      setIsSenior(true);
      setIsJunior(false);
    } 
    // Check for junior terms
    else if (
      titleLower.includes('junior') || 
      titleLower.includes('jr.') || 
      titleLower.includes('entry') || 
      titleLower.includes('intern') || 
      titleLower.includes('stage')
    ) {
      setIsJunior(true);
      setIsSenior(false);
    }
    
    // Check for manager terms
    if (
      titleLower.includes('manager') || 
      titleLower.includes('director') || 
      titleLower.includes('chief') || 
      titleLower.includes('head') || 
      titleLower.includes('lead')
    ) {
      setIsManager(true);
    } else {
      setIsManager(false);
    }
  }, [title]);

  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const handleAddSuggestedSkill = (skill: string) => {
    if (!skills.includes(skill)) {
      setSkills([...skills, skill]);
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Enhance payload with our LightGBM model features
      const response = await fetch('/api/salary/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          dept_category: department,
          job_type: isContract ? 'contract' : (isFulltime ? 'full_time' : 'part_time'),
          experience_years: parseFloat(experience),
          is_remote: isRemote ? 1 : 0,
          is_hybrid: isHybrid ? 1 : 0,
          is_fulltime: isFulltime ? 1 : 0,
          is_contract: isContract ? 1 : 0,
          skills_count: skillsCount,
          is_senior: isSenior ? 1 : 0,
          is_junior: isJunior ? 1 : 0,
          is_manager: isManager ? 1 : 0,
          location,
          skills,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setPrediction(data);
      } else {
        setError(data.error || 'Failed to predict salary');
      }
      
    } catch (err) {
      setError('Error connecting to the server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {/* Job Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Job Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g. Software Engineer, Data Scientist"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Include role level if applicable (Junior, Senior, Lead, etc.)
            </p>
          </div>
          
          {/* Department */}
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">
              Department
            </label>
            <select
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Select a department</option>
              {MODEL_DEPARTMENTS.map((dept) => (
                <option key={dept.value} value={dept.value}>
                  {dept.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Experience */}
          <div>
            <label htmlFor="experience" className="block text-sm font-medium text-gray-700">
              Years of Experience
            </label>
            <input
              type="number"
              id="experience"
              min="0"
              max="30"
              step="1"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          
          {/* Job Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="fulltime"
                  checked={isFulltime}
                  onChange={(e) => {
                    setIsFulltime(e.target.checked);
                    if (e.target.checked) setIsContract(false);
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="fulltime" className="ml-2 block text-sm text-gray-700">
                  Full-time
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="contract"
                  checked={isContract}
                  onChange={(e) => {
                    setIsContract(e.target.checked);
                    if (e.target.checked) setIsFulltime(false);
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="contract" className="ml-2 block text-sm text-gray-700">
                  Contract/Freelance
                </label>
              </div>
            </div>
          </div>
          
          {/* Work Arrangement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Work Arrangement
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remote"
                  checked={isRemote}
                  onChange={(e) => {
                    setIsRemote(e.target.checked);
                    if (e.target.checked) setIsHybrid(false);
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remote" className="ml-2 block text-sm text-gray-700">
                  Fully Remote
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hybrid"
                  checked={isHybrid}
                  onChange={(e) => {
                    setIsHybrid(e.target.checked);
                    if (e.target.checked) setIsRemote(false);
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="hybrid" className="ml-2 block text-sm text-gray-700">
                  Hybrid
                </label>
              </div>
            </div>
          </div>
          
          {/* Job Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Level <span className="text-gray-400 font-normal">(Auto-detected from title)</span>
            </label>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="junior"
                  checked={isJunior}
                  onChange={(e) => {
                    setIsJunior(e.target.checked);
                    if (e.target.checked) {
                      setIsSenior(false);
                      setIsManager(false);
                    }
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="junior" className="ml-2 block text-sm text-gray-700">
                  Junior
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="senior"
                  checked={isSenior}
                  onChange={(e) => {
                    setIsSenior(e.target.checked);
                    if (e.target.checked) setIsJunior(false);
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="senior" className="ml-2 block text-sm text-gray-700">
                  Senior
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="manager"
                  checked={isManager}
                  onChange={(e) => {
                    setIsManager(e.target.checked);
                    if (e.target.checked) setIsJunior(false);
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="manager" className="ml-2 block text-sm text-gray-700">
                  Management
                </label>
              </div>
            </div>
          </div>
          
          {/* Skills */}
          <div>
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">Skills</label>
              <div className="text-xs text-gray-500">
                Skills count: {skillsCount} 
                <button 
                  type="button" 
                  className="ml-1 text-primary-500 hover:text-primary-600 focus:outline-none"
                  onClick={() => setShowExplanation(!showExplanation)}
                >
                  <FiInfo />
                </button>
              </div>
            </div>
            
            {showExplanation && (
              <div className="mt-1 p-2 text-xs rounded bg-gray-50 text-gray-600">
                Our model has found that skills count significantly impacts salary predictions. 
                The more relevant skills you have, the higher your predicted salary.
              </div>
            )}
            
            <div className="flex mt-1">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Add a skill"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Add
              </button>
            </div>
            
            {/* Popular skills suggestions */}
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Popular skills:</p>
              <div className="flex flex-wrap gap-1">
                {TOP_SKILLS.slice(0, 10).map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleAddSuggestedSkill(skill)}
                    disabled={skills.includes(skill)}
                    className={`text-xs px-2 py-1 rounded ${
                      skills.includes(skill)
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
            
            {skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-1 inline-flex text-primary-400 hover:text-primary-500 focus:outline-none"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g. Casablanca, Rabat"
            />
          </div>
        </div>
        
        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              loading ? 'bg-primary-400' : 'bg-primary-600 hover:bg-primary-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
          >
            {loading ? 'Predicting...' : 'Predict Salary'}
          </button>
        </div>
      </form>
      
      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 rounded-md bg-red-50 text-red-700">
          {error}
        </div>
      )}
      
      {/* Prediction Result */}
      {prediction && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-md overflow-hidden"
        >
          <div className="bg-primary-600 p-4 text-white">
            <h3 className="text-lg font-medium flex items-center">
              <FiDollarSign className="mr-2" /> Predicted Salary
            </h3>
          </div>
          <div className="bg-primary-50 p-4">
            {prediction.source === 'fallback' && (
              <div className="mb-4 p-2 bg-yellow-50 text-yellow-700 text-sm rounded flex items-center">
                <FiAlertTriangle className="mr-2 flex-shrink-0" />
                <span>Using local model - backend prediction service unavailable</span>
              </div>
            )}
            
            <div className="text-center">
              <p className="text-4xl font-bold text-primary-700">
                {prediction.predicted.toLocaleString()} {prediction.currency}
              </p>
              <p className="text-sm text-primary-600 mt-1">
                Range: {prediction.min.toLocaleString()} - {prediction.max.toLocaleString()} {prediction.currency}
              </p>
            </div>
            
            <div className="mt-4 pt-4 border-t border-primary-200">
              <h4 className="text-sm font-medium text-primary-700 mb-2">Key factors affecting this prediction:</h4>
              <ul className="text-sm text-primary-600 space-y-1">
                <li>• {department} role with {experience} years of experience</li>
                {isRemote && <li>• Remote work arrangement</li>}
                {isHybrid && <li>• Hybrid work arrangement</li>}
                {isContract && <li>• Contract/Freelance status</li>}
                {isSenior && <li>• Senior-level position</li>}
                {isManager && <li>• Management responsibilities</li>}
                {skills.length > 0 && <li>• {skills.length} relevant skills</li>}
              </ul>
            </div>
            
            <div className="mt-4 text-xs text-primary-500">
              <p>Prediction confidence: {Math.round(prediction.confidence * 100)}%</p>
              <p className="mt-1">
                {prediction.source === 'fallback' 
                  ? 'Based on local prediction model with limited accuracy'
                  : `Based on our LightGBM model trained on ${(23506).toLocaleString()} job listings.`}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SalaryPredictorForm; 