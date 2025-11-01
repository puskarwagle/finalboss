/**
 * Date Formatting Utilities
 * Formats dates according to template preferences
 */

import type { TemplateStyle } from '../types';

/**
 * Format a date string according to template style
 */
export function formatDate(date: string, style: TemplateStyle): string {
  if (!date) return '';
  
  // Parse date string (assuming formats like "2020-01", "Jan 2020", "2020")
  const parsed = parseDate(date);
  if (!parsed) return date;
  
  const { month, year, fullMonth } = parsed;
  const format = style.dateFormat || 'full';
  const separator = style.dateSeparator || ' - ';
  const showPresent = style.showPresent !== false;
  
  switch (format) {
    case 'month-year':
      return `${month} ${year}`;
    
    case 'month-year-short':
      return `${month.substring(0, 3)} ${year.toString().substring(2)}`;
    
    case 'month-year-long':
      return `${fullMonth} ${year}`;
    
    case 'year-only':
      return year.toString();
    
    case 'numeric':
      const monthNum = getMonthNumber(month);
      return `${String(monthNum).padStart(2, '0')}/${year}`;
    
    case 'numeric-short':
      const monthNumShort = getMonthNumber(month);
      return `${String(monthNumShort).padStart(2, '0')}/${year.toString().substring(2)}`;
    
    case 'year-present':
      return year.toString();
    
    case 'full':
    default:
      return `${month} ${year}`;
  }
}

/**
 * Format a date range according to template style
 */
export function formatDateRange(startDate: string, endDate: string | null, style: TemplateStyle): string {
  const start = formatDate(startDate, style);
  const separator = style.dateSeparator || ' - ';
  
  if (!endDate || endDate.toLowerCase() === 'present' || endDate.toLowerCase() === 'current') {
    return style.showPresent !== false ? `${start}${separator}Present` : `${start}${separator}Current`;
  }
  
  const end = formatDate(endDate, style);
  return `${start}${separator}${end}`;
}

/**
 * Parse a date string into components
 */
function parseDate(dateStr: string): { month: string; year: number; fullMonth: string } | null {
  // Try various formats
  const formats = [
    /(\w+)\s+(\d{4})/,              // "Jan 2020", "January 2020"
    /(\d{4})-(\d{2})/,              // "2020-01"
    /(\d{2})\/(\d{4})/,             // "01/2020"
    /(\d{4})/,                       // "2020"
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[1]) {
        // YYYY-MM format
        const year = parseInt(match[1]);
        const monthNum = parseInt(match[2]);
        const month = getMonthName(monthNum);
        const fullMonth = getFullMonthName(monthNum);
        return { month, year, fullMonth };
      } else if (format === formats[2]) {
        // MM/YYYY format
        const monthNum = parseInt(match[1]);
        const year = parseInt(match[2]);
        const month = getMonthName(monthNum);
        const fullMonth = getFullMonthName(monthNum);
        return { month, year, fullMonth };
      } else if (format === formats[0]) {
        // "Jan 2020" or "January 2020" format
        const monthStr = match[1];
        const year = parseInt(match[2]);
        const month = monthStr.substring(0, 3);
        const fullMonth = monthStr;
        return { month, year, fullMonth };
      } else if (format === formats[3]) {
        // Just year
        const year = parseInt(match[1]);
        const month = 'Jan';
        const fullMonth = 'January';
        return { month, year, fullMonth };
      }
    }
  }
  
  return null;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getMonthName(monthNum: number): string {
  return MONTH_NAMES[monthNum - 1] || 'Jan';
}

function getFullMonthName(monthNum: number): string {
  return FULL_MONTH_NAMES[monthNum - 1] || 'January';
}

function getMonthNumber(monthName: string): number {
  const index = MONTH_NAMES.findIndex(m => m.toLowerCase() === monthName.toLowerCase().substring(0, 3));
  return index >= 0 ? index + 1 : 1;
}

