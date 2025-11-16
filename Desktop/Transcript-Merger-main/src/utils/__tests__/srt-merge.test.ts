import { describe, it, expect } from 'vitest';
import { mergeParsedFilesSequential, ParsedFile } from '../srt-merge';

describe('mergeParsedFilesSequential', () => {
  describe('basic functionality', () => {
    it('should handle empty input', () => {
      const result = mergeParsedFilesSequential([]);
      expect(result.mergedCues).toEqual([]);
      expect(result.errors).toContain('no_files_uploaded');
    });

    it('should handle single file', () => {
      const file1: ParsedFile = {
        filename: 'file1.srt',
        cues: [
          { startMs: 0, endMs: 1000, text: 'Hello' },
          { startMs: 1000, endMs: 2000, text: 'World' }
        ]
      };

      const result = mergeParsedFilesSequential([file1]);
      expect(result.mergedCues).toHaveLength(2);
      expect(result.mergedCues[0]).toEqual({ startMs: 0, endMs: 1000, text: 'Hello', sourceFileIndex: 0 });
      expect(result.mergedCues[1]).toEqual({ startMs: 1000, endMs: 2000, text: 'World', sourceFileIndex: 0 });
      expect(result.warnings).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should handle two files with cumulative shift', () => {
      const file1: ParsedFile = {
        filename: 'file1.srt',
        cues: [{ startMs: 0, endMs: 1000, text: 'A' }]
      };

      const file2: ParsedFile = {
        filename: 'file2.srt',
        cues: [{ startMs: 0, endMs: 1000, text: 'B' }]
      };

      const result = mergeParsedFilesSequential([file1, file2]);
      expect(result.mergedCues).toHaveLength(2);

      // F1 shifted by 0
      expect(result.mergedCues[0]).toEqual({ startMs: 0, endMs: 1000, text: 'A', sourceFileIndex: 0 });

      // F2 shifted by F1.end (1,000)
      expect(result.mergedCues[1]).toEqual({ startMs: 1000, endMs: 2000, text: 'B', sourceFileIndex: 1 });
    });
  });

  describe('cumulative shifts for three files', () => {
    it('should compute correct cumulative shifts for example case', () => {
      const f1: ParsedFile = {
        filename: 'f1.srt',
        cues: [{ startMs: 0, endMs: 1683760, text: 'A' }]
      }; // ends 00:28:03,760

      const f2: ParsedFile = {
        filename: 'f2.srt',
        cues: [{ startMs: 0, endMs: 1800000, text: 'B' }]
      }; // ends 00:30:00,000

      const f3: ParsedFile = {
        filename: 'f3.srt',
        cues: [{ startMs: 0, endMs: 1306220, text: 'C' }]
      }; // ends 00:21:46,220

      const { mergedCues, warnings, errors } = mergeParsedFilesSequential([f1, f2, f3]);

      expect(mergedCues).toHaveLength(3);

      // f1 shifted by 0
      expect(mergedCues[0].startMs).toBe(0);
      expect(mergedCues[0].endMs).toBe(1683760);

      // f2 shifted by f1.end (1,683,760)
      expect(mergedCues[1].startMs).toBe(0 + 1683760);
      expect(mergedCues[1].endMs).toBe(1800000 + 1683760); // 3,483,760

      // f3 shifted by f1.end + f2.end (1,683,760 + 1,800,000 = 3,483,760)
      expect(mergedCues[2].startMs).toBe(0 + 3483760);
      expect(mergedCues[2].endMs).toBe(1306220 + 3483760); // 4,789,980

      expect(warnings).toEqual([]);
      expect(errors).toEqual([]);
    });

    it('should handle files with non-zero start times', () => {
      const f1: ParsedFile = {
        filename: 'f1.srt',
        cues: [{ startMs: 100, endMs: 2000, text: 'A' }]
      };

      const f2: ParsedFile = {
        filename: 'f2.srt',
        cues: [{ startMs: 50, endMs: 1500, text: 'B' }]
      };

      const result = mergeParsedFilesSequential([f1, f2]);

      // f1 shifts by 0
      expect(result.mergedCues[0]).toEqual({
        startMs: 100,
        endMs: 2000,
        text: 'A',
        sourceFileIndex: 0
      });

      // f2 shifts by f1.end (2000)
      expect(result.mergedCues[1]).toEqual({
        startMs: 50 + 2000,
        endMs: 1500 + 2000,
        text: 'B',
        sourceFileIndex: 1
      });
    });
  });

  describe('four-file merge', () => {
    it('should compute cumulative shifts for four files', () => {
      const f1: ParsedFile = {
        cues: [{ startMs: 0, endMs: 1000, text: '1' }]
      };

      const f2: ParsedFile = {
        cues: [{ startMs: 0, endMs: 1000, text: '2' }]
      };

      const f3: ParsedFile = {
        cues: [{ startMs: 0, endMs: 1000, text: '3' }]
      };

      const f4: ParsedFile = {
        cues: [{ startMs: 0, endMs: 1000, text: '4' }]
      };

      const result = mergeParsedFilesSequential([f1, f2, f3, f4]);

      expect(result.mergedCues).toHaveLength(4);
      expect(result.mergedCues[0].endMs).toBe(1000);
      expect(result.mergedCues[1].startMs).toBe(1000);
      expect(result.mergedCues[1].endMs).toBe(2000);
      expect(result.mergedCues[2].startMs).toBe(2000);
      expect(result.mergedCues[2].endMs).toBe(3000);
      expect(result.mergedCues[3].startMs).toBe(3000);
      expect(result.mergedCues[3].endMs).toBe(4000);
    });
  });

  describe('per-file offset override', () => {
    it('should use perFileOffsetMs to override duration for subsequent files', () => {
      const f1: ParsedFile = {
        cues: [{ startMs: 0, endMs: 5000, text: 'A' }]
      };

      const f2: ParsedFile = {
        cues: [{ startMs: 0, endMs: 1000, text: 'B' }]
      };

      // Override: treat file 1 as having duration 10000 instead of 5000
      const result = mergeParsedFilesSequential([f1, f2], {
        perFileOffsetMs: { 0: 10000 }
      });

      expect(result.mergedCues[0].endMs).toBe(5000);
      expect(result.mergedCues[1].startMs).toBe(0 + 10000);
      expect(result.mergedCues[1].endMs).toBe(1000 + 10000);
    });

    it('should apply multiple per-file offsets', () => {
      const f1: ParsedFile = {
        cues: [{ startMs: 0, endMs: 1000, text: 'A' }]
      };

      const f2: ParsedFile = {
        cues: [{ startMs: 0, endMs: 1000, text: 'B' }]
      };

      const f3: ParsedFile = {
        cues: [{ startMs: 0, endMs: 1000, text: 'C' }]
      };

      const result = mergeParsedFilesSequential([f1, f2, f3], {
        perFileOffsetMs: { 0: 2000, 1: 3000 }
      });

      expect(result.mergedCues[0].endMs).toBe(1000);
      expect(result.mergedCues[1].startMs).toBe(2000);
      expect(result.mergedCues[1].endMs).toBe(3000);
      expect(result.mergedCues[2].startMs).toBe(2000 + 3000); // 5000
      expect(result.mergedCues[2].endMs).toBe(1000 + 5000);
    });
  });

  describe('sorting', () => {
    it('should sort by start time when sortFinalByStart is true', () => {
      const f1: ParsedFile = {
        cues: [{ startMs: 1000, endMs: 2000, text: 'A' }]
      };

      const f2: ParsedFile = {
        cues: [{ startMs: 0, endMs: 500, text: 'B' }]
      };

      const result = mergeParsedFilesSequential([f1, f2], { sortFinalByStart: true });

      // After sorting by startMs
        // F1 comes first (startMs=1000), F2 comes second (startMs=2000 after shift)
        // When sorted, smaller startMs comes first: F1(1000) before F2(2000)
        expect(result.mergedCues[0].text).toBe('A');
        expect(result.mergedCues[0].startMs).toBe(1000);
        expect(result.mergedCues[1].text).toBe('B');
        expect(result.mergedCues[1].startMs).toBe(2000);
    });

    it('should preserve order when sortFinalByStart is false (default)', () => {
      const f1: ParsedFile = {
        cues: [{ startMs: 1000, endMs: 2000, text: 'A' }]
      };

      const f2: ParsedFile = {
        cues: [{ startMs: 0, endMs: 500, text: 'B' }]
      };

      const result = mergeParsedFilesSequential([f1, f2], { sortFinalByStart: false });

        // Preserve original order (F1 then F2)
        expect(result.mergedCues[0].text).toBe('A');
        expect(result.mergedCues[0].startMs).toBe(1000);
        expect(result.mergedCues[1].text).toBe('B');
        expect(result.mergedCues[1].startMs).toBe(2000);
      });
    });

  describe('edge cases and validation', () => {
    it('should produce warning for file with no cues', () => {
      const f1: ParsedFile = {
        cues: [{ startMs: 0, endMs: 1000, text: 'A' }]
      };

      const f2: ParsedFile = {
        cues: []
      };

      const result = mergeParsedFilesSequential([f1, f2]);

      expect(result.warnings).toContain('file_1_no_cues');
    });

    it('should produce warning for malformed cue (non-finite times)', () => {
      const f1: ParsedFile = {
        cues: [
          { startMs: 0, endMs: 1000, text: 'A' },
          { startMs: NaN, endMs: 2000, text: 'B' }
        ]
      };

      const result = mergeParsedFilesSequential([f1]);

      expect(result.mergedCues).toHaveLength(1);
      expect(result.warnings).toContain('file_0_malformed_cue');
    });

    it('should detect negative timestamps after shift', () => {
      const f1: ParsedFile = {
        cues: [{ startMs: -1000, endMs: -500, text: 'A' }]
      };

      const result = mergeParsedFilesSequential([f1]);

      expect(result.errors).toContain('negative_timestamps');
    });

    it('should warn about cue ending before start', () => {
      const f1: ParsedFile = {
        cues: [{ startMs: 2000, endMs: 1000, text: 'A' }]
      };

      const result = mergeParsedFilesSequential([f1]);

      expect(result.warnings).toContain('cue_end_before_start');
    });

    it('should handle files with missing timestamps gracefully', () => {
      const f1: ParsedFile = {
        cues: [{ startMs: 0, endMs: 1000, text: 'A' }]
      };

      const f2: ParsedFile = {
        cues: []
      };

      const f3: ParsedFile = {
        cues: [{ startMs: 0, endMs: 1000, text: 'C' }]
      };

      const result = mergeParsedFilesSequential([f1, f2, f3]);

      // f1: shift 0, ends at 1000
      // f2: no cues, still adds 0 to shift (no baseEndMs)
      // f3: shift still 1000, ends at 2000
      expect(result.mergedCues).toHaveLength(2);
      expect(result.mergedCues[0].endMs).toBe(1000);
      expect(result.mergedCues[1].startMs).toBe(1000);
    });

    it('should handle multiple cues per file', () => {
      const f1: ParsedFile = {
        cues: [
          { startMs: 0, endMs: 1000, text: 'A' },
          { startMs: 1000, endMs: 2000, text: 'B' },
          { startMs: 2000, endMs: 3000, text: 'C' }
        ]
      };

      const f2: ParsedFile = {
        cues: [
          { startMs: 0, endMs: 1000, text: 'X' },
          { startMs: 1000, endMs: 2000, text: 'Y' }
        ]
      };

      const result = mergeParsedFilesSequential([f1, f2]);

      expect(result.mergedCues).toHaveLength(5);
      // f1 cues: 0-1000, 1000-2000, 2000-3000
      expect(result.mergedCues[0]).toEqual({ startMs: 0, endMs: 1000, text: 'A', sourceFileIndex: 0 });
      expect(result.mergedCues[1]).toEqual({ startMs: 1000, endMs: 2000, text: 'B', sourceFileIndex: 0 });
      expect(result.mergedCues[2]).toEqual({ startMs: 2000, endMs: 3000, text: 'C', sourceFileIndex: 0 });

      // f2 cues shifted by 3000: 3000-4000, 4000-5000
      expect(result.mergedCues[3]).toEqual({ startMs: 3000, endMs: 4000, text: 'X', sourceFileIndex: 1 });
      expect(result.mergedCues[4]).toEqual({ startMs: 4000, endMs: 5000, text: 'Y', sourceFileIndex: 1 });
    });
  });

  describe('sourceFileIndex tracking', () => {
    it('should track source file index for each cue', () => {
      const f1: ParsedFile = {
        cues: [{ startMs: 0, endMs: 1000, text: 'A' }]
      };

      const f2: ParsedFile = {
        cues: [{ startMs: 0, endMs: 1000, text: 'B' }]
      };

      const f3: ParsedFile = {
        cues: [{ startMs: 0, endMs: 1000, text: 'C' }]
      };

      const result = mergeParsedFilesSequential([f1, f2, f3]);

      expect(result.mergedCues[0].sourceFileIndex).toBe(0);
      expect(result.mergedCues[1].sourceFileIndex).toBe(1);
      expect(result.mergedCues[2].sourceFileIndex).toBe(2);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle realistic multi-language interview transcripts', () => {
      // Simulate: Interview segment 1 (English)
      const segment1: ParsedFile = {
        filename: 'interview_part1.srt',
        cues: [
          { startMs: 0, endMs: 2000, text: 'Good morning' },
          { startMs: 2100, endMs: 5000, text: 'How are you today?' },
          { startMs: 5500, endMs: 8000, text: 'Thanks for having me' }
        ]
      };

      // Simulate: Interview segment 2 (English)
      const segment2: ParsedFile = {
        filename: 'interview_part2.srt',
        cues: [
          { startMs: 0, endMs: 2500, text: 'I wanted to ask about...' },
          { startMs: 3000, endMs: 7000, text: 'That is a great question' }
        ]
      };

      // Simulate: Interview segment 3 (English)
      const segment3: ParsedFile = {
        filename: 'interview_part3.srt',
        cues: [
          { startMs: 0, endMs: 1500, text: 'Thank you very much' }
        ]
      };

      const result = mergeParsedFilesSequential([segment1, segment2, segment3]);

      expect(result.mergedCues).toHaveLength(6);
      expect(result.errors).toEqual([]);

      // Verify chronological order
      for (let i = 0; i < result.mergedCues.length - 1; i++) {
        expect(result.mergedCues[i].endMs).toBeLessThanOrEqual(result.mergedCues[i + 1].startMs);
      }
    });

    it('should handle precision with milliseconds', () => {
      const f1: ParsedFile = {
        cues: [
          { startMs: 100, endMs: 500, text: 'A' },
          { startMs: 600, endMs: 1234, text: 'B' }
        ]
      };

      const f2: ParsedFile = {
        cues: [
          { startMs: 50, endMs: 333, text: 'C' }
        ]
      };

      const result = mergeParsedFilesSequential([f1, f2]);

      // Verify precision is maintained
      expect(result.mergedCues[0].startMs).toBe(100);
      expect(result.mergedCues[1].endMs).toBe(1234);
      expect(result.mergedCues[2].startMs).toBe(50 + 1234);
      expect(result.mergedCues[2].endMs).toBe(333 + 1234);
    });
  });
});
