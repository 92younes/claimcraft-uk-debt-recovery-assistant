
import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2, Tag, AlertCircle, Search } from 'lucide-react';
import { EvidenceFile } from '../types';
import { validateFileType, getFileTypeError } from '../utils/validation';
import { Button } from './ui/Button';

interface EvidenceUploadProps {
  files: EvidenceFile[];
  onAddFiles: (files: EvidenceFile[]) => void;
  onRemoveFile: (index: number) => void;
  onAnalyze?: () => void;
  isProcessing: boolean;
}

export const EvidenceUpload: React.FC<EvidenceUploadProps> = ({
  files, onAddFiles, onRemoveFile, onAnalyze, isProcessing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [fileTypeError, setFileTypeError] = useState<string | null>(null);
  const maxFileSizeBytes = 10 * 1024 * 1024; // 10MB, aligned with ConversationEntry

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileTypeError(null);
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }

      const fileList = Array.from(e.target.files);
      const validFiles: File[] = [];
      const invalidTypeFiles: File[] = [];
      const tooLargeFiles: File[] = [];

      fileList.forEach((file: File) => {
        if (file.size > maxFileSizeBytes) {
          tooLargeFiles.push(file);
          return;
        }
        if (validateFileType(file)) {
          validFiles.push(file);
        } else {
          invalidTypeFiles.push(file);
        }
      });

      const errorParts: string[] = [];
      if (invalidTypeFiles.length > 0) {
        errorParts.push(
          invalidTypeFiles.length === 1
            ? getFileTypeError(invalidTypeFiles[0])
            : `${invalidTypeFiles.length} file(s) rejected (type): ${invalidTypeFiles.map(f => f.name).join(', ')}. Please upload a PDF or an image (JPG, PNG, GIF, WebP).`
        );
      }
      if (tooLargeFiles.length > 0) {
        errorParts.push(
          tooLargeFiles.length === 1
            ? `"${tooLargeFiles[0].name}" is too large. Maximum size is 10MB.`
            : `${tooLargeFiles.length} file(s) rejected (size > 10MB): ${tooLargeFiles.map(f => f.name).join(', ')}.`
        );
      }
      if (errorParts.length > 0) {
        const errorMsg = errorParts.join(' ');
        setFileTypeError(errorMsg);
        errorTimeoutRef.current = setTimeout(() => setFileTypeError(null), 8000);
      }

      if (validFiles.length === 0) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const newFiles: EvidenceFile[] = [];
      let processedCount = 0;

      validFiles.forEach((item) => {
        const file = item as File;
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          newFiles.push({
            name: file.name,
            type: file.type,
            data: base64String,
            classification: undefined
          });
          processedCount++;
          // IMPORTANT: only compare to the number of valid files (mixed selections are allowed)
          if (processedCount === validFiles.length) {
            onAddFiles(newFiles);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Upload Zone - Dashed border style matching mockup */}
      <label className="relative block cursor-pointer group mb-4">
        <input
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,application/pdf,image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileChange}
          disabled={isProcessing}
          ref={fileInputRef}
        />
        <div className="py-6 px-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-teal-400 hover:bg-teal-50/30 transition-all duration-200 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
            <Upload className="w-5 h-5 text-teal-500" />
          </div>
          <p className="font-medium text-slate-700">Click to upload documents</p>
          <p className="text-xs text-slate-400 mt-1">PDF or images (JPG, PNG, GIF, WebP) • Max 10MB each</p>
        </div>
      </label>

      {/* File Type Error Message */}
      {fileTypeError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 text-sm">Invalid File Type</p>
            <p className="text-xs text-red-600 mt-1">{fileTypeError}</p>
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2 mb-4">
          {files.map((f, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                {f.type.includes('pdf') ?
                  <FileText className="w-4 h-4 text-red-500" /> :
                  <ImageIcon className="w-4 h-4 text-teal-600" />
                }
                <div>
                  <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{f.name}</p>
                  <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-400 uppercase font-mono">{f.type.split('/')[1]}</p>
                      {f.classification && (
                          <span className="flex items-center gap-1 text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium border border-teal-200">
                              <Tag className="w-2.5 h-2.5" /> {f.classification}
                          </span>
                      )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveFile(idx)}
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 h-auto"
                disabled={isProcessing}
                icon={<X className="w-4 h-4" />}
              />
            </div>
          ))}
        </div>
      )}

      {/* Analyze Button - only show when analysis is available in this context */}
      {onAnalyze && (
        <Button
          onClick={onAnalyze}
          disabled={files.length === 0 || isProcessing}
          isLoading={isProcessing}
          fullWidth
          className="py-3"
        >
          Analyze Documents
        </Button>
      )}
    </div>
  );
};
