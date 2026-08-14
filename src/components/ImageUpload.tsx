import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useImageUpload } from '../hooks/useImageUpload';

interface ImageUploadProps {
  currentImage?: string | null;
  onImageChange: (imageUrl: string | undefined) => void;
  className?: string;
  folder?: string;
  showUrlInput?: boolean;
  compact?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  currentImage, 
  onImageChange, 
  className = '',
  folder = 'menu-images',
  showUrlInput = true,
  compact = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, deleteImage, uploading, uploadProgress } = useImageUpload(folder);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await uploadImage(file);
      onImageChange(imageUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to upload image');
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
        console.warn('Error removing image from storage:', error);
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
          <img
            src={currentImage}
            alt="Preview"
            className="w-full max-w-2xl object-contain rounded-2xl border-2 border-sky-200 shadow-lg hover:shadow-xl transition-all"
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
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div
          onClick={triggerFileSelect}
          className={`w-full max-w-2xl border-2 border-dashed border-sky-300 rounded-xl cursor-pointer hover:border-sky-400 hover:bg-sky-50/50 transition-all duration-200 bg-gradient-to-br from-sky-50/30 to-blue-50/30 text-center ${
            isCompactMode ? 'p-4 space-y-1' : 'p-10 space-y-2'
          }`}
        >
          {uploading ? (
            <div className="text-center py-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-600 mx-auto mb-1"></div>
              <p className="text-xs text-gray-600">Uploading... {uploadProgress}%</p>
              <div className="w-28 bg-gray-200 rounded-full h-1.5 mx-auto mt-1.5">
                <div 
                  className="bg-sky-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          ) : isCompactMode ? (
            <div className="space-y-1">
              <ImageIcon className="h-7 w-7 text-sky-500 mx-auto stroke-[1.75]" />
              <p className="text-xs font-bold text-gray-800">Click to select thumbnail image</p>
              <p className="text-[10px] text-gray-500">Supports JPG, PNG, WebP (Max 10MB)</p>
            </div>
          ) : (
            <>
              <ImageIcon className="h-14 w-14 text-sky-400 mx-auto mb-2" />
              <p className="text-base font-medium text-gray-700 mb-1">Click to upload product image</p>
              <p className="text-xs text-gray-500 mb-1">or drag and drop</p>
              <p className="text-[11px] text-gray-400">All image formats (JPG, PNG, WebP, GIF, BMP, TIFF, SVG, HEIC) - max 10MB</p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {!currentImage && !isCompactMode && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={triggerFileSelect}
            disabled={uploading}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="h-5 w-5" />
            <span>Choose File</span>
          </button>
          {showUrlInput && <span className="text-sm text-gray-500">or enter URL below</span>}
        </div>
      )}

      {/* URL Input as fallback */}
      {showUrlInput && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Or enter image URL</label>
          <input
            type="url"
            value={currentImage ?? ''}
            onChange={(e) => onImageChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            placeholder="https://example.com/image.jpg"
            disabled={uploading}
          />
        </div>
      )}
    </div>
  );
};

export default ImageUpload;