import React, { useState } from 'react';
import { FileTextIcon, GripVerticalIcon, MoreVerticalIcon, XIcon, ClockIcon, StarIcon } from 'lucide-react';
interface FileCardProps {
  file: {
    id: string;
    name: string;
    type: string;
    size: number;
    duration: string | null;
    isPrimary: boolean;
    errors: string[];
  };
  onSetPrimary: (id: string) => void;
  onRemove: (id: string) => void;
  onPreview?: (id: string) => void;
}
export function FileCard({
  file,
  onSetPrimary,
  onRemove,
  onPreview
}: FileCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      '.srt': 'bg-blue-100 text-blue-700',
      '.vtt': 'bg-green-100 text-green-700',
      '.txt': 'bg-gray-100 text-gray-700',
      '.json': 'bg-purple-100 text-purple-700',
      '.csv': 'bg-orange-100 text-orange-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };
  return <div className={`bg-white rounded-lg border p-3 sm:p-4 transition-all ${file.isPrimary ? 'border-blue-500 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Drag Handle */}
        <div className="cursor-move text-gray-400 hover:text-gray-600 pt-1 hidden sm:block">
          <GripVerticalIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        {/* File Icon */}
        <div className="flex-shrink-0 pt-1">
          <FileTextIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 mb-2">
            <h3 className="font-medium text-sm sm:text-base text-gray-900 break-words flex-1">
              {file.name}
            </h3>
            {file.isPrimary && (
              <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded self-start">
                <StarIcon className="w-3 h-3" />
                Primary
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500 mb-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeColor(file.type)}`}>
              {file.type.toUpperCase().replace('.', '')}
            </span>
            <span>{formatFileSize(file.size)}</span>
            {file.duration && <span className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="break-all">{file.duration}</span>
              </span>}
            {!file.duration && <span className="text-gray-400">Duration unknown</span>}
          </div>

          {file.errors.length > 0 && <div className="text-sm text-red-600 mb-2">{file.errors[0]}</div>}

          {onPreview && <button onClick={() => onPreview(file.id)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Preview
            </button>}
        </div>

        {/* Actions Menu */}
        <div className="relative flex-shrink-0">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
            <MoreVerticalIcon className="w-5 h-5" />
          </button>

          {showMenu && <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]">
                {!file.isPrimary && (
                  <button onClick={() => {
                    onSetPrimary(file.id);
                    setShowMenu(false);
                  }} className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2">
                    <StarIcon className="w-4 h-4" />
                    Set as Primary
                  </button>
                )}
                <button onClick={() => {
              onRemove(file.id);
              setShowMenu(false);
            }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <XIcon className="w-4 h-4" />
                  Remove
                </button>
              </div>
            </>}
        </div>
      </div>
    </div>;
}