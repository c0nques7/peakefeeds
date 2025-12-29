
import { describe, it, expect } from 'vitest';
import { parseMediaUrl } from '@/lib/media-parser';

describe('Video Type Detection', () => {
  it('should detect generic video files', () => {
    const url = 'https://example.com/video.mp4';
    const result = parseMediaUrl(url);
    expect(result.type).toBe('video');
    expect(result.id).toBeNull();
  });

  it('should detect YouTube videos (long format)', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const result = parseMediaUrl(url);
    expect(result.type).toBe('youtube');
    expect(result.id).toBe('dQw4w9WgXcQ');
  });

  it('should detect YouTube videos (short format)', () => {
    const url = 'https://youtu.be/dQw4w9WgXcQ';
    const result = parseMediaUrl(url);
    expect(result.type).toBe('youtube');
    expect(result.id).toBe('dQw4w9WgXcQ');
  });

  it('should detect YouTube videos (embed format)', () => {
    const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    const result = parseMediaUrl(url);
    expect(result.type).toBe('youtube');
    expect(result.id).toBe('dQw4w9WgXcQ');
  });

  it('should detect local blob videos (defaults to image, overridden by forcedType in app)', () => {
    const url = 'blob:http://localhost:3000/1234-5678';
    const result = parseMediaUrl(url);
    // Current implementation treats all blobs as images by default
    expect(result.type).toBe('image'); 
  });
});
