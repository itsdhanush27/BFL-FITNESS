/**
 * BFL Fitness Mobile — Firebase Storage Service
 * Handles uploading check-in photos, progress photos, and avatars.
 */

import { storage, ref, getDownloadURL, uploadBytesResumable } from './firebase';

export interface UploadProgressCallback {
  (progress: number): void;
}

/**
 * Uploads a local file URI (from expo-image-picker) to Firebase Storage
 * @param uri Local file URI from image picker (e.g. file:///...)
 * @param storagePath Storage path (e.g. checkin-photos/{userId}/{timestamp}.jpg)
 * @param onProgress Optional progress callback (0 - 100)
 * @returns Download URL of the uploaded image
 */
export async function uploadImageUri(
  uri: string,
  storagePath: string,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const fileRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(fileRef, blob, {
    contentType: 'image/jpeg',
  });

  return new Promise<string>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(Math.round(progress));
        }
      },
      (error) => {
        console.error('[storageService] Upload failed:', error);
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (urlError) {
          reject(urlError);
        }
      }
    );
  });
}

/**
 * Upload check-in photo for a client
 */
export async function uploadCheckInPhoto(
  userId: string,
  uri: string,
  photoType: 'front' | 'side' | 'back' = 'front',
  onProgress?: UploadProgressCallback
): Promise<string> {
  const timestamp = Date.now();
  const path = `checkin-photos/${userId}/${timestamp}_${photoType}.jpg`;
  return uploadImageUri(uri, path, onProgress);
}

/**
 * Upload progress photo for progress gallery
 */
export async function uploadProgressPhoto(
  userId: string,
  uri: string,
  angle: 'front' | 'side' | 'back' = 'front',
  onProgress?: UploadProgressCallback
): Promise<string> {
  const timestamp = Date.now();
  const path = `progress_photos/${userId}/${timestamp}_${angle}.jpg`;
  return uploadImageUri(uri, path, onProgress);
}
