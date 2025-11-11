import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, CheckCircleIcon } from 'lucide-react';
import { SubtitleEntry } from '../types';
interface PreviewPanelProps {
  entries: SubtitleEntry[];
  isReady: boolean;
}
export function PreviewPanel({
  entries,
  isReady
}: PreviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  if (entries.length === 0) {
    return null;
  }
  return <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Merged Preview
          </h2>
          {isReady && <span className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
              <CheckCircleIcon className="w-4 h-4" />
              Ready
            </span>}
        </div>
        {isExpanded ? <ChevronUpIcon className="w-5 h-5 text-gray-400" /> : <ChevronDownIcon className="w-5 h-5 text-gray-400" />}
      </button>

      {/* Content */}
      {isExpanded && <div className="border-t border-gray-200">
          {/* Progress Indicator */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-green-600">
                <CheckCircleIcon className="w-4 h-4" />
                Files parsed
              </span>
              <span className="flex items-center gap-1.5 text-green-600">
                <CheckCircleIcon className="w-4 h-4" />
                Timeline adjusted
              </span>
              <span className="flex items-center gap-1.5 text-green-600">
                <CheckCircleIcon className="w-4 h-4" />
                Merge preview ready
              </span>
            </div>
          </div>

          {/* Subtitle List */}
          <div className="max-h-96 overflow-y-auto p-4">
            <div className="space-y-3">
              {entries.map((entry, index) => <div key={index} className="flex gap-4 text-sm">
                  <div className="flex-shrink-0 font-mono text-gray-500 text-xs pt-0.5">
                    [{entry.start} → {entry.end}]
                  </div>
                  <div className="flex-1 text-gray-900">{entry.text}</div>
                  {entry.sourceFile && <div className="flex-shrink-0 text-xs text-gray-400">
                      {entry.sourceFile}
                    </div>}
                </div>)}
            </div>
          </div>

          {/* Summary */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            Total entries: {entries.length}
          </div>
        </div>}
    </div>;
}