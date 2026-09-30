const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];

/** Compress chat photos on-device so uploads stay small and fast. */
export async function prepareChatImage(file) {
  if (!file || !acceptedTypes.includes(file.type))
    throw new Error('Choose a JPG, PNG, or WebP photo.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Choose a photo smaller than 8 MB.');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That photo could not be opened. Try another one.');
  }
  try {
    if (bitmap.width * bitmap.height > 25_000_000)
      throw new Error('Choose a photo under 25 megapixels.');
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.72));
    if (!blob || blob.type !== 'image/webp' || blob.size > 1.5 * 1024 * 1024)
      throw new Error('This photo is too large to send. Try a smaller one.');
    return new File([blob], 'chat-photo.webp', { type: 'image/webp' });
  } finally {
    bitmap.close();
  }
}
