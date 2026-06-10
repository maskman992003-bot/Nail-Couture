import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  isValidAnnouncementDocumentFile,
  MAX_ANNOUNCEMENT_ATTACHMENTS,
  uploadAnnouncementAttachment,
} from '@nail-couture/shared/utils/announcementAttachments.js';

export type AnnouncementAttachment = Awaited<ReturnType<typeof uploadAnnouncementAttachment>>;

type PickedAsset = {
  uri: string;
  fileName: string;
  mimeType: string;
  size?: number;
};

async function assetToAttachment(profileId: string, asset: PickedAsset): Promise<AnnouncementAttachment> {
  const response = await fetch(asset.uri);
  const blob = await response.blob();
  const file = Object.assign(blob, { name: asset.fileName });
  return uploadAnnouncementAttachment(
    profileId,
    file,
    asset.fileName,
    asset.mimeType,
  );
}

export async function pickAnnouncementPhotoFromLibrary(): Promise<PickedAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission denied.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    fileName: asset.fileName || `photo_${Date.now()}.jpg`,
    mimeType: asset.mimeType || 'image/jpeg',
    size: asset.fileSize,
  };
}

export async function takeAnnouncementPhoto(): Promise<PickedAsset | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera permission denied.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    fileName: asset.fileName || `camera_${Date.now()}.jpg`,
    mimeType: asset.mimeType || 'image/jpeg',
    size: asset.fileSize,
  };
}

export async function pickAnnouncementDocument(): Promise<PickedAsset | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'text/plain'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const fileName = asset.name || `file_${Date.now()}`;
  const mimeType = asset.mimeType || 'application/pdf';

  if (!isValidAnnouncementDocumentFile({ name: fileName, type: mimeType })) {
    throw new Error('File attachments must be PDF or TXT. Use Photos for images.');
  }

  return {
    uri: asset.uri,
    fileName,
    mimeType,
    size: asset.size,
  };
}

export async function uploadPickedAnnouncementAsset(
  profileId: string,
  asset: PickedAsset,
): Promise<AnnouncementAttachment> {
  return assetToAttachment(profileId, asset);
}

export function canAddMoreAttachments(currentCount: number) {
  return currentCount < MAX_ANNOUNCEMENT_ATTACHMENTS;
}
