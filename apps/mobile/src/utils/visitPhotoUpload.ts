import { uploadVisitPhoto } from '@nail-couture/shared/utils/staffCustomerTimeline.js';
import { readLocalUriForUpload } from './localFileUpload';
import {
  pickImageFromLibrary,
  takePhotoWithCamera,
  type PickedMediaAsset,
} from './mediaPicker';

type PickResult =
  | { canceled: true; reason?: 'permission' | 'picker' }
  | { canceled: false; asset: PickedMediaAsset };

type UploadVisitPhotoResult = Awaited<ReturnType<typeof uploadVisitPhoto>>;

export type PickAndUploadVisitPhotoResult =
  | (UploadVisitPhotoResult & { canceled?: false })
  | { success: false; canceled: true; error?: string };

async function pickImageAsset(source: 'library' | 'camera'): Promise<PickResult> {
  const asset = source === 'camera'
    ? await takePhotoWithCamera()
    : await pickImageFromLibrary();

  if (!asset) {
    return { canceled: true, reason: 'picker' };
  }

  return { canceled: false, asset };
}

export async function pickVisitPhotoFromLibrary(): Promise<PickResult> {
  return pickImageAsset('library');
}

export async function takeVisitPhotoFromCamera(): Promise<PickResult> {
  return pickImageAsset('camera');
}

export async function uploadVisitPhotoFromAsset(
  customerId: string,
  appointmentId: string | null,
  asset: PickedMediaAsset,
  photoType: string,
  uploadedBy?: string,
) {
  try {
    const payload = await readLocalUriForUpload(
      asset.uri,
      asset.fileName,
      asset.mimeType,
      asset.size,
    );
    return uploadVisitPhoto(
      customerId,
      appointmentId,
      payload.body,
      photoType,
      uploadedBy,
      {
        fileName: payload.fileName,
        mimeType: payload.mimeType,
      },
    );
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Upload failed',
    };
  }
}

async function pickAndUpload(
  picker: () => Promise<PickResult>,
  customerId: string,
  appointmentId: string | null,
  photoType: string,
  uploadedBy?: string,
): Promise<PickAndUploadVisitPhotoResult> {
  const picked = await picker();
  if (picked.canceled) {
    return { success: false, canceled: true };
  }

  return uploadVisitPhotoFromAsset(
    customerId,
    appointmentId,
    picked.asset,
    photoType,
    uploadedBy,
  );
}

export async function pickAndUploadVisitPhoto(
  customerId: string,
  appointmentId: string | null,
  photoType: string,
  uploadedBy?: string,
): Promise<PickAndUploadVisitPhotoResult> {
  return pickAndUpload(
    pickVisitPhotoFromLibrary,
    customerId,
    appointmentId,
    photoType,
    uploadedBy,
  );
}

export async function takeAndUploadVisitPhoto(
  customerId: string,
  appointmentId: string | null,
  photoType: string,
  uploadedBy?: string,
): Promise<PickAndUploadVisitPhotoResult> {
  return pickAndUpload(
    takeVisitPhotoFromCamera,
    customerId,
    appointmentId,
    photoType,
    uploadedBy,
  );
}
