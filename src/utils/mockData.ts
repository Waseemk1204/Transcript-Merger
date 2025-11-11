import { SubtitleEntry } from '../types';
export function generateMockSubtitles(fileName: string, count: number = 5): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  for (let i = 0; i < count; i++) {
    const startMs = i * 5000;
    const endMs = startMs + 4000;
    entries.push({
      start: formatTimestamp(startMs),
      end: formatTimestamp(endMs),
      text: `Sample subtitle ${i + 1} from ${fileName}`,
      sourceFile: fileName
    });
  }
  return entries;
}
export function formatTimestamp(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor(ms % 3600000 / 60000);
  const seconds = Math.floor(ms % 60000 / 1000);
  const milliseconds = ms % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}
export function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':');
  if (parts.length !== 3) return 0;
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const secondsParts = parts[2].split(',');
  const seconds = parseInt(secondsParts[0]);
  const milliseconds = secondsParts[1] ? parseInt(secondsParts[1]) : 0;
  return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
}