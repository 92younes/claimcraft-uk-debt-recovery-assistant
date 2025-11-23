
import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2, Tag, AlertCircle } from 'lucide-react';
import { EvidenceFile } from '../types';
import { validateFileType, getFileTypeError } from '../utils/validation';

interface EvidenceUploadProps {
  files: EvidenceFile[];
  onAddFiles: (files: EvidenceFile[]) => void;
  onRemoveFile: (index: number) => void;
  onAnalyze: () => void;
  isProcessing: boolean;
}

export const EvidenceUpload: React.FC<EvidenceUploadProps> = ({
  files, onAddFiles, onRemoveFile, onAnalyze, isProcessing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [fileTypeError, setFileTypeError] = useState<string | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Clear any previous errors and timeout
      setFileTypeError(null);
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }

      const fileList = Array.from(e.target.files);

      // Separate valid and invalid files
      const validFiles: File[] = [];
      const invalidFiles: File[] = [];

      fileList.forEach((file: File) => {
        if (validateFileType(file)) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file);
        }
      });

      // Show error for invalid files (but don't block valid ones)
      if (invalidFiles.length > 0) {
        const errorMsg = invalidFiles.length === 1
          ? getFileTypeError(invalidFiles[0])
          : `${invalidFiles.length} file(s) rejected: ${invalidFiles.map(f => f.name).join(', ')}. Only PDF, JPG, PNG, and Word documents are accepted.`;

        setFileTypeError(errorMsg);

        // Auto-clear error after 8 seconds
        errorTimeoutRef.current = setTimeout(() => setFileTypeError(null), 8000);
      }

      // Process valid files even if some were invalid
      if (validFiles.length === 0) {
        // Reset input only if ALL files were invalid
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
            classification: undefined // Reset classification for new files
          });
          processedCount++;
          if (processedCount === fileList.length) {
            onAddFiles(newFiles);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Evidence Locker</h2>
      <p className="text-center text-slate-600 mb-8">
        Upload your Invoices, Contracts, and Emails (PDFs or Images).<br/>
        Gemini will analyze the entire bundle.
      </p>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 gap-4 mb-6">
          <label className="relative block cursor-pointer group">
            <input
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              disabled={isProcessing}
              ref={fileInputRef}
            />
            <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <p className="font-medium text-slate-700">Click to upload Documents</p>
              <p className="text-xs text-slate-400">PDF, PNG, JPG, Word supported</p>
            </div>
          </label>
        </div>

        {/* File Type Error Message */}
        {fileTypeError && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Invalid File Type</p>
              <p className="text-sm text-red-700 mt-1">{fileTypeError}</p>
              <p className="text-xs text-red-600 mt-2">
                For security and court submission, only PDF, JPG, PNG, and Word documents are accepted.
              </p>
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Uploaded Evidence</h3>
            {files.map((f, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  {f.type.includes('pdf') ? 
                    <FileText className="w-5 h-5 text-red-500" /> : 
                    <ImageIcon className="w-5 h-5 text-blue-500" />
                  }
                  <div>
                    <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">{f.name}</p>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-400 uppercase">{f.type.split('/')[1]}</p>
                        {f.classification && (
                            <span className="flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-200">
                                <Tag className="w-3 h-3" /> {f.classification}
                            </span>
                        )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onRemoveFile(idx)} 
                  className="text-slate-400 hover:text-red-500 p-1"
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onAnalyze}
          disabled={files.length === 0 || isProcessing}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-lg font-medium shadow-md flex items-center justify-center gap-2 transition-all"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Classifying & Analyzing...
            </>
          ) : (
            <>
              Analyze Documents
            </>
          )}
        </button>
      </div>
    </div>
  );
};
