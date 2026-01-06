/**
 * Get the week number for a given date
 * @param {Date} date 
 * @returns {number} Week number (1-52)
 */
export const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

/**
 * Format date to readable string
 * @param {Date} date 
 * @returns {string}
 */
export const formatDate = (date) => {
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
export const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

/**
 * Calculate days until next Sunday
 * @returns {number}
 */
export const getDaysUntilWeekEnd = () => {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + (7 - today.getDay()));
  const diffTime = Math.abs(sunday - today);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};
