import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle, RefreshCw } from 'lucide-react';
import { formatFileSize } from '../../services/storageService';

interface PhotoUploadPreviewProps {
  id?: string;
  label: string;
  subLabel?: string;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  required?: boolean;
  isUploading?: boolean;
  uploadProgress?: number | null;
  initialPreviewUrl?: string;
  aspectRatioClass?: string;
  accept?: string;
  error?: string | null;
}

export const PhotoUploadPreview: React.FC<PhotoUploadPreviewProps> = ({
  id = 'checkin-photo-input',
  label,
  subLabel,
  selectedFile,
  onFileSelect,
  required = false,
  isUploading = false,
  uploadProgress = null,
  initialPreviewUrl,
  aspectRatioClass = 'aspect-[3/4]',
  accept = 'image/*',
  error,
}) => {
  const [previewSrc, setPreviewSrc] = useState<string | null>(initialPreviewUrl || null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize preview when selected file changes
  useEffect(() => {
    if (!selectedFile) {
      if (initialPreviewUrl) {
        setPreviewSrc(initialPreviewUrl);
      } else {
        setPreviewSrc(null);
      }
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile, initialPreviewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please choose an image file (JPEG, PNG, WebP).');
        return;
      }
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please drop an image file (JPEG, PNG, WebP).');
        return;
      }
      onFileSelect(file);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    setPreviewSrc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-xs font-bold text-neutral-800">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
        {selectedFile && (
          <span className="text-[11px] font-mono text-neutral-500 font-medium">
            {formatFileSize(selectedFile.size)}
          </span>
        )}
      </div>

      {subLabel && (
        <p className="text-[11px] text-neutral-500 leading-tight">
          {subLabel}
        </p>
      )}

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept={accept}
        required={required && !previewSrc}
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
      />

      {/* Interactive Drop / Preview Area */}
      <div
        onClick={triggerFileInput}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full ${aspectRatioClass} rounded-2xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center p-4 ${
          isDragOver
            ? 'border-red-600 bg-red-50/50 scale-[1.01]'
            : previewSrc
            ? 'border-neutral-300 bg-neutral-900 group shadow-sm'
            : 'border-dashed border-neutral-300 bg-neutral-50 hover:bg-neutral-100/80 hover:border-red-400'
        } ${isUploading ? 'cursor-wait opacity-90' : ''}`}
      >
        {previewSrc ? (
          <>
            {/* Image Preview */}
            <img
              src={previewSrc}
              alt="Physique Preview"
              className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-102"
            />

            {/* Overlay on Hover */}
            <div className="absolute inset-0 bg-neutral-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-white/90 text-neutral-900 text-xs font-bold shadow-md flex items-center gap-1.5 backdrop-blur-xs">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Change Image</span>
              </span>
            </div>

            {/* Remove / Clear Button */}
            {!isUploading && (
              <button
                type="button"
                onClick={handleClear}
                title="Remove photo"
                className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-neutral-900/80 hover:bg-red-600 text-white transition-colors shadow-md z-10"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Bottom Status Badge */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-neutral-900/85 backdrop-blur-xs text-white text-[11px] font-medium flex items-center justify-between">
              <span className="truncate max-w-[170px]">
                {selectedFile?.name || 'Selected Photo'}
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold shrink-0">
                <CheckCircle className="w-3 h-3" /> Ready
              </span>
            </div>
          </>
        ) : (
          <div className="space-y-2 py-4 pointer-events-none">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100 shadow-xs">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-800">
                Click to browse or drag & drop photo
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                PNG, JPG or WebP &bull; Auto-optimized
              </p>
            </div>
          </div>
        )}

        {/* Uploading Progress Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white z-20">
            <div className="w-10 h-10 border-3 border-white/20 border-t-red-500 rounded-full animate-spin mb-3" />
            <p className="text-xs font-bold uppercase tracking-wider mb-1">
              Optimizing & Uploading...
            </p>
            {typeof uploadProgress === 'number' && (
              <div className="w-44 bg-white/20 h-2 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-red-500 h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
            <span className="text-[10px] text-neutral-300 font-mono mt-1.5">
              {uploadProgress !== null ? `${uploadProgress}%` : 'Compressing photo...'}
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-red-600 font-semibold mt-1">
          {error}
        </p>
      )}
    </div>
  );
};
