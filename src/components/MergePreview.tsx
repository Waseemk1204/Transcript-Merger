import React, { useState, useMemo } from 'react';
import { ChevronDownIcon, ChevronUpIcon, EyeIcon, FileTextIcon } from 'lucide-react';
import { permissiveParseSrt } from '../utils/srt-merge';
import { shiftTimestampLine } from '../utils/timestamp-arith';
import { parseTimestampToMs, formatMsToTimestamp } from '../utils/timestampUtils';

interface PreviewEntry {
  index: number;
  start: string;
  end: string;
  text: string;
  sourceFile: string;
}

interface MergePreviewProps {
  files: Array<{ id: string; name: string; fileContent: string; isPrimary?: boolean }>;
  computedOffsets?: Array<{ id: string; offsetMs: number }>;
}

export function MergePreview({ files, computedOffsets = [] }: MergePreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Generate preview entries
  const previewEntries = useMemo(() => {
    if (files.length === 0) return [];

    const entries: PreviewEntry[] = [];
    let globalIndex = 1;

    // Find primary file (marked with isPrimary or first file as fallback)
    const primaryFile = files.find(f => f.isPrimary) || files[0];
    const secondaryFiles = files.filter(f => f.id !== primaryFile.id);

    // Process primary file (no offset)
    const primaryBlocks = permissiveParseSrt(primaryFile.fileContent);
    for (const block of primaryBlocks) {
      const shifted = shiftTimestampLine(block.tsRaw, 0);
      if (shifted) {
        const [start, end] = shifted.split('-->').map(t => t.trim());
        entries.push({
          index: globalIndex++,
          start,
          end,
          text: block.texts.join(' ') || '[No text]',
          sourceFile: primaryFile.name
        });
      }
    }

    // Process secondary files with offsets
    for (const file of secondaryFiles) {
      const offset = computedOffsets.find(o => o.id === file.id);
      const offsetMs = offset?.offsetMs ?? 0;

      const blocks = permissiveParseSrt(file.fileContent);
      for (const block of blocks) {
        const shifted = shiftTimestampLine(block.tsRaw, offsetMs);
        if (shifted) {
          const [start, end] = shifted.split('-->').map(t => t.trim());
          entries.push({
            index: globalIndex++,
            start,
            end,
            text: block.texts.join(' ') || '[No text]',
            sourceFile: file.name
          });
        }
      }
    }

    return entries;
  }, [files, computedOffsets]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalCues = files.reduce((sum, f) => sum + permissiveParseSrt(f.fileContent).length, 0);
    const totalDuration = previewEntries.length > 0 
      ? parseTimestampToMs(previewEntries[previewEntries.length - 1].end) ?? 0
      : 0;

    return {
      totalCues,
      totalFiles: files.length,
      totalDuration: formatMsToTimestamp(totalDuration),
      previewCues: previewEntries.length
    };
  }, [files, previewEntries]);

  if (files.length === 0) {
    return null;
  }

  const displayEntries = showAll ? previewEntries : previewEntries.slice(0, 10);
  const hasMore = previewEntries.length > 10;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse merge preview' : 'Expand merge preview'}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" aria-hidden="true" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Merge Preview</h2>
          <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline whitespace-nowrap">
            ({stats.previewCues} cues from {stats.totalFiles} {stats.totalFiles === 1 ? 'file' : 'files'})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Stats Bar */}
          <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <div className="text-gray-600 mb-1">Total Cues</div>
                <div className="font-semibold text-gray-900 text-sm sm:text-base">{stats.totalCues}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Files</div>
                <div className="font-semibold text-gray-900 text-sm sm:text-base">{stats.totalFiles}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Total Duration</div>
                <div className="font-semibold text-gray-900 font-mono text-xs break-all">{stats.totalDuration}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Preview Entries</div>
                <div className="font-semibold text-gray-900 text-sm sm:text-base">{stats.previewCues}</div>
              </div>
            </div>
          </div>

          {/* Preview Entries */}
          {previewEntries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileTextIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No subtitle entries found in uploaded files</p>
            </div>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto p-3 sm:p-4">
                <div className="space-y-3">
                  {displayEntries.map((entry) => (
                    <div
                      key={entry.index}
                      className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs sm:text-sm border-b border-gray-100 pb-3 last:border-0"
                    >
                      <div className="flex items-start gap-2 sm:gap-4 flex-shrink-0">
                        <div className="flex-shrink-0">
                          <div className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                            #{entry.index}
                          </div>
                        </div>
                        <div className="flex-shrink-0 font-mono text-xs text-gray-500 pt-1 min-w-[120px] sm:min-w-[140px] break-all">
                          {entry.start} → {entry.end}
                        </div>
                      </div>
                      <div className="flex-1 text-gray-900 min-w-0">
                        <div className="break-words">{entry.text}</div>
                        <div className="text-xs text-gray-400 mt-1 break-all">{entry.sourceFile}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Show More/Less */}
              {hasMore && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showAll ? (
                      <>Show less (first 10 entries)</>
                    ) : (
                      <>Show all {previewEntries.length} entries</>
                    )}
                  </button>
                </div>
              )}

              {/* Footer Summary */}
              <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border-t border-gray-200 text-xs sm:text-sm text-gray-600">
                <span className="block sm:inline">Preview shows merged subtitles in chronological order.</span>
                {computedOffsets.length > 0 && (
                  <span className="block sm:inline sm:ml-2 text-blue-600">
                    Offsets applied from Timeline Alignment.
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

