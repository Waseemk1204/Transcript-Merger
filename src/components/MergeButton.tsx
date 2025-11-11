import React, { useState } from 'react';
import { DownloadIcon, CopyIcon, ChevronDownIcon } from 'lucide-react';
import { Button } from './Button';
import { OutputFormat } from '../types';
interface MergeButtonProps {
  disabled: boolean;
  onMerge: (format: OutputFormat) => void;
  onCopy: () => void;
  isProcessing?: boolean;
}
export function MergeButton({
  disabled,
  onMerge,
  onCopy,
  isProcessing = false
}: MergeButtonProps) {
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>('srt');
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const formats: {
    value: OutputFormat;
    label: string;
  }[] = [{
    value: 'srt',
    label: '.srt'
  }, {
    value: 'vtt',
    label: '.vtt'
  }, {
    value: 'txt',
    label: '.txt'
  }, {
    value: 'json',
    label: '.json'
  }];
  const handleMerge = () => {
    onMerge(selectedFormat);
  };
  return <div className="flex items-center gap-3">
      {/* Main Merge Button */}
      <div className="flex items-center gap-0">
        <Button variant="primary" size="lg" disabled={disabled || isProcessing} onClick={handleMerge} className="rounded-r-none">
          <DownloadIcon className="w-5 h-5 mr-2" />
          {isProcessing ? 'Merging...' : 'Merge & Download'}
        </Button>

        {/* Format Dropdown */}
        <div className="relative">
          <button onClick={() => setShowFormatMenu(!showFormatMenu)} disabled={disabled || isProcessing} className="h-full px-3 bg-blue-600 text-white border-l border-blue-400 rounded-r-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <ChevronDownIcon className="w-5 h-5" />
          </button>

          {showFormatMenu && <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFormatMenu(false)} />
              <div className="absolute right-0 top-full mt-2 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px]">
                {formats.map(format => <button key={format.value} onClick={() => {
              setSelectedFormat(format.value);
              setShowFormatMenu(false);
            }} className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${selectedFormat === format.value ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700'}`}>
                    {format.label}
                  </button>)}
              </div>
            </>}
        </div>
      </div>

      {/* Copy Button */}
      <Button variant="secondary" size="lg" disabled={disabled} onClick={onCopy}>
        <CopyIcon className="w-5 h-5 mr-2" />
        Copy to clipboard
      </Button>

      {/* Tooltip for disabled state */}
      {disabled && <div className="text-sm text-gray-500">
          Select a primary transcript and upload at least one other file to
          merge.
        </div>}
    </div>;
}