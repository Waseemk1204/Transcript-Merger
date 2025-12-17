import { parseTimestampToMs, shiftTimestampLine, makeFallbackTimestamp } from './timestamp-arith';

export interface SrtBlock {
  origIndex: number | null;
  tsRaw: string;
  texts: string[];
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
    return `${block.index}\n${block.timestamp}\n${block.texts.join('\n')}`;
  }).join('\n\n') + '\n';
  
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

