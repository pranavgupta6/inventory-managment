import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatRelativeTime } from '../lib/utils.js';

describe('cn()', () => {
  it('merges class strings', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('handles falsy values', () => {
    expect(cn('a', false, undefined, 'b')).toBe('a b');
  });

  it('merges tailwind conflicts correctly', () => {
    // tailwind-merge should resolve conflicting classes
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });
});

describe('formatDate()', () => {
  it('formats a date object', () => {
    const date = new Date('2024-01-15');
    const result = formatDate(date);
    expect(result).toContain('2024');
    expect(result).toContain('Jan');
  });
});

describe('formatRelativeTime()', () => {
  it('returns "just now" for very recent timestamps', () => {
    const result = formatRelativeTime(Date.now() - 5000);
    expect(result).toBe('just now');
  });

  it('returns minutes ago for recent timestamps', () => {
    const result = formatRelativeTime(Date.now() - 5 * 60 * 1000);
    expect(result).toBe('5m ago');
  });
});
