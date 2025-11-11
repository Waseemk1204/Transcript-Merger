import { parseTimestampToMs, formatMsToTimestamp, shiftTimestampLine, makeFallbackTimestamp } from './timestamp-arith';

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
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Empty line - end of block
    if (line === '') {
      if (currentBlock) {
        currentBlock.texts = textLines;
        blocks.push(currentBlock);
        currentBlock = null;
        textLines = [];
        expectingIndex = true;
        expectingTimestamp = false;
      }
      continue;
    }
    
    // Check if line looks like an index (just digits)
    if (expectingIndex && /^\d+$/.test(line)) {
      currentBlock = {
        origIndex: parseInt(line, 10),
        tsRaw: '',
        texts: []
      };
      expectingIndex = false;
      expectingTimestamp = true;
      continue;
    }
    
    // Check if line looks like a timestamp (contains --> or time pattern)
    if (expectingTimestamp && (line.includes('-->') || /\d{1,2}:\d{2}:\d{2}/.test(line))) {
      if (currentBlock) {
        currentBlock.tsRaw = line;
        expectingTimestamp = false;
      }
      continue;
    }
    
    // Otherwise, it's a text line
    if (currentBlock) {
      textLines.push(line);
    } else if (!expectingIndex) {
      // If we're not expecting an index but don't have a block, create one
      currentBlock = {
        origIndex: null,
        tsRaw: '',
        texts: [line]
      };
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

