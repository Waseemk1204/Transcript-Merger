import React from 'react';
import { TranscriptFile } from '../types';
import { ClockIcon } from 'lucide-react';
import { Button } from './Button';
interface TimelineControlsProps {
  files: TranscriptFile[];
  primaryFile: TranscriptFile | null;
  onAutoShift: (fileId: string) => void;
}
export function TimelineControls({
  files,
  primaryFile,
  onAutoShift
}: TimelineControlsProps) {
  if (!primaryFile || files.length < 2) {
    return null;
  }
  const secondaryFiles = files.filter(f => !f.isPrimary);
  return <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Timeline Alignment
      </h2>

      {/* Primary Timeline Info */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-blue-900 mb-1">
          <ClockIcon className="w-4 h-4" />
          <span className="font-medium">Primary timeline end</span>
        </div>
        <div className="font-mono text-lg text-blue-700">
          {primaryFile.duration || '00:00:00,000'}
        </div>
        <p className="text-xs text-blue-600 mt-2">
          Other transcripts will be shifted to continue after this time
        </p>
      </div>

      {/* Secondary Files Controls */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Secondary Files</h3>
        {secondaryFiles.map(file => <div key={file.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Current offset: <span className="font-mono">{file.offset}</span>
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => onAutoShift(file.id)}>
              Auto-shift
            </Button>
          </div>)}
      </div>

      {/* Options */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500" />
          Use first file timestamps as base
        </label>
      </div>
    </div>;
}