import { describe, it, expect } from 'vitest';
import { parseTimestampToMs, formatMsToTimestamp } from '../timestampUtils';

describe('timestampUtils', () => {
  describe('parseTimestampToMs', () => {
    it('should parse canonical format HH:MM:SS,mmm', () => {
      expect(parseTimestampToMs('00:00:00,000')).toBe(0);
      expect(parseTimestampToMs('00:30:00,000')).toBe(1800000);
      expect(parseTimestampToMs('01:23:45,678')).toBe(5025678);
      expect(parseTimestampToMs('12:34:56,789')).toBe(45296789);
    });

    it('should parse format with dot separator', () => {
      expect(parseTimestampToMs('00:00:00.000')).toBe(0);
      expect(parseTimestampToMs('00:30:00.500')).toBe(1800500);
    });

    it('should parse format without milliseconds', () => {
      expect(parseTimestampToMs('00:00:00')).toBe(0);
      expect(parseTimestampToMs('00:30:00')).toBe(1800000);
    });

    it('should parse format with partial milliseconds', () => {
      expect(parseTimestampToMs('00:00:00,5')).toBe(5);
      expect(parseTimestampToMs('00:00:00,50')).toBe(50);
    });

    it('should parse single-digit hours', () => {
      expect(parseTimestampToMs('1:23:45,678')).toBe(5025678);
      expect(parseTimestampToMs('9:00:00,000')).toBe(32400000);
    });

    it('should handle whitespace', () => {
      expect(parseTimestampToMs('  00:30:00,000  ')).toBe(1800000);
    });

    it('should return null for invalid formats', () => {
      expect(parseTimestampToMs('')).toBeNull();
      expect(parseTimestampToMs('invalid')).toBeNull();
      expect(parseTimestampToMs('30:00:00')).toBeNull(); // invalid hour
      expect(parseTimestampToMs('00:60:00,000')).toBeNull(); // invalid minute
      expect(parseTimestampToMs('00:00:60,000')).toBeNull(); // invalid second
      expect(parseTimestampToMs('00:00:00,1000')).toBeNull(); // too many ms digits
    });

    it('should return null for non-string inputs', () => {
      expect(parseTimestampToMs(null as any)).toBeNull();
      expect(parseTimestampToMs(undefined as any)).toBeNull();
      expect(parseTimestampToMs(123 as any)).toBeNull();
    });
  });

  describe('formatMsToTimestamp', () => {
    it('should format zero milliseconds', () => {
      expect(formatMsToTimestamp(0)).toBe('00:00:00,000');
    });

    it('should format standard timestamps', () => {
      expect(formatMsToTimestamp(1800000)).toBe('00:30:00,000');
      expect(formatMsToTimestamp(5025678)).toBe('01:23:45,678');
      expect(formatMsToTimestamp(45296789)).toBe('12:34:56,789');
    });

    it('should format timestamps with partial milliseconds', () => {
      expect(formatMsToTimestamp(5)).toBe('00:00:00,005');
      expect(formatMsToTimestamp(50)).toBe('00:00:00,050');
      expect(formatMsToTimestamp(500)).toBe('00:00:00,500');
    });

    it('should format long durations', () => {
      expect(formatMsToTimestamp(3600000)).toBe('01:00:00,000');
      expect(formatMsToTimestamp(3661000)).toBe('01:01:01,000');
      expect(formatMsToTimestamp(86400000)).toBe('24:00:00,000');
    });

    it('should clamp negative values to zero', () => {
      expect(formatMsToTimestamp(-100)).toBe('00:00:00,000');
      expect(formatMsToTimestamp(-1000)).toBe('00:00:00,000');
    });

    it('should handle round-trip conversion', () => {
      const testCases = [
        '00:00:00,000',
        '00:30:00,000',
        '01:23:45,678',
        '12:34:56,789',
        '23:59:59,999'
      ];

      testCases.forEach(timestamp => {
        const ms = parseTimestampToMs(timestamp);
        expect(ms).not.toBeNull();
        if (ms !== null) {
          expect(formatMsToTimestamp(ms)).toBe(timestamp);
        }
      });
    });
  });
});

