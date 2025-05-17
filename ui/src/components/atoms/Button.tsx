import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'danger' | 'gradient' | 'subtle-gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  as?: React.ElementType;
  href?: string;
  animated?: boolean;
  responsive?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      fullWidth = false,
      disabled,
      as: Component = 'button',
      href,
      animated = false,
      responsive = false,
      ...props
    },
    ref
  ) => {
    // Base classes
    const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
    
    // Size classes - improved with better padding, font sizes, and spacing
    const sizeClasses = {
      xs: 'h-7 px-2.5 text-xs',
      sm: 'h-9 px-3 py-1.5 text-sm',
      md: 'h-10 px-4 py-2 text-sm',
      lg: 'h-12 px-5 py-2.5 text-base',
      xl: 'h-14 px-6 py-3 text-lg',
    };
    
    // Responsive size classes that adapt to screen width
    const responsiveClasses = responsive ? {
      xs: 'sm:h-7 sm:px-2.5 sm:py-1 sm:text-xs',
      sm: 'sm:h-9 sm:px-3 sm:py-1.5 sm:text-sm',
      md: 'sm:h-10 sm:px-4 sm:py-2 sm:text-sm',
      lg: 'sm:h-12 sm:px-5 sm:py-2.5 sm:text-base',
      xl: 'sm:h-14 sm:px-6 sm:py-3 sm:text-lg',
    } : {};
    
    // On mobile, buttons can be one size smaller when responsive option is enabled
    const mobileResponsiveClasses = responsive ? {
      sm: 'h-7 px-2.5 py-1 text-xs',
      md: 'h-9 px-3 py-1.5 text-sm',
      lg: 'h-10 px-4 py-2 text-sm',
      xl: 'h-12 px-5 py-2.5 text-base',
    } : {};
    
    // Variant classes
    const variantClasses = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500',
      outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-500',
      ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-500',
      link: 'text-indigo-600 underline-offset-4 hover:underline focus-visible:ring-indigo-500 p-0 h-auto',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
      gradient: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 focus-visible:ring-purple-500',
      'subtle-gradient': 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 focus-visible:ring-blue-500',
    };
    
    // Animation classes with improved shadow
    const animationClasses = animated 
      ? 'transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-100' 
      : '';
    
    // Width classes with responsive options
    const widthClasses = fullWidth 
      ? responsive 
        ? 'w-full sm:w-auto' 
        : 'w-full' 
      : '';
    
    // If component is not a button, we shouldn't forward the 'type' attribute
    const buttonSpecificProps = Component === 'button' ? props : {};
    // For Link components, add href prop
    const linkProps = href && Component !== 'button' ? { href } : {};
    
    // Determine which size classes to use
    const appliedSizeClasses = responsive && size !== 'xs'
      ? cn(mobileResponsiveClasses[size as keyof typeof mobileResponsiveClasses], responsiveClasses[size])
      : sizeClasses[size];
    
    // Create consistent icon wrapper classes
    const leftIconClass = "mr-2 inline-flex " + (size === 'xs' || size === 'sm' ? 'scale-90' : '');
    const rightIconClass = "ml-2 inline-flex " + (size === 'xs' || size === 'sm' ? 'scale-90' : '');
    
    // Always include child wrapper for consistency
    const content = (
      <>
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        
        {leftIcon && !isLoading && (
          <span className={leftIconClass}>
            {leftIcon}
          </span>
        )}
        <span className="truncate">{children}</span>
        {rightIcon && (
          <span className={rightIconClass}>
            {rightIcon}
          </span>
        )}
      </>
    );
    
    return (
      <Component
        ref={ref}
        className={cn(
          baseClasses,
          appliedSizeClasses,
          variantClasses[variant],
          widthClasses,
          animationClasses,
          className
        )}
        disabled={disabled || isLoading}
        {...buttonSpecificProps}
        {...linkProps}
        {...props}
      >
        {content}
      </Component>
    );
  }
);

Button.displayName = 'Button';

export default Button; 