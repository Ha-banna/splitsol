import { describe, expect, it } from 'vitest';
import { parseGroupIconPayload } from '../src/utils/groupIcon';

describe('parseGroupIconPayload', () => {
  it('parses valid jpeg base64', () => {
    const tiny = Buffer.from('fake-image').toString('base64');
    const { buffer, mimeType, ext } = parseGroupIconPayload(tiny, 'image/jpeg');
    expect(buffer.length).toBeGreaterThan(0);
    expect(mimeType).toBe('image/jpeg');
    expect(ext).toBe('jpg');
  });

  it('rejects oversized payload', () => {
    const huge = Buffer.alloc(3 * 1024 * 1024).toString('base64');
    expect(() => parseGroupIconPayload(huge, 'image/png')).toThrow(/2MB/);
  });
});
