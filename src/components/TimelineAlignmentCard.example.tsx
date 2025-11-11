import React, { useState } from 'react';
import { TimelineAlignmentCard, SecondaryFile, ComputedOffset } from './TimelineAlignmentCard';

/**
 * Example usage component for TimelineAlignmentCard
 * 
 * This demonstrates how to integrate the TimelineAlignmentCard component
 * and handle the onChange callback to apply offsets to SRT files.
 */
export function TimelineAlignmentCardExample() {
  const [appliedOffsets, setAppliedOffsets] = useState<ComputedOffset[]>([]);

  const secondaryFiles: SecondaryFile[] = [
    { id: 'vid1', name: 'Vid1.srt', currentOffsetMs: 0 },
    { id: 'vid2', name: 'Vid2.srt', currentOffsetMs: 900000 } // 15 minutes
  ];

  const handleChange = (payload: {
    mode: 'auto' | 'none' | 'custom';
    customOffset?: string;
    computedOffsets: ComputedOffset[];
  }) => {
    console.log('Timeline alignment changed:', payload);
    // Store the computed offsets for use in merge routine
    setAppliedOffsets(payload.computedOffsets);
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Timeline Alignment Card Example</h1>
      
      <TimelineAlignmentCard
        primaryEnd="00:30:00,000"
        secondaryFiles={secondaryFiles}
        defaultMode="auto"
        defaultCustomOffset="00:00:00,000"
        onChange={handleChange}
      />

      {/* Display applied offsets for debugging */}
      {appliedOffsets.length > 0 && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h2 className="font-semibold mb-2">Applied Offsets (for merge routine):</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(appliedOffsets, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * Storybook-style example with different scenarios
 */
export function TimelineAlignmentCardStories() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h2 className="text-xl font-bold mb-4">Scenario 1: Auto-shift (default)</h2>
        <TimelineAlignmentCard
          primaryEnd="00:30:00,000"
          secondaryFiles={[
            { id: 'vid1', name: 'Vid1.srt' },
            { id: 'vid2', name: 'Vid2.srt' }
          ]}
        />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Scenario 2: Files with existing offsets</h2>
        <TimelineAlignmentCard
          primaryEnd="01:00:00,000"
          secondaryFiles={[
            { id: 'vid1', name: 'Vid1.srt', currentOffsetMs: 1800000 }, // 30 min
            { id: 'vid2', name: 'Vid2.srt', currentOffsetMs: 3600000 } // 1 hour
          ]}
          defaultMode="none"
        />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Scenario 3: Custom offset mode</h2>
        <TimelineAlignmentCard
          primaryEnd="00:15:00,000"
          secondaryFiles={[
            { id: 'vid1', name: 'Vid1.srt' },
            { id: 'vid2', name: 'Vid2.srt' }
          ]}
          defaultMode="custom"
          defaultCustomOffset="00:45:00,000"
        />
      </div>
    </div>
  );
}

