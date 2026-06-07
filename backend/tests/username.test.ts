import { describe, expect, it } from 'vitest';
import { normalizeUsername, validateUsername } from '../src/utils/username';

describe('username validation', () => {
  it('normalizes and validates', () => {
    expect(validateUsername('@cool_user')).toBe('cool_user');
  });

  it('rejects short names', () => {
    expect(() => validateUsername('ab')).toThrow();
  });
});
