import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon, FileText, ExternalLink } from 'lucide-react';
import { useImageUpload } from '../hooks/useImageUpload';

interface ImageUploadProps {
  currentImage?: string | null;
  onImageChange: (imageUrl: string | undefined) => void;
  className?: string;
  folder?: string;
  showUrlInput?: boolean;
  compact?: boolean;
  accept?: string;
  title?: string;
  subtitle?: string;
  urlPlaceholder?: string;
  urlLabel?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  currentImage, 
  onImageChange, 
  className = '',
  folder = 'menu-images',
  showUrlInput = true,
  compact = false,
  accept = 'image/*',
  title,
  subtitle,
  urlPlaceholder = 'https://example.com/image.jpg',
  urlLabel = 'Or enter image URL'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, deleteImage, uploading, uploadProgress } = useImageUpload(folder);

  const isPdf = Boolean(
    currentImage && (
      currentImage.toLowerCase().endsWith('.pdf') ||
      currentImage.toLowerCase().includes('.pdf?') ||
      currentImage.startsWith('data:application/pdf')
    )
  );

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await uploadImage(file);
      onImageChange(imageUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to upload file');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (currentImage) {
      try {
        await deleteImage(currentImage);
      } catch (error) {
        console.warn('Error removing file from storage:', error);
      }
      onImageChange('');
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const isCompactMode = compact || !showUrlInput;

  return (
    <div className={`space-y-3 ${className}`}>
      {currentImage ? (
        <div className="relative">
          {isPdf ? (
            <div className="w-full max-w-2xl p-5 bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800 dark:to-slate-900 rounded-2xl border-2 border-sky-200 dark:border-sky-800 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                      PDF File
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Attached Certificate / Document</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-md mt-0.5">
                    {currentImage}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={currentImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#3C6CA8] bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open PDF</span>
                </a>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-sm transition-all"
                  disabled={uploading}
                  title="Remove PDF"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <img
                src={currentImage}
                alt="Preview"
                className="w-full max-w-2xl object-contain rounded-2xl border-2 border-sky-200 shadow-lg hover:shadow-xl transition-all max-h-80 bg-slate-50"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                onLoad={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                style={{ opacity: 0 }}
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all"
                disabled={uploading}
                title="Remove file"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      ) : (
        <div
          onClick={triggerFileSelect}
          className={`w-full max-w-2xl border-2 border-dashed border-sky-300 dark:border-sky-700/60 rounded-xl cursor-pointer hover:border-sky-400 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 transition-all duration-200 bg-gradient-to-br from-sky-50/30 to-blue-50/30 dark:from-slate-900/40 dark:to-slate-800/40 text-center ${
            isCompactMode ? 'p-3 space-y-1' : 'p-5 sm:p-6 space-y-1.5'
          }`}
        >
          {uploading ? (
            <div className="text-center py-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-600 mx-auto mb-1"></div>
              <p className="text-xs text-gray-600 dark:text-slate-300">Uploading... {uploadProgress}%</p>
              <div className="w-28 bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 mx-auto mt-1.5">
                <div 
                  className="bg-sky-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          ) : isCompactMode ? (
            <div className="space-y-1">
              <ImageIcon className="h-6 w-6 text-sky-500 mx-auto stroke-[1.75]" />
              <p className="text-xs font-bold text-gray-800 dark:text-slate-200">{title || 'Click to select thumbnail image'}</p>
              <p className="text-[10px] text-gray-500 dark:text-slate-400">{subtitle || 'Supports JPG, PNG, WebP (Max 10MB)'}</p>
            </div>
          ) : (
            <>
              <ImageIcon className="h-9 w-9 text-sky-400 mx-auto mb-0.5" />
              <p className="text-xs sm:text-sm font-bold text-gray-700 dark:text-slate-200">
                {title || 'Click to upload file'}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">or drag and drop</p>
              <p className="text-[10px] text-gray-400 dark:text-slate-500">
                {subtitle || 'All image formats (JPG, PNG, WebP, GIF, BMP, TIFF, SVG, HEIC) - max 10MB'}
              </p>
            </>
          )}
        </div>
      )}

      <input id="imageupload-file-upload" name="file_upload" ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}/>

      {!currentImage && !isCompactMode && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={triggerFileSelect}
            disabled={uploading}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white rounded-xl font-medium text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="h-4 w-4" />
            <span>Choose File</span>
          </button>
          {showUrlInput && <span className="text-xs sm:text-sm text-gray-500">or enter URL below</span>}
        </div>
      )}

      {/* URL Input as fallback */}
      {showUrlInput && (
        <div>
          <label htmlFor="imageupload-urllabel" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{urlLabel}</label>
          <input id="imageupload-urllabel" name="urllabel" type="url"
            value={currentImage ?? ''}
            onChange={(e) => onImageChange(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-900 font-mono"
            placeholder={urlPlaceholder}
            disabled={uploading}
          />
        </div>
      )}
    </div>
  );
};

export default ImageUpload;