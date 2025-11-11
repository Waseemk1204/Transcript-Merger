// timestamp-arith.ts (drop-in utilities)

// Parse "HH:MM:SS,mmm" or "H:MM:SS.m" etc. Returns milliseconds
export function parseTimestampToMs(ts: string): number | null {
  if (!ts || typeof ts !== 'string') return null;
  
  // normalize separators
  const t = ts.trim().replace(/\./g, ',');
  const m = t.match(/^(\d{1,2}):(\d{2}):(\d{2}),?(\d{0,3})$/);
  if (!m) return null;
  
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ss = parseInt(m[3], 10);
  const ms = (m[4] || '0').padEnd(3, '0').slice(0, 3);
  
  return ((hh * 3600) + (mm * 60) + ss) * 1000 + parseInt(ms, 10);
}

// Format ms -> "HH:MM:SS,mmm"
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

// Add offset (ms) to a timestamp line "t1 --> t2". Returns canonicalized "HH:MM:SS,mmm --> HH:MM:SS,mmm" or null if both fail
export function shiftTimestampLine(line: string, offsetMs: number): string | null {
  if (!line) return null;
  
  // permissive extract first two time tokens
  const tokens = Array.from(line.matchAll(/\d{1,2}:\d{2}:\d{2}[,\.]?\d{0,3}/g), m => m[0]);
  if (tokens.length >= 2) {
    const t1 = parseTimestampToMs(tokens[0].replace('.', ','));
    const t2 = parseTimestampToMs(tokens[1].replace('.', ','));
    if (t1 !== null && t2 !== null) {
      return `${formatMsToTimestamp(t1 + offsetMs)} --> ${formatMsToTimestamp(t2 + offsetMs)}`;
    }
  }
  
  // fallback: if no tokens or only one token, return null to let caller create fallback times
  return null;
}

// Small helper to add ms and return canonical timestamp line for fallback usage
export function makeFallbackTimestamp(prevEndMs: number, offsetMs: number, durationMs = 200): string {
  const start = (prevEndMs !== null && prevEndMs !== undefined) ? (prevEndMs + 1) : 1;
  return `${formatMsToTimestamp(start + offsetMs)} --> ${formatMsToTimestamp(start + durationMs + offsetMs)}`;
}

