import React, { useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  showClearButton?: boolean;
  suggestedLocations?: string[];
}

export default function LocationInput({
  value,
  onChange,
  onSelect,
  placeholder = 'Location',
  className,
  inputClassName,
  showClearButton = true,
  suggestedLocations = [],
  ...props
}: LocationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter suggestions based on current input
  const filteredSuggestions = suggestedLocations.filter(
    (location) => location.toLowerCase().includes(value.toLowerCase()) && location.toLowerCase() !== value.toLowerCase()
  );

  const handleClear = () => {
    onChange('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSelect) {
      onSelect(value);
      setShowSuggestions(false);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      handleClear();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    if (onSelect) {
      onSelect(suggestion);
    }
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div
        className={cn(
          'relative flex items-center w-full rounded-md border border-gray-300 bg-white transition-all',
          isFocused && 'ring-2 ring-blue-500 border-blue-500',
          className
        )}
      >
        <div className="absolute left-3 flex items-center pointer-events-none text-gray-400">
          <MapPin size={18} />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => {
            setIsFocused(false);
            // Delay hiding suggestions to allow clicks
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          className={cn(
            'flex h-10 w-full rounded-md bg-transparent py-2 pl-10 pr-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50',
            inputClassName
          )}
          placeholder={placeholder}
          {...props}
        />
        
        {showClearButton && value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Clear location"
          >
            <X size={14} />
          </button>
        )}
      </div>
      
      {/* Location suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
          <ul className="py-1">
            {filteredSuggestions.map((suggestion, index) => (
              <li
                key={index}
                className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer flex items-center"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <MapPin size={14} className="mr-2 text-gray-400" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 