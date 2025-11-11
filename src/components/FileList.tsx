import React from 'react';
import { FileCard } from './FileCard';
import { TranscriptFile } from '../types';
import { AlertCircleIcon } from 'lucide-react';
interface FileListProps {
  files: TranscriptFile[];
  onSetPrimary: (id: string) => void;
  onRemove: (id: string) => void;
  onPreview?: (id: string) => void;
}
export function FileList({
  files,
  onSetPrimary,
  onRemove,
  onPreview
}: FileListProps) {
  if (files.length === 0) {
    return null;
  }
  return <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
          Uploaded Files ({files.length})
        </h2>
        {files.some(f => f.isPrimary) && (
          <span className="text-xs sm:text-sm text-gray-600">
            Primary file sets the timeline base
          </span>
        )}
      </div>

      <div className="space-y-3">
        {files.map((file, index) => (
          <div key={file.id} className="flex items-start gap-2 sm:gap-3">
            <div className="flex-shrink-0 pt-3 sm:pt-4 text-xs sm:text-sm font-medium text-gray-500">
              #{index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <FileCard file={file} onSetPrimary={onSetPrimary} onRemove={onRemove} onPreview={onPreview} />
            </div>
          </div>
        ))}
      </div>
    </div>;
}