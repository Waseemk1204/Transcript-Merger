import React, { useState, useRef } from 'react';
import { UploadCloudIcon } from 'lucide-react';
interface UploadAreaProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}
export function UploadArea({
  onFilesSelected,
  disabled = false
}: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    onFilesSelected(files);
  };
  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
    }
  };
  return <div className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 md:p-12 text-center transition-all cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50' : disabled ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50'}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleClick}>
      <input ref={fileInputRef} type="file" multiple accept=".srt,.vtt,.txt,.json,.csv" onChange={handleFileChange} className="hidden" disabled={disabled} />

      <UploadCloudIcon className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-3 sm:mb-4 text-gray-400" />

      <p className="text-base sm:text-lg font-medium text-gray-700 mb-2 px-2">
        Drag & drop transcripts here or click to browse
      </p>

      <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 px-2">
        Supported formats: .srt, .vtt, .txt, .json, .csv
      </p>

      <p className="text-xs text-gray-400">Up to 10 files recommended</p>
    </div>;
}