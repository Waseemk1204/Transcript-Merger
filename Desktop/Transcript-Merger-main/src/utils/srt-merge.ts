import { parseTimestampToMs, shiftTimestampLine, makeFallbackTimestamp } from './timestamp-arith';

export interface SrtBlock {
  origIndex: number | null;
  tsRaw: string;
  texts: string[];
}

export interface Cue {
  startMs: number;
  endMs: number;
  text: string;
  sourceFileIndex?: number;
}

export interface ParsedFile {
  filename?: string;
  cues: Cue[];
  meta?: Record<string, any>;
}

export interface MergeOptions {
  perFileOffsetMs?: Record<number, number>;
  useEffectiveEndMs?: boolean;
  sortFinalByStart?: boolean;
}

export interface SequentialMergeResult {
  mergedCues: Cue[];
  warnings: string[];
  errors: string[];
}

export interface MergeDiagnostic {
  src_file: string;
  original_index: number | null;
  original_timestamp_line: string;
  final_index: number;
  final_timestamp: string;
  action: 'normal' | 'normalized' | 'fallback';
  reason?: string;
}

export interface MergeResult {
  mergedSrt: string;
  diagnostics: MergeDiagnostic[];
  stats: {
    totalInputCues: number;
    totalOutputCues: number;
    parseIssuesCount: number;
    filesProcessed: number;
  };
}

/**
 * Merge parsed files sequentially using cumulative shifts.
 *
 * parsedFiles: [
 *   { filename, cues: [{ startMs, endMs, text, ... }], meta?: {} },
 *   ...
 * ]
 * options: {
 *   perFileOffsetMs: { [fileIndex]: ms }, // optional explicit shift for a specific file (applies to subsequent files)
 *   useEffectiveEndMs: true|false, // if true, use each file's max endMs as effective duration for appending
 *   sortFinalByStart: false|true // whether to sort final cues by start time
 * }
 */
export function mergeParsedFilesSequential(
  parsedFiles: ParsedFile[],
  options: MergeOptions = {}
): SequentialMergeResult {
  const perFileOffsetMs = options.perFileOffsetMs || {};
  const sortFinalByStart = options.sortFinalByStart ?? false;

  // Validate input
  if (!Array.isArray(parsedFiles) || parsedFiles.length === 0) {
    return { mergedCues: [], warnings: ['no_files'], errors: ['no_files_uploaded'] };
  }

  // compute effective durations / baseEndMs per file
  const baseEndMs = parsedFiles.map((pf) => {
    const cues = pf.cues || [];
    // find maximum endMs in file
    const ends = cues
      .map(c => (Number.isFinite(c.endMs) ? c.endMs : null))
      .filter(x => x !== null) as number[];
    if (ends.length === 0) return null; // no timestamps
    return Math.max(...ends);
  });

  // compute cumulative shifts
  const cumulativeShift = new Array(parsedFiles.length).fill(0);
  let runningShift = 0;

  for (let i = 0; i < parsedFiles.length; ++i) {
    cumulativeShift[i] = runningShift; // file i will be shifted by runningShift

    // Determine effective duration for this file to add to runningShift for next files:
    // priority: explicit perFileOffsetMs[i] (applies to subsequent files),
    // else use baseEndMs[i] if available,
    // else fallback to computed heuristics (max end - min start OR 0)
    if (perFileOffsetMs.hasOwnProperty(i)) {
      // if user wants this file to be considered a specific length
      runningShift = runningShift + perFileOffsetMs[i];
    } else if (baseEndMs[i] !== null && baseEndMs[i] !== undefined) {
      // Use max endMs as the length reference for appending
      runningShift = runningShift + (baseEndMs[i] as number);
    } else {
      // fallback: compute duration from cues if possible
      const cues = parsedFiles[i].cues || [];
      const starts = cues
        .map(c => (Number.isFinite(c.startMs) ? c.startMs : null))
        .filter(x => x !== null) as number[];
      const ends = cues
        .map(c => (Number.isFinite(c.endMs) ? c.endMs : null))
        .filter(x => x !== null) as number[];
      if (starts.length && ends.length) {
        const dur = Math.max(...ends) - Math.min(...starts);
        runningShift = runningShift + Math.max(0, dur);
      } else {
        // No times found — cannot auto-append reliably; leave runningShift unchanged
        // Add a warning entry later
      }
    }
  }

  // Apply shifts to cues
  const merged: Cue[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < parsedFiles.length; ++i) {
    const pf = parsedFiles[i];
    const shift = cumulativeShift[i] || 0;

    if (!pf.cues || pf.cues.length === 0) {
      warnings.push(`file_${i}_no_cues`);
      continue;
    }

    for (const cue of pf.cues) {
      if (!Number.isFinite(cue.startMs) || !Number.isFinite(cue.endMs)) {
        warnings.push(`file_${i}_malformed_cue`);
        continue;
      }
      merged.push({
        startMs: cue.startMs + shift,
        endMs: cue.endMs + shift,
        text: cue.text,
        sourceFileIndex: i,
      });
    }
  }

  // Optionally sort
  if (sortFinalByStart) merged.sort((a, b) => a.startMs - b.startMs);

  // Validate merged list for overlaps or negative times
  for (let i = 0; i < merged.length; ++i) {
    const c = merged[i];
    if (c.startMs < 0 || c.endMs < 0) {
      errors.push('negative_timestamps');
      break;
    }
    if (c.endMs < c.startMs) {
      warnings.push('cue_end_before_start');
    }
    if (i > 0 && merged[i - 1].endMs > c.startMs && merged[i - 1].sourceFileIndex === c.sourceFileIndex) {
      warnings.push('overlap_detected');
      // keep going; UI can show details
    }
  }

  return { mergedCues: merged, warnings, errors };
}

