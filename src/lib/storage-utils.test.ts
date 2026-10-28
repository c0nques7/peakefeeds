import { describe, it, expect } from 'vitest';
import { validateFile, generateFileName, verifiedMediaType, MAX_FILE_SIZE } from './storage-utils';

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
    it('names files with a random UUID and the extension for their type', () => {
      expect(generateFileName('image/jpeg')).toMatch(/^[0-9a-f-]{36}\.jpg$/);
      expect(generateFileName('video/quicktime')).toMatch(/\.mov$/);
      expect(generateFileName('image/jpeg')).not.toBe(generateFileName('image/jpeg'));
    });

    it('refuses types we do not store', () => {
      expect(() => generateFileName('text/html')).toThrow('Unsupported file type');
    });
  });

  describe('verifiedMediaType', () => {
    const bytes = (...parts: (number[] | string)[]) =>
      new Uint8Array(parts.flatMap(p => (typeof p === 'string' ? [...p].map(c => c.charCodeAt(0)) : p)));
    const png = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

    it('accepts content that matches the declared type', () => {
      expect(verifiedMediaType(png, 'image/png')).toBe('image/png');
      expect(verifiedMediaType(bytes([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg')).toBe('image/jpeg');
      expect(verifiedMediaType(bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '), 'image/webp')).toBe('image/webp');
    });

    it('rejects HTML declared as an image', () => {
      expect(() => verifiedMediaType(bytes('<html><script>alert(1)</script>'), 'image/png')).toThrow('File contents do not match its type');
    });

    it('rejects SVG declared as an image', () => {
      expect(() => verifiedMediaType(bytes('<svg xmlns="http://www.w3.org/2000/svg">'), 'image/png')).toThrow();
    });

    it('accepts an image whose extension names a different image type, storing what the bytes say', () => {
      expect(verifiedMediaType(png, 'image/jpeg')).toBe('image/png');
      expect(verifiedMediaType(bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '), 'image/jpeg')).toBe('image/webp');
    });

    it('rejects an image declared as a video, and a video declared as an image', () => {
      expect(() => verifiedMediaType(png, 'video/mp4')).toThrow();
      expect(() => verifiedMediaType(bytes([0, 0, 0, 0x18], 'ftypisom'), 'image/png')).toThrow();
    });

    it('treats MP4 and QuickTime as interchangeable but stores what the bytes say', () => {
      const mov = bytes([0, 0, 0, 0x14], 'ftypqt  ');
      const mp4 = bytes([0, 0, 0, 0x18], 'ftypisom');
      expect(verifiedMediaType(mov, 'video/mp4')).toBe('video/quicktime');
      expect(verifiedMediaType(mp4, 'video/quicktime')).toBe('video/mp4');
    });
  });
});
