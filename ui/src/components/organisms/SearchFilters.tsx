import React, { useState } from 'react';
import { SearchFilters as SearchFiltersType } from '@/types';
import { Briefcase, MapPin, ChevronDown, ArrowRight } from 'lucide-react';

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  onSearch: () => void;
  isLoading?: boolean;
  suggestedLocations?: string[];
}

export default function SearchFilters({
  filters,
  onFiltersChange,
  onSearch,
  isLoading = false,
  suggestedLocations = [],
}: SearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInputChange = (field: keyof SearchFiltersType, value: string) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const handleRemoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, remote: e.target.checked });
  };

  return (
    <div className="bg-white rounded-3xl shadow-md p-6 w-full max-w-xl mx-auto">
      <div className="space-y-6">
        {/* Job Title Input */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-gray-700 font-medium">
            <Briefcase className="text-indigo-500" size={20} />
            Job Title or Keywords
          </label>
          <div className="relative">
            <Briefcase 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" 
              size={20} 
            />
            <input
              type="text"
              placeholder="e.g"
              value={filters.query || ''}
              onChange={(e) => handleInputChange('query', e.target.value)}
              className="w-full pl-10 py-3 border border-gray-200 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Location Input */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-gray-700 font-medium">
            <MapPin className="text-indigo-500" size={20} />
            Location
          </label>
          <div className="relative">
            <MapPin 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" 
              size={20} 
            />
            <input
              type="text"
              placeholder="e.g"
              value={filters.location || ''}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full pl-10 py-3 border border-gray-200 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Remote Toggle & Filters Button */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <label 
              htmlFor="remote-toggle" 
              className="relative inline-flex items-center cursor-pointer"
            >
              <input
                id="remote-toggle"
                type="checkbox"
                className="sr-only peer"
                checked={filters.remote || false}
                onChange={handleRemoteChange}
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
              <span className="ml-3 text-gray-700">Remote jobs only</span>
            </label>
          </div>
          
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-indigo-600 font-medium"
          >
            More filters
            <ChevronDown 
              size={20} 
              className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} 
            />
          </button>
        </div>

        {/* Search Button */}
        <button
          onClick={onSearch}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          {isLoading ? 'Searching...' : 'Search Jobs'}
          {!isLoading && <ArrowRight size={20} />}
        </button>
      </div>
    </div>
  );
} 