// Permissive SRT block parser
export function permissiveParseSrt(content: string): SrtBlock[] {
  const blocks: SrtBlock[] = [];
  const lines = content.split(/\r?\n/);
  
  let currentBlock: SrtBlock | null = null;
  let textLines: string[] = [];
  let expectingIndex = true;
  let expectingTimestamp = false;
  let isReadingText = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line looks like an index (just digits) - this starts a new block
    // Only treat as index if we're expecting one OR if we have a complete previous block
    if (/^\d+$/.test(line)) {
      // If we have a current block, finalize it first
      if (currentBlock && (currentBlock.tsRaw || textLines.length > 0)) {
        currentBlock.texts = textLines;
        blocks.push(currentBlock);
        textLines = [];
      }
      
      // Start new block
      currentBlock = {
        origIndex: parseInt(line, 10),
        tsRaw: '',
        texts: []
      };
      expectingIndex = false;
      expectingTimestamp = true;
      isReadingText = false;
      continue;
    }
    
    // Check if line looks like a timestamp (contains --> or time pattern)
    if (expectingTimestamp && (line.includes('-->') || /\d{1,2}:\d{2}:\d{2}/.test(line))) {
      if (currentBlock) {
        currentBlock.tsRaw = line;
        expectingTimestamp = false;
        isReadingText = true; // After timestamp, we're reading text
      }
      continue;
    }
    
    // If we're reading text (have timestamp), collect all lines including blank ones
    // until we hit the next index number
    if (isReadingText && currentBlock) {
      // Keep the raw line to preserve blank lines, but trim for empty check
      if (line === '') {
        // Blank line within text - preserve it
        textLines.push('');
      } else {
        // Non-empty text line
        textLines.push(line);
      }
      continue;
    }
    
    // Fallback: if we have a block but no timestamp yet, this might be text
    if (currentBlock && !expectingTimestamp) {
      if (line === '') {
        textLines.push('');
      } else {
        textLines.push(line);
      }
      isReadingText = true;
    } else if (!currentBlock && !expectingIndex) {
      // If we're not expecting an index but don't have a block, create one
      currentBlock = {
        origIndex: null,
        tsRaw: '',
        texts: [line]
      };
      isReadingText = true;
    }
  }
  
  // Handle last block if file doesn't end with empty line
  if (currentBlock) {
    currentBlock.texts = textLines;
    blocks.push(currentBlock);
  }
  
  return blocks;
}

