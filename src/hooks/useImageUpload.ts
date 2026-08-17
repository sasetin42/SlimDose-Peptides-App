import { useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Compresses an image client-side to ensure fast mobile uploads and prevent payload limits.
 * Reduces 5MB-15MB phone photos to ~250KB JPEG without noticeable quality degradation.
 */
export const compressImageForUpload = async (file: File, maxDimension = 1600, quality = 0.82): Promise<File> => {
  // If it's a PDF, SVG, or non-image, don't re-encode with canvas
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') || file.type.includes('svg')) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          try {
            let { width, height } = img;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(file);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  resolve(file);
                  return;
                }
                const cleanName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
                const compressedFile = new File([blob], cleanName, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              },
              'image/jpeg',
              quality
            );
          } catch {
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
        img.src = event.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    } catch {
      resolve(file);
    }
  });
};

export const useImageUpload = (folder: string = 'menu-images') => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadImage = async (file: File): Promise<string> => {
    let progressInterval: NodeJS.Timeout | null = null;
    let uploadTimeout: NodeJS.Timeout | null = null;

    try {
      setUploading(true);
      setUploadProgress(0);

      // Compress large image files from phone cameras
      const processedFile = await compressImageForUpload(file);

      console.log('🚀 Starting upload process...', {
        originalName: file.name,
        originalSize: file.size,
        processedSize: processedFile.size,
        type: processedFile.type,
      });

      // Validate file extension / MIME
      const fileExtension = (processedFile.name.split('.').pop() || 'jpg').toLowerCase();
      const validExtensions = [
        'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif',
        'svg', 'heic', 'heif', 'ico', 'avif', 'jfif', 'pdf'
      ];

      const hasValidExtension = validExtensions.includes(fileExtension);
      const hasValidMimeType = !processedFile.type || processedFile.type.startsWith('image/') || processedFile.type === 'application/pdf';

      if (!hasValidExtension && !hasValidMimeType) {
        throw new Error('Please upload a valid image or PDF file.');
      }

      // Generate unique filename
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

      // Simulate upload progress
      progressInterval = setInterval(() => {
        setUploadProgress(prev => (prev >= 90 ? 90 : prev + 15));
      }, 80);

      // 30s timeout guard
      const uploadTimeoutPromise = new Promise<never>((_, reject) => {
        uploadTimeout = setTimeout(() => {
          reject(new Error('Upload timeout. Please check your connection and try again.'));
        }, 30000);
      });

      const uploadPromise = supabase.storage
        .from(folder)
        .upload(fileName, processedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: processedFile.type || 'image/jpeg'
        });

      const uploadResult: any = await Promise.race([
        uploadPromise,
        uploadTimeoutPromise
      ]);

      if (uploadTimeout) clearTimeout(uploadTimeout);
      if (progressInterval) clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadResult?.error) {
        console.warn('⚠️ Storage upload warning, attempting Data URL fallback...', uploadResult.error);
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(processedFile);
        });
        return dataUrl;
      }

      if (!uploadResult?.data?.path) {
        // Fallback to Data URL if path is missing
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(processedFile);
        });
        return dataUrl;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(folder)
        .getPublicUrl(uploadResult.data.path);

      console.log('✅ Image uploaded successfully:', { fileName, publicUrl });
      return publicUrl;
    } catch (error: any) {
      console.error('❌ Error uploading image:', error);
      if (uploadTimeout) clearTimeout(uploadTimeout);
      if (progressInterval) clearInterval(progressInterval);

      // Attempt emergency base64 fallback so checkout flow is never blocked
      try {
        const fallbackDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
        if (fallbackDataUrl) {
          console.log('✅ Emergency Data URL fallback succeeded');
          return fallbackDataUrl;
        }
      } catch {}

      throw new Error(error?.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const deleteImage = async (imageUrl: string): Promise<void> => {
    if (!imageUrl || imageUrl.startsWith('data:')) return;
    try {
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1]?.split('?')[0];
      if (fileName) {
        await supabase.storage.from(folder).remove([fileName]);
      }
    } catch (error) {
      console.warn('Image delete skipped:', error);
    }
  };

  return {
    uploadImage,
    deleteImage,
    uploading,
    uploadProgress
  };
};
