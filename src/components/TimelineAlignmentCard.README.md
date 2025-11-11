# TimelineAlignmentCard Integration Guide

## Overview

The `TimelineAlignmentCard` component provides a UI for configuring how secondary SRT files should be offset when merging with a primary timeline. It computes offset values in milliseconds that can be applied to shift subtitle timestamps.

## Using Computed Offsets to Shift SRT Timestamps

When the `onChange` callback is triggered, it provides a `computedOffsets` array. Each entry contains:
- `id`: The file identifier
- `offsetMs`: The offset in milliseconds to apply
- `offsetDisplay`: A formatted display string (e.g., "00:30:00,000")

To apply these offsets to SRT files:

1. **Parse each SRT file** into subtitle cues (each with start and end timestamps)
2. **For each cue in each secondary file**, add the corresponding `offsetMs` to both the start and end timestamps
3. **Re-format** the shifted timestamps back to `HH:MM:SS,mmm` format
4. **Merge** all files together, maintaining the shifted timestamps

### Example Implementation

```typescript
import { parseTimestampToMs, formatMsToTimestamp } from '../utils/timestampUtils';

function shiftSrtCue(cue: { start: string; end: string }, offsetMs: number) {
  const startMs = parseTimestampToMs(cue.start) ?? 0;
  const endMs = parseTimestampToMs(cue.end) ?? 0;
  
  return {
    start: formatMsToTimestamp(startMs + offsetMs),
    end: formatMsToTimestamp(endMs + offsetMs)
  };
}

// Usage with computedOffsets from TimelineAlignmentCard
function applyOffsetsToFiles(
  files: Array<{ id: string; cues: Array<{ start: string; end: string; text: string }> }>,
  computedOffsets: Array<{ id: string; offsetMs: number }>
) {
  return files.map(file => {
    const offset = computedOffsets.find(o => o.id === file.id);
    if (!offset) return file;
    
    return {
      ...file,
      cues: file.cues.map(cue => ({
        ...cue,
        ...shiftSrtCue(cue, offset.offsetMs)
      }))
    };
  });
}
```

The component handles all offset computation logic; your merge routine only needs to apply the `offsetMs` values to each subtitle cue's timestamps.

