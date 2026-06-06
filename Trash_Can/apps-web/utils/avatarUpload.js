import { supabase } from '../lib/supabase';

const BUCKET = 'avatars';
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function uploadProfileAvatar(file, profileId) {
  if (!file || !profileId) {
    return { success: false, error: 'Missing file or profile' };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: 'Please upload a JPEG, PNG, WebP, or GIF image' };
  }
  if (file.size > MAX_BYTES) {
    return { success: false, error: 'Image must be under 2 MB' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${profileId}/avatar.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadErr) {
    if (uploadErr.message?.includes('Bucket not found')) {
      return { success: false, error: 'Avatar storage not set up. Run sql/024_phase3_loyalty_engagement.sql in Supabase.' };
    }
    return { success: false, error: uploadErr.message || 'Upload failed' };
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const avatarUrl = urlData?.publicUrl ? `${urlData.publicUrl}?t=${Date.now()}` : null;

  if (!avatarUrl) {
    return { success: false, error: 'Could not resolve avatar URL' };
  }

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', profileId);

  if (updateErr) {
    if (updateErr.message?.includes('avatar_url')) {
      return { success: false, error: 'Avatar column missing. Run sql/024_phase3_loyalty_engagement.sql in Supabase.' };
    }
    return { success: false, error: updateErr.message || 'Failed to save avatar' };
  }

  return { success: true, avatarUrl };
}

export function getProfileInitials(fullName) {
  return (fullName || '??')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
