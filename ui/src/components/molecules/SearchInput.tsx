import React, { useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  showClearButton?: boolean;
}

export default function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
  className,
  inputClassName,
  showClearButton = true,
  ...props
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChange('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value);
    }
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div
      className={cn(
        'relative flex items-center w-full rounded-md border border-gray-300 bg-white transition-all',
        isFocused && 'ring-2 ring-blue-500 border-blue-500',
        className
      )}
    >
      <div className="absolute left-3 flex items-center pointer-events-none text-gray-400">
        <Search size={18} />
      </div>
      
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
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
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
} 