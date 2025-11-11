export interface SubtitleEntry {
  start: string;
  end: string;
  text: string;
  sourceFile?: string;
}
export interface TranscriptFile {
  id: string;
  name: string;
  type: string;
  size: number;
  duration: string | null;
  isPrimary: boolean;
  offset: string;
  content: SubtitleEntry[];
  errors: string[];
}
export type OutputFormat = 'srt' | 'vtt' | 'txt' | 'json';