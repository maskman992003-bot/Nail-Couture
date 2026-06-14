import {
  isValidAnnouncementDocumentFile,
  MAX_ANNOUNCEMENT_ATTACHMENTS,
  uploadAnnouncementAttachment,
} from '@nail-couture/shared/utils/announcementAttachments.js';
import { readLocalUriForUpload } from './localFileUpload';
import {
  pickDocument,
  pickImageFromLibrary,
  takePhotoWithCamera,
  type PickedMediaAsset,
} from './mediaPicker';

export type AnnouncementAttachment = Awaited<ReturnType<typeof uploadAnnouncementAttachment>>;

async function assetToAttachment(profileId: string, asset: PickedMediaAsset): Promise<AnnouncementAttachment> {
  const payload = await readLocalUriForUpload(
    asset.uri,
    asset.fileName,
    asset.mimeType,
    asset.size,
  );
  return uploadAnnouncementAttachment(
    profileId,
    payload.body,
    payload.fileName,
    payload.mimeType,
    { sizeBytes: payload.sizeBytes },
  );
}

export async function pickAnnouncementPhotoFromLibrary(): Promise<PickedMediaAsset | null> {
  return pickImageFromLibrary();
}

export async function takeAnnouncementPhoto(): Promise<PickedMediaAsset | null> {
  return takePhotoWithCamera();
}

export async function pickAnnouncementDocument(): Promise<PickedMediaAsset | null> {
  const asset = await pickDocument(['application/pdf', 'text/plain']);
  if (!asset) return null;

  if (!isValidAnnouncementDocumentFile({ name: asset.fileName, type: asset.mimeType })) {
    throw new Error('File attachments must be PDF or TXT. Use Photos for images.');
  }

  return asset;
}

export async function uploadPickedAnnouncementAsset(
  profileId: string,
  asset: PickedMediaAsset,
): Promise<AnnouncementAttachment> {
  return assetToAttachment(profileId, asset);
}

export function canAddMoreAttachments(currentCount: number) {
  return currentCount < MAX_ANNOUNCEMENT_ATTACHMENTS;
}
