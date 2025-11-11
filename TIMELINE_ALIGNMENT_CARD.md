# TimelineAlignmentCard Component

## Summary

A production-ready React + TypeScript UI component for configuring timeline alignment when merging multiple SRT subtitle files. The component provides a clean interface for setting offset modes and computing timestamp offsets that can be applied to shift subtitle cues.

## Files Created

### Core Component
- **`src/components/TimelineAlignmentCard.tsx`** - Main component implementation with full UI and behavior

### Utilities
- **`src/utils/timestampUtils.ts`** - Timestamp parsing and formatting utilities
  - `parseTimestampToMs(ts: string): number | null` - Parses various timestamp formats to milliseconds
  - `formatMsToTimestamp(ms: number): string` - Formats milliseconds to canonical `HH:MM:SS,mmm`

### Tests
- **`src/utils/__tests__/timestampUtils.test.ts`** - Unit tests for timestamp utilities (edge cases, formats, round-trip)
- **`src/components/__tests__/TimelineAlignmentCard.test.tsx`** - Component tests (modes, offsets, UI interactions, accessibility)

### Documentation & Examples
- **`src/components/TimelineAlignmentCard.README.md`** - Integration guide explaining how to use computed offsets
- **`src/components/TimelineAlignmentCard.example.tsx`** - Example usage component with multiple scenarios

### Configuration
- **`vitest.config.ts`** - Vitest configuration for running tests
- **`src/test/setup.ts`** - Test setup file with jest-dom matchers

## Component API

```typescript
interface TimelineAlignmentCardProps {
  primaryEnd: string;                    // "HH:MM:SS,mmm" format
  secondaryFiles: SecondaryFile[];        // List of files to offset
  defaultMode?: ShiftMode;                // "auto" | "none" | "custom" (default: "auto")
  defaultCustomOffset?: string;           // Default custom offset (default: "00:00:00,000")
  onChange?: (payload: {...}) => void;    // Callback with computed offsets
}
```

## Features

✅ **Three Shift Modes:**
- **Auto-shift**: Sets all secondary files to start after primary end
- **No shift**: Keeps existing offsets (or 00:00:00,000)
- **Custom offset**: User-entered timestamp applied to all files

✅ **Real-time Preview**: Shows computed offsets for each file as user changes mode/offset

✅ **Validation**: Custom offset input validates timestamp format with inline error messages

✅ **Accessibility**: Full keyboard navigation, ARIA labels, role attributes

✅ **Responsive**: Works on mobile and desktop widths

✅ **Type-safe**: Full TypeScript support with exported types

## Usage Example

```tsx
import { TimelineAlignmentCard } from './components/TimelineAlignmentCard';

function MyApp() {
  const handleChange = (payload) => {
    // payload.computedOffsets contains:
    // [{ id: 'vid1', offsetMs: 1800000, offsetDisplay: '00:30:00,000' }, ...]
    
    // Apply offsets to SRT files
    applyOffsetsToSrtFiles(payload.computedOffsets);
  };

  return (
    <TimelineAlignmentCard
      primaryEnd="00:30:00,000"
      secondaryFiles={[
        { id: 'vid1', name: 'Vid1.srt', currentOffsetMs: 0 },
        { id: 'vid2', name: 'Vid2.srt', currentOffsetMs: 900000 }
      ]}
      onChange={handleChange}
    />
  );
}
```

## Testing

Run tests with:
```bash
npm test
```

Or with UI:
```bash
npm run test:ui
```

## Acceptance Criteria ✅

- ✅ When primaryEnd=00:30:00,000 and mode=auto, every secondary file shows applied offset 00:30:00,000
- ✅ When mode=none, applied offset equals currentOffsetMs for each file
- ✅ When mode=custom and custom offset is valid, applied offset equals the custom offset for all files
- ✅ onChange receives payload matching spec whenever mode or offset changes
- ✅ Component is keyboard-accessible and responsive
- ✅ Unit tests cover parsing edge cases (missing ms, dot separators, invalid string)

## Integration

See `src/components/TimelineAlignmentCard.README.md` for detailed instructions on how to use the `computedOffsets` array to shift SRT timestamps in your merge routine.

