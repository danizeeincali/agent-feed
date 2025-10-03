import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatRelativeTime, formatFullTimestamp } from '../../../utils/timeUtils';

/**
 * TDD Test Suite for Time Utilities (London School)
 *
 * Testing Strategy:
 * - Mock Date.now() for deterministic behavior verification
 * - Test interactions between time calculations and output formatting
 * - Focus on behavior contracts rather than implementation details
 * - Verify edge cases and boundary conditions
 */

describe('formatRelativeTime', () => {
  let mockNow: number;

  beforeEach(() => {
    // Set a fixed "now" time for deterministic testing
    // October 2, 2025, 8:08:08 PM UTC
    mockNow = new Date('2025-10-02T20:08:08Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Time Ranges - Recent (< 1 hour)', () => {
    it('should return "just now" for timestamps less than 1 minute ago', () => {
      const thirtySecondsAgo = new Date(mockNow - 30 * 1000).toISOString();
      expect(formatRelativeTime(thirtySecondsAgo)).toBe('just now');
    });

    it('should return "just now" for current timestamp', () => {
      const now = new Date(mockNow).toISOString();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('should return "1 min ago" for timestamps between 1-2 minutes ago', () => {
      const oneMinuteAgo = new Date(mockNow - 90 * 1000).toISOString();
      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 min ago');
    });

    it('should return "45 mins ago" for timestamps less than 1 hour ago', () => {
      const fortyFiveMinsAgo = new Date(mockNow - 45 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fortyFiveMinsAgo)).toBe('45 mins ago');
    });

    it('should return "2 mins ago" for 2 minutes ago', () => {
      const twoMinsAgo = new Date(mockNow - 2 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoMinsAgo)).toBe('2 mins ago');
    });
  });

  describe('Basic Time Ranges - Hours', () => {
    it('should return "1 hour ago" for timestamps between 1-2 hours ago', () => {
      const oneHourAgo = new Date(mockNow - 90 * 60 * 1000).toISOString();
      expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
    });

    it('should return "12 hours ago" for timestamps less than 24 hours ago', () => {
      const twelveHoursAgo = new Date(mockNow - 12 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twelveHoursAgo)).toBe('12 hours ago');
    });

    it('should return "23 hours ago" for timestamps just under 24 hours', () => {
      const twentyThreeHoursAgo = new Date(mockNow - 23 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twentyThreeHoursAgo)).toBe('23 hours ago');
    });
  });

  describe('Basic Time Ranges - Days', () => {
    it('should return "yesterday" for exactly 1 day ago', () => {
      const oneDayAgo = new Date(mockNow - 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(oneDayAgo)).toBe('yesterday');
    });

    it('should return "2 days ago" for 2 days ago', () => {
      const twoDaysAgo = new Date(mockNow - 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoDaysAgo)).toBe('2 days ago');
    });

    it('should return "6 days ago" for 6 days ago', () => {
      const sixDaysAgo = new Date(mockNow - 6 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(sixDaysAgo)).toBe('6 days ago');
    });
  });

  describe('Basic Time Ranges - Weeks', () => {
    it('should return "1 week ago" for 7-13 days ago', () => {
      const sevenDaysAgo = new Date(mockNow - 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(sevenDaysAgo)).toBe('1 week ago');
    });

    it('should return "1 week ago" for 10 days ago', () => {
      const tenDaysAgo = new Date(mockNow - 10 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(tenDaysAgo)).toBe('1 week ago');
    });

    it('should return "2 weeks ago" for 14 days ago', () => {
      const fourteenDaysAgo = new Date(mockNow - 14 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fourteenDaysAgo)).toBe('2 weeks ago');
    });

    it('should return "3 weeks ago" for 21 days ago', () => {
      const twentyOneDaysAgo = new Date(mockNow - 21 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twentyOneDaysAgo)).toBe('3 weeks ago');
    });
  });

  describe('Basic Time Ranges - Months', () => {
    it('should return "1 month ago" for 30-59 days ago', () => {
      const thirtyDaysAgo = new Date(mockNow - 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(thirtyDaysAgo)).toBe('1 month ago');
    });

    it('should return "1 month ago" for 45 days ago', () => {
      const fortyFiveDaysAgo = new Date(mockNow - 45 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fortyFiveDaysAgo)).toBe('1 month ago');
    });

    it('should return "6 months ago" for 6 months ago', () => {
      const sixMonthsAgo = new Date(mockNow - 180 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(sixMonthsAgo)).toBe('6 months ago');
    });

    it('should return "11 months ago" for timestamps less than 12 months', () => {
      const elevenMonthsAgo = new Date(mockNow - 335 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(elevenMonthsAgo)).toBe('11 months ago');
    });
  });

  describe('Basic Time Ranges - Years', () => {
    it('should return "1 year ago" for exactly 365 days ago', () => {
      const oneYearAgo = new Date(mockNow - 365 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(oneYearAgo)).toBe('1 year ago');
    });

    it('should return "2 years ago" for 2 years ago', () => {
      const twoYearsAgo = new Date(mockNow - 730 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoYearsAgo)).toBe('2 years ago');
    });
  });

  describe('Edge Cases - Invalid Inputs', () => {
    it('should return fallback message for null timestamp', () => {
      expect(formatRelativeTime(null as any)).toBe('Unknown time');
    });

    it('should return fallback message for undefined timestamp', () => {
      expect(formatRelativeTime(undefined as any)).toBe('Unknown time');
    });

    it('should return fallback message for invalid date string', () => {
      expect(formatRelativeTime('not-a-date')).toBe('Unknown time');
    });

    it('should return fallback message for empty string', () => {
      expect(formatRelativeTime('')).toBe('Unknown time');
    });

    it('should return fallback message for negative timestamp', () => {
      expect(formatRelativeTime(-1000)).toBe('Unknown time');
    });
  });

  describe('Edge Cases - Future Dates', () => {
    it('should return "just now" for future dates (defensive)', () => {
      const futureDate = new Date(mockNow + 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(futureDate)).toBe('just now');
    });

    it('should return "just now" for slightly future timestamp', () => {
      const slightlyFuture = new Date(mockNow + 5000).toISOString();
      expect(formatRelativeTime(slightlyFuture)).toBe('just now');
    });
  });

  describe('Edge Cases - Boundary Values', () => {
    it('should return "1 min ago" for exactly 60 seconds ago', () => {
      const sixtySecondsAgo = new Date(mockNow - 60 * 1000).toISOString();
      expect(formatRelativeTime(sixtySecondsAgo)).toBe('1 min ago');
    });

    it('should return "yesterday" for exactly 24 hours ago', () => {
      const twentyFourHoursAgo = new Date(mockNow - 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twentyFourHoursAgo)).toBe('yesterday');
    });

    it('should return "1 week ago" for exactly 7 days ago', () => {
      const sevenDaysAgo = new Date(mockNow - 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(sevenDaysAgo)).toBe('1 week ago');
    });

    it('should return "1 month ago" for exactly 30 days ago', () => {
      const thirtyDaysAgo = new Date(mockNow - 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(thirtyDaysAgo)).toBe('1 month ago');
    });
  });

  describe('Edge Cases - Very Old Dates', () => {
    it('should return "10 years ago" for 10 years ago', () => {
      const tenYearsAgo = new Date(mockNow - 10 * 365 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(tenYearsAgo)).toBe('10 years ago');
    });

    it('should return "25 years ago" for very old dates', () => {
      const twentyFiveYearsAgo = new Date(mockNow - 25 * 365 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twentyFiveYearsAgo)).toBe('25 years ago');
    });
  });

  describe('Pluralization - Correct Grammar', () => {
    it('should use singular "min" for 1 minute', () => {
      const oneMinAgo = new Date(mockNow - 60 * 1000).toISOString();
      expect(formatRelativeTime(oneMinAgo)).toBe('1 min ago');
    });

    it('should use plural "mins" for multiple minutes', () => {
      const fiveMinsAgo = new Date(mockNow - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinsAgo)).toBe('5 mins ago');
    });

    it('should use singular "hour" for 1 hour', () => {
      const oneHourAgo = new Date(mockNow - 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
    });

    it('should use plural "hours" for multiple hours', () => {
      const fiveHoursAgo = new Date(mockNow - 5 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveHoursAgo)).toBe('5 hours ago');
    });

    it('should use singular "day" for 1 day (yesterday)', () => {
      const oneDayAgo = new Date(mockNow - 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(oneDayAgo)).toBe('yesterday');
    });

    it('should use plural "days" for multiple days', () => {
      const threeDaysAgo = new Date(mockNow - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
    });

    it('should use singular "week" for 1 week', () => {
      const oneWeekAgo = new Date(mockNow - 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(oneWeekAgo)).toBe('1 week ago');
    });

    it('should use plural "weeks" for multiple weeks', () => {
      const twoWeeksAgo = new Date(mockNow - 14 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoWeeksAgo)).toBe('2 weeks ago');
    });

    it('should use singular "month" for 1 month', () => {
      const oneMonthAgo = new Date(mockNow - 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(oneMonthAgo)).toBe('1 month ago');
    });

    it('should use plural "months" for multiple months', () => {
      const twoMonthsAgo = new Date(mockNow - 60 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoMonthsAgo)).toBe('2 months ago');
    });

    it('should use singular "year" for 1 year', () => {
      const oneYearAgo = new Date(mockNow - 365 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(oneYearAgo)).toBe('1 year ago');
    });

    it('should use plural "years" for multiple years', () => {
      const fiveYearsAgo = new Date(mockNow - 5 * 365 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveYearsAgo)).toBe('5 years ago');
    });
  });
});

