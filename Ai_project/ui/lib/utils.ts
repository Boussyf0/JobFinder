/**
 * Utilities for handling data and common operations
 */

/**
 * Sanitizes a JSON object by replacing NaN and Infinity values with null.
 * This is useful for API responses that might contain invalid JSON values.
 */
export function sanitizeJson(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeJson);
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Handle NaN and Infinity
      if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
        result[key] = null;
      } else {
        result[key] = sanitizeJson(value);
      }
    }
    return result;
  }
  
  // Return primitive values as is
  return obj;
}

/**
 * Safely parses a JSON string, handling errors and invalid values.
 */
export function safeJsonParse(jsonString: string): any {
  try {
    // First replace any NaN or Infinity with null
    const sanitized = jsonString
      .replace(/:\s*NaN\s*([,}])/g, ': null$1')
      .replace(/:\s*Infinity\s*([,}])/g, ': null$1')
      .replace(/:\s*-Infinity\s*([,}])/g, ': null$1');
      
    return JSON.parse(sanitized);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
}

/**
 * Formats a salary range for display
 */
export function formatSalary(min?: number | null, max?: number | null, currency: string = 'MAD'): string {
  if (!min && !max) return '';
  
  // Ensure min and max are valid numbers
  const validMin = typeof min === 'number' && !isNaN(min) && isFinite(min) ? min : null;
  const validMax = typeof max === 'number' && !isNaN(max) && isFinite(max) ? max : null;
  
  if (validMin && validMax) {
    return `${validMin.toLocaleString()} - ${validMax.toLocaleString()} ${currency}`;
  } else if (validMin) {
    return `${validMin.toLocaleString()}+ ${currency}`;
  } else if (validMax) {
    return `Up to ${validMax.toLocaleString()} ${currency}`;
  }
  
  return '';
}

/**
 * Creates a URL with query parameters
 */
export function createUrlWithParams(baseUrl: string, params: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(baseUrl, window.location.origin);
  
  // Add all params that have values to the URL
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, String(value));
    }
  });
  
  return url.toString();
}

import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 