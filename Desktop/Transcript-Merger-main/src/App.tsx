import React, { useState, useMemo } from 'react';
import { UploadArea } from './components/UploadArea';
import { FileList } from './components/FileList';
import { Footer } from './components/Footer';
import { Toast } from './components/Toast';
import { TimelineAlignmentCard, SecondaryFile, ComputedOffset } from './components/TimelineAlignmentCard';
import { MergePreview } from './components/MergePreview';
import { TranscriptFile } from './types';
import { mergeSrtFiles, MergeResult } from './utils/srt-merge';
import { parseTimestampToMs, formatMsToTimestamp } from './utils/timestampUtils';
import { permissiveParseSrt } from './utils/srt-merge';
import { shiftTimestampLine } from './utils/timestamp-arith';

interface FileWithContent extends TranscriptFile {
  fileContent: string;
}

export function App() {
  const [files, setFiles] = useState<FileWithContent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [computedOffsets, setComputedOffsets] = useState<ComputedOffset[]>([]);

  const handleFilesSelected = async (selectedFiles: File[]) => {
    const newFiles: FileWithContent[] = [];

    for (const file of selectedFiles) {
      try {
        const content = await file.text();
        // First file uploaded becomes primary if no primary exists yet
        const hasPrimary = files.some(f => f.isPrimary);
        newFiles.push({
          id: `file-${Date.now()}-${Math.random()}`,
          name: file.name,
          type: '.' + file.name.split('.').pop()?.toLowerCase() || '.txt',
          size: file.size,
          duration: null,
          isPrimary: !hasPrimary && files.length === 0 && newFiles.length === 0,
          offset: '00:00:00,000',
          content: [],
          errors: [],
          fileContent: content
        });
      } catch (error) {
        const hasPrimary = files.some(f => f.isPrimary);
        newFiles.push({
          id: `file-${Date.now()}-${Math.random()}`,
          name: file.name,
          type: '.' + file.name.split('.').pop()?.toLowerCase() || '.txt',
          size: file.size,
          duration: null,
          isPrimary: !hasPrimary && files.length === 0 && newFiles.length === 0,
          offset: '00:00:00,000',
          content: [],
          errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`],
          fileContent: ''
        });
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleSetPrimary = (id: string) => {
    setFiles(prev => prev.map(f => ({
      ...f,
      isPrimary: f.id === id
    })));
    setMergeResult(null);
    setComputedOffsets([]);
  };

  const handleRemove = (id: string) => {
    setFiles(prev => {
      const removedFile = prev.find(f => f.id === id);
      const updated = prev.filter(f => f.id !== id);

      // If we removed the primary file and there are still files, make the first one primary
      if (removedFile?.isPrimary && updated.length > 0) {
        return updated.map((f, index) => ({
          ...f,
          isPrimary: index === 0
        }));
      }

      return updated;
    });
    setMergeResult(null);
    setComputedOffsets([]);
  };

  // Get primary file
  const primaryFile = useMemo(() => {
    return files.find(f => f.isPrimary) || files[0] || null;
  }, [files]);

  // Calculate primary timeline end from primary file
  const primaryEnd = useMemo(() => {
    if (!primaryFile) return '00:00:00,000';

    const blocks = permissiveParseSrt(primaryFile.fileContent);

    let lastEndMs = 0;
    for (const block of blocks) {
      const shifted = shiftTimestampLine(block.tsRaw, 0);
      if (shifted) {
        const endToken = shifted.split('-->')[1]?.trim();
        if (endToken) {
          const endMs = parseTimestampToMs(endToken);
          if (endMs !== null && endMs > lastEndMs) {
            lastEndMs = endMs;
          }
        }
      }
    }

    return formatMsToTimestamp(lastEndMs);
  }, [primaryFile]);

  // Convert files to SecondaryFile format for TimelineAlignmentCard (exclude primary)
  const secondaryFiles: SecondaryFile[] = useMemo(() => {
    return files
      .filter(f => !f.isPrimary)
      .map(file => ({
        id: file.id,
        name: file.name,
        currentOffsetMs: parseTimestampToMs(file.offset) ?? 0
      }));
  }, [files]);

  // Handle timeline alignment changes
  const handleTimelineAlignmentChange = (payload: {
    mode: 'auto' | 'none' | 'custom';
    customOffset?: string;
    computedOffsets: ComputedOffset[];
  }) => {
    setComputedOffsets(payload.computedOffsets);
  };

  const handleMerge = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setMergeResult(null);

    try {
      // If we have computed offsets, use them to shift files
      if (computedOffsets.length > 0 && files.length > 1 && primaryFile) {
        // Merge with offsets: primary file + shifted secondary files
        const primaryBlocks = permissiveParseSrt(primaryFile.fileContent);

        const allBlocks: Array<{ index: number; timestamp: string; texts: string[] }> = [];
        let globalIndex = 1;

        // Add primary file blocks as-is
        for (const block of primaryBlocks) {
          const shifted = shiftTimestampLine(block.tsRaw, 0);
          if (shifted) {
            allBlocks.push({
              index: globalIndex++,
              timestamp: shifted,
              texts: block.texts.length > 0 ? block.texts : ['[No text]']
            });
          }
        }

        // Add secondary files with their computed offsets
        const secondaryFilesList = files.filter(f => !f.isPrimary);
        for (const file of secondaryFilesList) {
          const offset = computedOffsets.find(o => o.id === file.id);
          const offsetMs = offset?.offsetMs ?? 0;

          const blocks = permissiveParseSrt(file.fileContent);
          for (const block of blocks) {
            const shifted = shiftTimestampLine(block.tsRaw, offsetMs);
            if (shifted) {
              allBlocks.push({
                index: globalIndex++,
                timestamp: shifted,
                texts: block.texts.length > 0 ? block.texts : ['[No text]']
              });
            }
          }
        }

        // Generate merged SRT
        const mergedSrt = allBlocks.map(block => {
          const cleanTexts = block.texts.filter(t => t.trim() !== '');
          return `${block.index}\n${block.timestamp}\n${cleanTexts.join('\n')}`;
        }).join('\n\n') + '\n';

        setMergeResult({
          mergedSrt,
          diagnostics: [],
          stats: {
            totalInputCues: files.reduce((sum, f) => sum + permissiveParseSrt(f.fileContent).length, 0),
            totalOutputCues: allBlocks.length,
            parseIssuesCount: 0,
            filesProcessed: files.length
          }
        });
      } else {
        // Fallback to simple arithmetic merge (original behavior)
        const filesToMerge = files.map(file => ({
          name: file.name,
          content: file.fileContent
        }));

        const result = mergeSrtFiles(filesToMerge);
        setMergeResult(result);
      }

      setToastMessage('Merge completed successfully!');
      setShowToast(true);
    } catch (error) {
      setToastMessage(`Merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowToast(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = async () => {
    if (!mergeResult) {
      // If no merge result yet, generate preview and copy that
      try {
        if (computedOffsets.length > 0 && files.length > 1 && primaryFile) {
          const primaryBlocks = permissiveParseSrt(primaryFile.fileContent);
          const allBlocks: Array<{ index: number; timestamp: string; texts: string[] }> = [];
          let globalIndex = 1;

          for (const block of primaryBlocks) {
            const shifted = shiftTimestampLine(block.tsRaw, 0);
            if (shifted) {
              allBlocks.push({
                index: globalIndex++,
                timestamp: shifted,
                texts: block.texts.length > 0 ? block.texts : ['[No text]']
              });
            }
          }

          const secondaryFilesList = files.filter(f => !f.isPrimary);
          for (const file of secondaryFilesList) {
            const offset = computedOffsets.find(o => o.id === file.id);
            const offsetMs = offset?.offsetMs ?? 0;

            const blocks = permissiveParseSrt(file.fileContent);
            for (const block of blocks) {
              const shifted = shiftTimestampLine(block.tsRaw, offsetMs);
              if (shifted) {
                allBlocks.push({
                  index: globalIndex++,
                  timestamp: shifted,
                  texts: block.texts.length > 0 ? block.texts : ['[No text]']
                });
              }
            }
          }

          const mergedSrt = allBlocks.map(block => {
            const cleanTexts = block.texts.filter(t => t.trim() !== '');
            return `${block.index}\n${block.timestamp}\n${cleanTexts.join('\n')}`;
          }).join('\n\n') + '\n';

          await navigator.clipboard.writeText(mergedSrt);
          setToastMessage('Merged transcript copied to clipboard!');
          setShowToast(true);
        } else {
          // Fallback to simple merge
          const filesToMerge = files.map(file => ({
            name: file.name,
            content: file.fileContent
          }));
          const result = mergeSrtFiles(filesToMerge);
          await navigator.clipboard.writeText(result.mergedSrt);
          setToastMessage('Merged transcript copied to clipboard!');
          setShowToast(true);
        }
      } catch (error) {
        setToastMessage(`Failed to copy: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setShowToast(true);
      }
    } else {
      // Copy existing merge result
      try {
        await navigator.clipboard.writeText(mergeResult.mergedSrt);
        setToastMessage('Merged transcript copied to clipboard!');
        setShowToast(true);
      } catch (error) {
        setToastMessage(`Failed to copy: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setShowToast(true);
      }
    }
  };

  const canMerge = files.length >= 1;

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Header */}
        <header className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 px-2">
            Transcript Merger — Simple Arithmetic Merge
          </h1>
          <p className="text-base sm:text-lg text-gray-600 px-2">
            Upload multiple .srt files. They will be merged end-to-end in upload order.
          </p>
        </header>

        {/* Upload Area */}
        <div className="mb-8">
          <UploadArea onFilesSelected={handleFilesSelected} disabled={files.length >= 10} />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mb-8">
            <FileList
              files={files}
              onSetPrimary={handleSetPrimary}
              onRemove={handleRemove}
            />
          </div>
        )}

        {/* Timeline Alignment Card */}
        {files.length >= 2 && (
          <div className="mb-8">
            <TimelineAlignmentCard
              primaryEnd={primaryEnd}
              secondaryFiles={secondaryFiles}
              defaultMode="auto"
              onChange={handleTimelineAlignmentChange}
            />
          </div>
        )}

        {/* Merge Preview */}
        {files.length > 0 && (
          <div className="mb-8">
            <MergePreview
              files={files.map(f => ({
                id: f.id,
                name: f.name,
                fileContent: f.fileContent,
                isPrimary: f.isPrimary
              }))}
              computedOffsets={computedOffsets}
            />
          </div>
        )}

        {/* Merge Button and Results */}
        {files.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-4">
              <button
                onClick={handleMerge}
                disabled={!canMerge || isProcessing}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Merging...
                  </>
                ) : (
                  <>
                    <span>📥</span>
                    Merge & Download
                  </>
                )}
              </button>
              <button
                onClick={handleCopyToClipboard}
                disabled={!canMerge || isProcessing}
                className="w-full sm:w-auto px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <span>📋</span>
                Copy to Clipboard
              </button>
            </div>

            {/* Merge Results */}
            {mergeResult && (
              <div className="mt-6 bg-white rounded-lg shadow-md p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-4">Merge Complete</h3>

                {/* Stats */}
                <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-gray-50 p-2 sm:p-3 rounded">
                    <div className="text-xs sm:text-sm text-gray-600">Files Processed</div>
                    <div className="text-xl sm:text-2xl font-bold">{mergeResult.stats.filesProcessed}</div>
                  </div>
                  <div className="bg-gray-50 p-2 sm:p-3 rounded">
                    <div className="text-xs sm:text-sm text-gray-600">Total Input Cues</div>
                    <div className="text-xl sm:text-2xl font-bold">{mergeResult.stats.totalInputCues}</div>
                  </div>
                  <div className="bg-gray-50 p-2 sm:p-3 rounded">
                    <div className="text-xs sm:text-sm text-gray-600">Total Output Cues</div>
                    <div className="text-xl sm:text-2xl font-bold">{mergeResult.stats.totalOutputCues}</div>
                  </div>
                  <div className="bg-gray-50 p-2 sm:p-3 rounded">
                    <div className="text-xs sm:text-sm text-gray-600">Parse Issues</div>
                    <div className="text-xl sm:text-2xl font-bold">{mergeResult.stats.parseIssuesCount}</div>
                  </div>
                </div>

                {/* Download Links */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={() => downloadFile(mergeResult.mergedSrt, 'merged.srt', 'text/plain;charset=utf-8')}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <span>📄</span>
                    <span className="truncate">Download merged.srt</span>
                  </button>
                  <button
                    onClick={() => downloadFile(JSON.stringify(mergeResult.diagnostics, null, 2), 'merge_diagnostics.json', 'application/json')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <span>📊</span>
                    <span className="truncate">Download merge_diagnostics.json</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <Footer />

        {/* Toast */}
        {showToast && (
          <Toast message={toastMessage} onClose={() => setShowToast(false)} />
        )}
      </div>
    </div>
  );
}