describe('formatFullTimestamp', () => {
  describe('Standard Formatting', () => {
    it('should format timestamp in standard format with month name', () => {
      const timestamp = '2025-10-02T20:08:08Z';
      const result = formatFullTimestamp(timestamp);
      expect(result).toContain('October');
      expect(result).toContain('2025');
    });

    it('should include time with AM/PM format', () => {
      const timestamp = '2025-10-02T20:08:08Z';
      const result = formatFullTimestamp(timestamp);
      expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
    });

    it('should format with "at" separator between date and time', () => {
      const timestamp = '2025-10-02T20:08:08Z';
      const result = formatFullTimestamp(timestamp);
      expect(result).toContain(' at ');
    });
  });

  describe('Different Times of Day', () => {
    it('should format morning time with AM', () => {
      const morningTime = '2025-10-02T09:30:00Z';
      const result = formatFullTimestamp(morningTime);
      expect(result).toMatch(/\d{1,2}:\d{2}\s?AM/);
    });

    it('should format afternoon time with PM', () => {
      const afternoonTime = '2025-10-02T15:45:00Z';
      const result = formatFullTimestamp(afternoonTime);
      expect(result).toMatch(/\d{1,2}:\d{2}\s?PM/);
    });

    it('should format midnight correctly', () => {
      const midnight = '2025-10-02T00:00:00Z';
      const result = formatFullTimestamp(midnight);
      expect(result).toMatch(/12:00\s?AM/);
    });

    it('should format noon correctly', () => {
      const noon = '2025-10-02T12:00:00Z';
      const result = formatFullTimestamp(noon);
      expect(result).toMatch(/12:00\s?PM/);
    });
  });

  describe('Different Dates', () => {
    it('should format dates from different months', () => {
      const januaryDate = '2025-01-15T10:00:00Z';
      const result = formatFullTimestamp(januaryDate);
      expect(result).toContain('January');
      expect(result).toContain('15');
      expect(result).toContain('2025');
    });

    it('should format dates from different years', () => {
      const pastYear = '2020-06-20T14:30:00Z';
      const result = formatFullTimestamp(pastYear);
      expect(result).toContain('June');
      expect(result).toContain('20');
      expect(result).toContain('2020');
    });

    it('should format dates with single-digit days correctly', () => {
      const singleDigitDay = '2025-03-05T08:00:00Z';
      const result = formatFullTimestamp(singleDigitDay);
      expect(result).toContain('March');
      expect(result).toContain('5');
      expect(result).toContain('2025');
    });
  });

  describe('Edge Case Handling', () => {
    it('should return fallback message for null timestamp', () => {
      expect(formatFullTimestamp(null as any)).toBe('Invalid date');
    });

    it('should return fallback message for undefined timestamp', () => {
      expect(formatFullTimestamp(undefined as any)).toBe('Invalid date');
    });

    it('should return fallback message for invalid date string', () => {
      expect(formatFullTimestamp('invalid-date')).toBe('Invalid date');
    });

    it('should return fallback message for empty string', () => {
      expect(formatFullTimestamp('')).toBe('Invalid date');
    });
  });
});
