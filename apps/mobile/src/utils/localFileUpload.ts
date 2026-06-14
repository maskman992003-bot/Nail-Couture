type LocalUploadPayload = {
  body: ArrayBuffer;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export async function readLocalUriForUpload(
  uri: string,
  fileName: string,
  mimeType: string,
  sizeHint?: number,
): Promise<LocalUploadPayload> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Could not read the selected file.');
  }

  const body = await response.arrayBuffer();
  const sizeBytes = sizeHint && sizeHint > 0 ? sizeHint : body.byteLength;
  if (sizeBytes < 1) {
    throw new Error('Selected file is empty or unreadable.');
  }

  return {
    body,
    fileName,
    mimeType: mimeType || 'application/octet-stream',
    sizeBytes,
  };
}
