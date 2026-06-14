import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export type PickedMediaAsset = {
  uri: string;
  fileName: string;
  mimeType: string;
  size?: number;
};

const IMAGE_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  allowsEditing: false,
  quality: 1,
  ...(Platform.OS === 'android' ? { legacy: true } : {}),
};

function permissionAlert(kind: 'camera' | 'photos') {
  const label = kind === 'camera' ? 'Camera' : 'Photos';
  Alert.alert(
    `${label} access needed`,
    `Allow ${label.toLowerCase()} access in your device settings to continue.`,
  );
}

function pickerErrorAlert(message: string) {
  Alert.alert('Could not open picker', message);
}

async function ensureCameraPermission(): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;

  const requested = await ImagePicker.requestCameraPermissionsAsync();
  if (requested.granted) return true;

  permissionAlert('camera');
  return false;
}

async function ensureLibraryPermission(): Promise<boolean> {
  // Android 13+ uses the system photo picker and does not require broad storage access.
  if (Platform.OS === 'android') return true;

  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;

  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (requested.granted) return true;

  permissionAlert('photos');
  return false;
}

async function recoverPendingImagePickerResult(): Promise<ImagePicker.ImagePickerResult | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const pending = await ImagePicker.getPendingResultAsync();
    if (pending && typeof pending === 'object' && 'canceled' in pending && !pending.canceled) {
      return pending as ImagePicker.ImagePickerResult;
    }
  } catch {
    // No pending result to recover.
  }
  return null;
}

function mapImageAsset(asset: ImagePicker.ImagePickerAsset, fallbackPrefix: string): PickedMediaAsset {
  return {
    uri: asset.uri,
    fileName: asset.fileName || `${fallbackPrefix}_${Date.now()}.jpg`,
    mimeType: asset.mimeType || 'image/jpeg',
    size: asset.fileSize,
  };
}

export async function pickImageFromLibrary(): Promise<PickedMediaAsset | null> {
  if (!(await ensureLibraryPermission())) return null;

  try {
    let result = await ImagePicker.launchImageLibraryAsync(IMAGE_PICKER_OPTIONS);
    if (!result.canceled && result.assets[0]) {
      return mapImageAsset(result.assets[0], 'photo');
    }
    if (result.canceled) return null;

    const pending = await recoverPendingImagePickerResult();
    if (pending?.assets?.[0]) {
      return mapImageAsset(pending.assets[0], 'photo');
    }
  } catch (err) {
    pickerErrorAlert(err instanceof Error ? err.message : 'Photo library could not be opened.');
  }

  return null;
}

export async function takePhotoWithCamera(): Promise<PickedMediaAsset | null> {
  if (!(await ensureCameraPermission())) return null;

  try {
    let result = await ImagePicker.launchCameraAsync(IMAGE_PICKER_OPTIONS);
    if (!result.canceled && result.assets[0]) {
      return mapImageAsset(result.assets[0], 'camera');
    }
    if (result.canceled) return null;

    const pending = await recoverPendingImagePickerResult();
    if (pending?.assets?.[0]) {
      return mapImageAsset(pending.assets[0], 'camera');
    }
  } catch (err) {
    pickerErrorAlert(err instanceof Error ? err.message : 'Camera could not be opened.');
  }

  return null;
}

export async function pickDocument(
  mimeTypes: string[] = ['application/pdf', 'text/plain'],
): Promise<PickedMediaAsset | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: mimeTypes,
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      fileName: asset.name || `file_${Date.now()}`,
      mimeType: asset.mimeType || 'application/pdf',
      size: asset.size,
    };
  } catch (err) {
    pickerErrorAlert(err instanceof Error ? err.message : 'File picker could not be opened.');
  }

  return null;
}
