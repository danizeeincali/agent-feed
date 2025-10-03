/**
 * Time Utility Functions for Social Media-Style Relative Time Display
 *
 * Provides functions to convert timestamps into human-readable relative time
 * strings (e.g., "2 mins ago", "yesterday") and formatted full timestamps.
 */

/**
 * Converts a timestamp to a relative time string (e.g., "2 mins ago", "yesterday")
 *
 * @param timestamp - ISO string, Date object, or timestamp number
 * @returns Relative time string or "Unknown time" for invalid inputs
 *
 * @example
 * formatRelativeTime('2025-10-02T19:08:08Z') // "1 hour ago" (if now is 20:08:08)
 * formatRelativeTime('2025-10-01T20:08:08Z') // "yesterday"
 * formatRelativeTime(null) // "Unknown time"
 */
export function formatRelativeTime(timestamp: string | Date | number | null | undefined): string {
  // Handle null, undefined, and invalid inputs
  if (!timestamp && timestamp !== 0) {
    return 'Unknown time';
  }

  // Handle empty string
  if (timestamp === '') {
    return 'Unknown time';
  }

  // Handle negative timestamps
  if (typeof timestamp === 'number' && timestamp < 0) {
    return 'Unknown time';
  }

  // Convert to Date object
  let date: Date;
  try {
    date = new Date(timestamp);

    // Check if date is invalid
    if (isNaN(date.getTime())) {
      return 'Unknown time';
    }
  } catch {
    return 'Unknown time';
  }

  // Calculate time difference in milliseconds
  const now = Date.now();
  const diff = now - date.getTime();

  // Handle future dates (return "just now" defensively)
  if (diff < 0) {
    return 'just now';
  }

  // Convert to different units
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  // Less than 1 minute
  if (minutes < 1) {
    return 'just now';
  }

  // Less than 1 hour (1-59 minutes)
  if (minutes < 60) {
    return minutes === 1 ? '1 min ago' : `${minutes} mins ago`;
  }

  // Less than 24 hours (1-23 hours)
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  // Exactly 1 day (24-47 hours) - special case for "yesterday"
  if (days === 1) {
    return 'yesterday';
  }

  // Less than 7 days (2-6 days)
  if (days < 7) {
    return `${days} days ago`;
  }

  // Less than 30 days (1-4 weeks)
  if (days < 30) {
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }

  // Less than 365 days (1-11 months)
  if (days < 365) {
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  // 365+ days (years)
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Formats a timestamp into a full date and time string
 *
 * @param timestamp - ISO string, Date object, or timestamp number
 * @returns Formatted string like "October 2, 2025 at 8:08 PM" or "Invalid date"
 *
 * @example
 * formatFullTimestamp('2025-10-02T20:08:08Z') // "October 2, 2025 at 8:08 PM"
 * formatFullTimestamp(null) // "Invalid date"
 */
export function formatFullTimestamp(timestamp: string | Date | number | null | undefined): string {
  // Handle null, undefined, and invalid inputs
  if (!timestamp && timestamp !== 0) {
    return 'Invalid date';
  }

  // Handle empty string
  if (timestamp === '') {
    return 'Invalid date';
  }

  // Convert to Date object
  let date: Date;
  try {
    date = new Date(timestamp);

    // Check if date is invalid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
  } catch {
    return 'Invalid date';
  }

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Extract date components
  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  // Format time
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  // Convert to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12

  // Pad minutes with leading zero if needed
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;

  return `${month} ${day}, ${year} at ${hours}:${minutesStr} ${ampm}`;
}

/**
 * Formats a timestamp into exact date and time
 * @param timestamp - Date string or Date object
 * @returns Formatted date string (e.g., "January 15, 2025 at 3:45 PM")
 * @deprecated Use formatFullTimestamp instead
 */
export function formatExactDateTime(timestamp: string | Date): string {
  return formatFullTimestamp(timestamp);
}

/**
 * Formats a timestamp into short exact date
 * @param timestamp - Date string or Date object
 * @returns Short formatted date string (e.g., "Jan 15, 2025")
 */
export function formatShortDate(timestamp: string | Date): string {
  const date = new Date(timestamp);

  // Validate date
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };

  return date.toLocaleDateString('en-US', options);
}

/**
 * Alias for formatRelativeTime - for backward compatibility
 * @param timestamp - Date string or Date object
 * @returns Relative time string
 * @deprecated Use formatRelativeTime instead
 */
export function formatTimeAgo(timestamp: string | Date | number | null | undefined): string {
  return formatRelativeTime(timestamp);
}
