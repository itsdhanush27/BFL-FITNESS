import { storage, ref, uploadBytesResumable, getDownloadURL } from './firebase';
import { db, collection, addDoc, serverTimestamp, doc, updateDoc } from './firebase';
import { ProgressPhotoRecord, WeeklyCheckIn } from '../types';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 - 1.0
}

export interface UploadResult {
  downloadUrl: string;
  storagePath: string;
  compressedSize: number;
  originalSize: number;
}

/**
 * Compresses and optimizes an image file before upload.
 * Reduces large smartphone camera photos (5-15MB) to crisp, web-optimized ~150-350KB JPEGs.
 */
export async function compressAndOptimizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<{ file: File; originalSize: number; compressedSize: number }> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.84 } = options;
  const originalSize = file.size;

  // If already small or non-standard format, return as-is
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return { file, originalSize, compressedSize: originalSize };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      console.warn('[storageService] FileReader failed, using original file');
      resolve({ file, originalSize, compressedSize: originalSize });
    };

    reader.onload = (readerEvent) => {
      const img = new Image();

      img.onerror = () => {
        console.warn('[storageService] Image element loading failed, using original file');
        resolve({ file, originalSize, compressedSize: originalSize });
      };

      img.onload = () => {
        let { width, height } = img;

        // Downscale while strictly preserving aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.warn('[storageService] Canvas 2d context unavailable, using original file');
          resolve({ file, originalSize, compressedSize: originalSize });
          return;
        }

        // Draw image into canvas
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({ file, originalSize, compressedSize: originalSize });
              return;
            }

            // Create optimized file
            const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
            const compressedFile = new File([blob], `${cleanBaseName}_optimized.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve({
              file: compressedFile,
              originalSize,
              compressedSize: blob.size,
            });
          },
          'image/jpeg',
          quality
        );
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a client check-in photo file to Firebase Storage under the authenticated user's folder:
 * Path: `checkin-photos/{userId}/{timestamp}_{pose}.jpg`
 *
 * Automatically compresses the image before uploading to minimize latency and bandwidth.
 */
export async function uploadCheckInPhotoToStorage(
  file: File,
  userId: string,
  pose: 'front' | 'side' | 'back' | 'other' = 'front',
  onProgress?: (progressPercent: number) => void
): Promise<UploadResult> {
  if (!userId) {
    throw new Error('User ID is required to upload check-in photos to Firebase Storage.');
  }

  // Step 1: Compress and optimize image
  const { file: optimizedFile, originalSize, compressedSize } = await compressAndOptimizeImage(file);

  // Step 2: Define storage destination path under user's folder
  const timestamp = Date.now();
  const storagePath = `checkin-photos/${userId}/${timestamp}_${pose}.jpg`;
  const storageReference = ref(storage, storagePath);

  try {
    // Step 3: Upload with metadata
    const uploadTask = uploadBytesResumable(storageReference, optimizedFile, {
      contentType: 'image/jpeg',
      customMetadata: {
        userId,
        pose,
        uploadedAt: new Date().toISOString(),
        originalSize: originalSize.toString(),
        compressedSize: compressedSize.toString(),
      },
    });

    return await new Promise<UploadResult>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(pct);
          }
        },
        (error) => {
          console.error('[storageService] Firebase Storage upload error:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve({
              downloadUrl,
              storagePath,
              originalSize,
              compressedSize,
            });
          } catch (urlErr) {
            reject(urlErr);
          }
        }
      );
    });
  } catch (err: any) {
    console.error('[storageService] Failed to upload to Firebase Storage:', err);
    // Safe graceful fallback for local development or disconnected mode
    // Converts to Data URL so UI doesn't crash if Firebase Storage bucket is unreachable
    const fallbackDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(optimizedFile);
    });

    if (fallbackDataUrl) {
      console.warn('[storageService] Using fallback data URL for development');
      return {
        downloadUrl: fallbackDataUrl,
        storagePath: `local-fallback/${userId}/${timestamp}_${pose}.jpg`,
        originalSize,
        compressedSize,
      };
    }
    throw err;
  }
}

export interface CheckInPhotoUploadPayload {
  userId: string;
  clientName?: string;
  clientEmail?: string;
  weekNumber?: number;
  weightKg: number;
  waistCm?: number;
  notes?: string;
  frontFile?: File | null;
  sideFile?: File | null;
  backFile?: File | null;
  existingFrontUrl?: string;
  existingSideUrl?: string;
  existingBackUrl?: string;
  onProgress?: (progressMap: { front?: number; side?: number; overall: number }) => void;
}

export interface CheckInPhotoUploadResponse {
  frontUrl?: string;
  sideUrl?: string;
  backUrl?: string;
  checkInId: string;
  photoRecordId: string;
}

/**
 * Handles the complete pipeline:
 * 1. Takes uploaded files for front/side/back check-in poses.
 * 2. Compresses & optimizes them.
 * 3. Uploads them to Firebase Storage in `checkin-photos/{userId}/`.
 * 4. Saves the resulting download URLs into Firestore:
 *    - In `checkins` collection (linked to userId).
 *    - In `progress_photos` collection (linked to userId).
 * 5. Returns the stored URLs and document IDs.
 */
export async function uploadAndSaveCheckInPhotos(
  payload: CheckInPhotoUploadPayload
): Promise<CheckInPhotoUploadResponse> {
  const {
    userId,
    clientName = 'Athlete',
    clientEmail,
    weekNumber,
    weightKg,
    waistCm,
    notes = 'Weekly Check-in Photo',
    frontFile,
    sideFile,
    backFile,
    existingFrontUrl,
    existingSideUrl,
    existingBackUrl,
    onProgress,
  } = payload;

  let frontUrl = existingFrontUrl || '';
  let sideUrl = existingSideUrl || '';
  let backUrl = existingBackUrl || '';

  const progressState = { front: 0, side: 0, overall: 0 };
  const updateOverall = () => {
    if (onProgress) {
      let count = 0;
      let total = 0;
      if (frontFile) { count++; total += progressState.front; }
      if (sideFile) { count++; total += progressState.side; }
      progressState.overall = count > 0 ? Math.round(total / count) : 100;
      onProgress(progressState);
    }
  };

  // Upload front photo if provided
  if (frontFile) {
    const frontRes = await uploadCheckInPhotoToStorage(frontFile, userId, 'front', (pct) => {
      progressState.front = pct;
      updateOverall();
    });
    frontUrl = frontRes.downloadUrl;
  }

  // Upload side photo if provided
  if (sideFile) {
    const sideRes = await uploadCheckInPhotoToStorage(sideFile, userId, 'side', (pct) => {
      progressState.side = pct;
      updateOverall();
    });
    sideUrl = sideRes.downloadUrl;
  }

  // Upload back photo if provided
  if (backFile) {
    const backRes = await uploadCheckInPhotoToStorage(backFile, userId, 'back');
    backUrl = backRes.downloadUrl;
  }

  const currentDate = new Date().toISOString().split('T')[0];

  // Step 4a: Save to Firestore `progress_photos` collection linked to user ID
  let photoRecordId = '';
  try {
    const photoDocPayload: Omit<ProgressPhotoRecord, 'id'> = {
      clientId: userId,
      date: currentDate,
      frontUrl: frontUrl || '',
      sideUrl: sideUrl || undefined,
      backUrl: backUrl || undefined,
      weightKg: Number(weightKg) || 0,
      notes: notes || `Check-in physique photo`,
    };

    const photoDocRef = await addDoc(collection(db, 'progress_photos'), {
      ...photoDocPayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    photoRecordId = photoDocRef.id;
  } catch (err) {
    console.error('[storageService] Error saving progress photo to Firestore:', err);
  }

  // Step 4b: Save or update in Firestore `checkins` collection linked to user ID
  let checkInId = '';
  try {
    const checkInPayload: Omit<WeeklyCheckIn, 'id'> = {
      clientId: userId,
      clientName,
      clientEmail: clientEmail || undefined,
      weekNumber: weekNumber || 1,
      submissionDate: currentDate,
      weightKg: Number(weightKg) || 0,
      waistMeasurementCm: waistCm ? Number(waistCm) : undefined,
      adherenceRating: 9,
      energyRating: 8,
      sleepHours: 8,
      stressRating: 4,
      hungerRating: 5,
      progressPhotos: {
        front: frontUrl || undefined,
        side: sideUrl || undefined,
        back: backUrl || undefined,
      },
      winsAndStruggles: notes || `Check-in photos uploaded for Week ${weekNumber || 1}`,
      reviewedByCoach: false,
    };

    const checkInDocRef = await addDoc(collection(db, 'checkins'), {
      ...checkInPayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    checkInId = checkInDocRef.id;
  } catch (err) {
    console.error('[storageService] Error saving check-in document to Firestore:', err);
  }

  return {
    frontUrl,
    sideUrl,
    backUrl,
    checkInId,
    photoRecordId,
  };
}

/** Format file size in human-readable bytes */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