// Main merge function
export function mergeSrtFiles(files: Array<{ name: string; content: string }>): MergeResult {
  const diagnostics: MergeDiagnostic[] = [];
  const mergedBlocks: Array<{ index: number; timestamp: string; texts: string[] }> = [];
  
  let cumulativeMs = 0;
  let globalIndex = 1;
  let lastMergedEndMs: number | null = null;
  let totalInputCues = 0;
  let parseIssuesCount = 0;
  
  for (const file of files) {
    // 1) Parse file blocks
    const blocks = permissiveParseSrt(file.content);
    totalInputCues += blocks.length;
    
    // 2) Compute effective duration = last valid end ms or 0
    // We'll compute this as we process blocks to include fallback timestamps
    let fileLastEndMs = 0;
    let currentFileLastEndMs = 0; // Track end time within current file (without cumulative offset)
    
    // 3) For each block, produce final timestamp
    for (const b of blocks) {
      const shiftedLine = shiftTimestampLine(b.tsRaw, cumulativeMs);
      let finalTs: string;
      let action: 'normal' | 'normalized' | 'fallback' = 'normal';
      let reason: string | undefined;
      
      if (shiftedLine) {
        finalTs = shiftedLine;
        // Record if normalization changed raw
        const normalizedRaw = b.tsRaw.replace(/\s+/g, ' ').trim();
        const normalizedShifted = shiftedLine.replace(/\s+/g, ' ').trim();
        if (normalizedShifted !== normalizedRaw) {
          action = 'normalized';
        }
        
        // Extract end time from original (unshifted) timestamp for file duration calculation
        const unshiftedLine = shiftTimestampLine(b.tsRaw, 0);
        if (unshiftedLine) {
          const endToken = unshiftedLine.split('-->')[1]?.trim();
          if (endToken) {
            const endMs = parseTimestampToMs(endToken);
            if (endMs !== null && endMs > currentFileLastEndMs) {
              currentFileLastEndMs = endMs;
            }
          }
        }
      } else {
        // Fallback using previous end time in merged timeline
        const prevEnd = lastMergedEndMs !== null ? lastMergedEndMs : 0;
        finalTs = makeFallbackTimestamp(prevEnd, cumulativeMs, 200);
        action = 'fallback';
        reason = 'Unparseable timestamp line';
        parseIssuesCount++;
        
        // For fallback, use the fallback end time (minus cumulative offset) for file duration
        const fallbackEndToken = finalTs.split('-->')[1]?.trim();
        if (fallbackEndToken) {
          const fallbackEndMs = parseTimestampToMs(fallbackEndToken);
          if (fallbackEndMs !== null) {
            const fallbackEndMsInFile = fallbackEndMs - cumulativeMs;
            if (fallbackEndMsInFile > currentFileLastEndMs) {
              currentFileLastEndMs = fallbackEndMsInFile;
            }
          }
        }
      }
      
      // Extract end time from final timestamp for next fallback
      const endToken = finalTs.split('-->')[1]?.trim();
      if (endToken) {
        const endMs = parseTimestampToMs(endToken);
        if (endMs !== null) {
          lastMergedEndMs = endMs;
        }
      }
      
      // Add diagnostic if action is not normal
      if (action !== 'normal') {
        diagnostics.push({
          src_file: file.name,
          original_index: b.origIndex,
          original_timestamp_line: b.tsRaw,
          final_index: globalIndex,
          final_timestamp: finalTs,
          action,
          reason
        });
      }
      
      // Add to merged blocks
      mergedBlocks.push({
        index: globalIndex,
        timestamp: finalTs,
        texts: b.texts.length > 0 ? b.texts : ['[No text]']
      });
      
      globalIndex++;
    }
    
    // Update cumulative offset for next file using the last end time in this file
    fileLastEndMs = currentFileLastEndMs;
    cumulativeMs += fileLastEndMs;
  }
  
  // Generate merged SRT content
  const mergedSrt = mergedBlocks.map(block => {
    return `${block.index}\n${block.timestamp}\n${block.texts.join('\n')}\n`;
  }).join('\n');
  
  return {
    mergedSrt,
    diagnostics,
    stats: {
      totalInputCues,
      totalOutputCues: mergedBlocks.length,
      parseIssuesCount,
      filesProcessed: files.length
    }
  };
}

