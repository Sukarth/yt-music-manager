import { formatFileSize, formatDuration, sanitizeFileName, extractPlaylistId } from '../formatters';

describe('formatters', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('formatDuration', () => {
    it('should format duration correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(59)).toBe('0:59');
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(3661)).toBe('1:01:01');
    });
  });

  describe('sanitizeFileName', () => {
    it('should sanitize file names', () => {
      expect(sanitizeFileName('test/file:name')).toBe('test_file_name');
      expect(sanitizeFileName('normal file')).toBe('normal file');
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

    it('should return null for invalid input', () => {
      expect(extractPlaylistId('invalid')).toBeNull();
      expect(extractPlaylistId('')).toBeNull();
      expect(extractPlaylistId('short')).toBeNull();
    });
  });
});
