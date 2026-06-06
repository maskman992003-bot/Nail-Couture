import * as ImagePicker from 'expo-image-picker';
import { uploadVisitPhoto } from '@nail-couture/shared/utils/staffCustomerTimeline.js';

type PickedAsset = {
  uri: string;
  fileName: string;
  mimeType: string;
};

type PickResult =
  | { canceled: true; reason?: 'permission' | 'picker' }
  | { canceled: false; asset: PickedAsset };

type UploadVisitPhotoResult = Awaited<ReturnType<typeof uploadVisitPhoto>>;

export type PickAndUploadVisitPhotoResult =
  | (UploadVisitPhotoResult & { canceled?: false })
  | { success: false; canceled: true; error?: string };

export async function pickVisitPhotoFromLibrary(): Promise<PickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { canceled: true, reason: 'permission' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) {
    return { canceled: true, reason: 'picker' };
  }

  const asset = result.assets[0];
  return {
    canceled: false,
    asset: {
      uri: asset.uri,
      fileName: asset.fileName || `photo_${Date.now()}.jpg`,
      mimeType: asset.mimeType || 'image/jpeg',
    },
  };
}

export async function uploadVisitPhotoFromAsset(
  customerId: string,
  appointmentId: string | null,
  asset: PickedAsset,
  photoType: string,
  uploadedBy?: string,
) {
  const response = await fetch(asset.uri);
  const blob = await response.blob();
  const file = Object.assign(blob, { name: asset.fileName });
  return uploadVisitPhoto(customerId, appointmentId, file, photoType, uploadedBy);
}

export async function pickAndUploadVisitPhoto(
  customerId: string,
  appointmentId: string | null,
  photoType: string,
  uploadedBy?: string,
): Promise<PickAndUploadVisitPhotoResult> {
  const picked = await pickVisitPhotoFromLibrary();
  if (picked.canceled) {
    if (picked.reason === 'permission') {
      return { success: false, canceled: true, error: 'Photo library permission denied' };
    }
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
