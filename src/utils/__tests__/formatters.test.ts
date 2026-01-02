import {
  formatFileSize,
  formatDuration,
  formatDate,
  sanitizeFileName,
  extractPlaylistId,
} from '../formatters';

describe('formatters', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2621440)).toBe('2.5 MB');
    });

    it('should handle small values', () => {
      expect(formatFileSize(512)).toBe('512 Bytes');
      expect(formatFileSize(1)).toBe('1 Bytes');
    });
  });

  describe('formatDuration', () => {
    it('should format duration correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(59)).toBe('0:59');
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(3661)).toBe('1:01:01');
    });

    it('should pad seconds correctly', () => {
      expect(formatDuration(5)).toBe('0:05');
      expect(formatDuration(65)).toBe('1:05');
    });

    it('should handle hours correctly', () => {
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(7200)).toBe('2:00:00');
      expect(formatDuration(3723)).toBe('1:02:03');
    });
  });

  describe('formatDate', () => {
    it('should return "Just now" for recent times', () => {
      const now = new Date();
      expect(formatDate(now.toISOString())).toBe('Just now');
    });

    it('should return minutes ago for times less than an hour', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatDate(fiveMinutesAgo.toISOString())).toBe('5 minutes ago');
    });

    it('should return singular minute', () => {
      const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000 - 1000);
      expect(formatDate(oneMinuteAgo.toISOString())).toBe('1 minute ago');
    });

    it('should return hours ago for times less than a day', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(formatDate(threeHoursAgo.toISOString())).toBe('3 hours ago');
    });

    it('should return singular hour', () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      expect(formatDate(oneHourAgo.toISOString())).toBe('1 hour ago');
    });

    it('should return days ago for times less than a week', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(formatDate(twoDaysAgo.toISOString())).toBe('2 days ago');
    });

    it('should return singular day', () => {
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      expect(formatDate(oneDayAgo.toISOString())).toBe('1 day ago');
    });

    it('should return formatted date for older times', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const result = formatDate(twoWeeksAgo.toISOString());
      // Should be a date string like "12/15/2024" or similar locale format
      expect(result).not.toContain('ago');
    });
  });

  describe('sanitizeFileName', () => {
    it('should sanitize file names', () => {
      expect(sanitizeFileName('test/file:name')).toBe('test_file_name');
      expect(sanitizeFileName('normal file')).toBe('normal file');
    });

    it('should handle multiple special characters', () => {
      expect(sanitizeFileName('file<>:"/\\|?*name')).toBe('file_________name');
    });

    it('should trim whitespace', () => {
      expect(sanitizeFileName('  test file  ')).toBe('test file');
    });

    it('should handle empty string', () => {
      expect(sanitizeFileName('')).toBe('');
    });
  });

  describe('extractPlaylistId', () => {
    it('should extract playlist ID from URL', () => {
      expect(extractPlaylistId('https://www.youtube.com/playlist?list=PLtest1234567890')).toBe(
        'PLtest1234567890'
      );
      expect(extractPlaylistId('https://www.youtube.com/watch?v=abc&list=PLtest4567890123')).toBe(
        'PLtest4567890123'
      );
      expect(extractPlaylistId('PLtest7890123456')).toBe('PLtest7890123456');
    });

    it('should extract RDCLAK IDs', () => {
      expect(extractPlaylistId('RDCLAK5uy_test1234')).toBe('RDCLAK5uy_test1234');
    });

    it('should extract OLAK IDs', () => {
      expect(extractPlaylistId('OLAK5uy_test1234')).toBe('OLAK5uy_test1234');
    });

    it('should return null for invalid input', () => {
      expect(extractPlaylistId('invalid')).toBeNull();
      expect(extractPlaylistId('')).toBeNull();
      expect(extractPlaylistId('short')).toBeNull();
    });

    it('should extract from URL with query parameters', () => {
      expect(extractPlaylistId('https://youtube.com/playlist?list=PLtest1234567890&index=1')).toBe(
        'PLtest1234567890'
      );
    });
  });
});
