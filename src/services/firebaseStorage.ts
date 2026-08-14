import { storage } from '../lib/firebase';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

/**
 * Upload a file to Firebase Storage under a designated folder path
 * Returns the public download URL.
 */
export async function uploadFileToStorage(file: File | Blob, folderPath: string, fileName?: string): Promise<string> {
  const name = fileName || `${Date.now()}_${(file as File).name || 'attachment'}`;
  const fullPath = `${folderPath.replace(/\/$/, '')}/${name}`;
  const storageRef = ref(storage, fullPath);
  
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}

/**
 * Delete a file from Firebase Storage given its full HTTPS download URL or path
 */
export async function deleteFileFromStorageByUrl(url: string): Promise<boolean> {
  if (!url || typeof url !== 'string' || !url.includes('firebasestorage.googleapis.com')) {
    return false;
  }
  
  try {
    const decodeUrl = decodeURIComponent(url);
    const parts = decodeUrl.split('/o/');
    if (parts.length > 1) {
      const filePath = parts[1].split('?')[0];
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      console.log(`🗑️ Storage file deleted: ${filePath}`);
      return true;
    }
  } catch (error) {
    console.warn(`Failed to delete storage file by URL (${url}):`, error);
  }
  return false;
}
