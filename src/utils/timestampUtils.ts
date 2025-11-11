// timestampUtils.ts - Timestamp parsing and formatting utilities

/**
 * Parse "HH:MM:SS,mmm" or "H:MM:SS.m" etc. Returns milliseconds or null if invalid.
 * Accepts various formats with dot or comma separators for milliseconds.
 */
export function parseTimestampToMs(ts: string): number | null {
  if (!ts || typeof ts !== 'string') return null;
  
  // normalize separators (dot to comma)
  const t = ts.trim().replace(/\./g, ',');
  const m = t.match(/^(\d{1,2}):(\d{2}):(\d{2}),?(\d{0,3})$/);
  if (!m) return null;
  
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ss = parseInt(m[3], 10);
  
  // Validate ranges
  if (hh > 23 || mm > 59 || ss > 59) return null;
  
  // Handle partial milliseconds: interpret as-is (e.g., "5" = 5ms, "50" = 50ms, "500" = 500ms)
  // Don't pad - if user types "5", they mean 5ms, not 500ms
  const msStr = m[4] || '0';
  let ms = 0;
  if (msStr.length === 1) {
    ms = parseInt(msStr, 10); // "5" = 5ms
  } else if (msStr.length === 2) {
    ms = parseInt(msStr, 10); // "50" = 50ms
  } else {
    ms = parseInt(msStr.slice(0, 3), 10); // "500" or longer = first 3 digits
  }
  
  return ((hh * 3600) + (mm * 60) + ss) * 1000 + ms;
}

/**
 * Format milliseconds to canonical "HH:MM:SS,mmm" timestamp string.
 * Negative values are clamped to 0.
 */
export function formatMsToTimestamp(msTotal: number): string {
  if (msTotal < 0) msTotal = 0;
  const ms = msTotal % 1000;
  let s = Math.floor(msTotal / 1000);
  const hh = Math.floor(s / 3600);
  s = s % 3600;
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)},${String(ms).padStart(3, '0')}`;
}

