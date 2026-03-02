import * as FileSystem from 'expo-file-system';
import { Photo } from '../types';

const PHOTOS_DIR = FileSystem.documentDirectory + 'cuticle-photos/';

export async function ensurePhotosDirExists(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
}

/** Copies a temporary camera URI to permanent app storage and returns a Photo record. */
export async function savePhoto(tempUri: string, thingId: string): Promise<Photo> {
  await ensurePhotosDirExists();
  const id = `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ext = tempUri.split('.').pop() ?? 'jpg';
  const permanentUri = `${PHOTOS_DIR}${thingId}-${id}.${ext}`;
  await FileSystem.copyAsync({ from: tempUri, to: permanentUri });
  return {
    id,
    uri: permanentUri,
    capturedAt: new Date().toISOString(),
  };
}

/** Deletes the photo file from disk. */
export async function deletePhoto(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}
