import { describe, it, expect } from 'vitest';
import { validateFile, generateFileName, MAX_FILE_SIZE } from './storage-utils';

describe('Storage Utilities', () => {
  describe('validateFile', () => {
    it('should validate a correct image file', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      expect(validateFile(file)).toBe(true);
    });

    it('should throw error for too large file', () => {
      const file = { size: MAX_FILE_SIZE + 1, type: 'image/jpeg' } as File;
      expect(() => validateFile(file)).toThrow('File size exceeds the 50MB limit');
    });

    it('should throw error for unsupported type', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      expect(() => validateFile(file)).toThrow('Unsupported file type');
    });
  });

  describe('generateFileName', () => {
    it('should generate a unique file name with same extension', () => {
      const name = 'test.jpg';
      const generated = generateFileName(name);
      expect(generated).toContain('.jpg');
      expect(generated).not.toBe(name);
    });
  });
});
