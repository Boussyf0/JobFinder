import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
}

export default function Tooltip({ 
  children, 
  content, 
  side = 'top', 
  delay = 200 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    setIsVisible(false);
  };

  const positions = {
    top: {
      tooltip: 'bottom-full mb-2',
      arrow: 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-800 border-l-transparent border-r-transparent border-b-transparent',
      animation: { y: -5 }
    },
    right: {
      tooltip: 'left-full ml-2',
      arrow: 'left-0 top-1/2 transform -translate-x-full -translate-y-1/2 border-r-gray-800 border-t-transparent border-b-transparent border-l-transparent',
      animation: { x: 5 }
    },
    bottom: {
      tooltip: 'top-full mt-2',
      arrow: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-800 border-l-transparent border-r-transparent border-t-transparent',
      animation: { y: 5 }
    },
    left: {
      tooltip: 'right-full mr-2',
      arrow: 'right-0 top-1/2 transform translate-x-full -translate-y-1/2 border-l-gray-800 border-t-transparent border-b-transparent border-r-transparent',
      animation: { x: -5 }
    }
  };

  const position = positions[side];

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, ...position.animation }}
            animate={{ opacity: 1, ...position.animation }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-50 ${position.tooltip}`}
          >
            <div className="relative">
              <div className="bg-gray-800 text-white text-sm rounded-lg px-3 py-1.5 whitespace-nowrap">
                {content}
              </div>
              <div 
                className={`absolute w-0 h-0 border-4 ${position.arrow}`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 