import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'info' | 'gradient' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  withShadow?: boolean;
  withAnimation?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'md', 
    rounded = false, 
    withShadow = false,
    withAnimation = false,
    children, 
    ...props 
  }, ref) => {
    // Base classes
    const baseClasses = 'inline-flex items-center font-medium transition-all duration-200';
    
    // Size classes
    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-sm',
      lg: 'px-3 py-1 text-sm',
    };
    
    // Border radius classes
    const radiusClasses = rounded ? 'rounded-full' : 'rounded';
    
    // Shadow classes
    const shadowClasses = withShadow ? 'shadow-sm' : '';
    
    // Animation classes
    const animationClasses = withAnimation ? 'hover:scale-105 active:scale-95' : '';
    
    // Variant classes
    const variantClasses = {
      default: 'bg-gray-100 text-gray-800',
      secondary: 'bg-gray-600 text-white',
      outline: 'border border-gray-300 text-gray-700',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      danger: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800',
      gradient: 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white',
      subtle: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
    };
    
    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          sizeClasses[size],
          radiusClasses,
          shadowClasses,
          animationClasses,
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge; 