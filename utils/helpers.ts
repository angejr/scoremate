// ============================================
// utils/helpers.ts - Helper Functions
// ============================================

/**
 * Get the week number for a given date (ISO week)
 * @param {Date} date 
 * @returns {number} Week number (1-52)
 */
export const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

/**
 * Format date to readable string
 * @param {Date} date 
 * @returns {string}
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Get start of week (Sunday)
 * @param {Date} date 
 * @returns {Date}
 */
export const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

/**
 * Calculate days until next Sunday
 * @returns {number}
 */
export const getDaysUntilWeekEnd = (): number => {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + (7 - today.getDay()));
  const diffTime = Math.abs(sunday.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {Date} date 
 * @returns {string}
 */
export const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  if (days < 7) return `${days} days ago`;
  
  return formatDate(date);
};
