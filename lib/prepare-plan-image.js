const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];

export async function preparePlanImage(file) {
  if (!file || !acceptedTypes.includes(file.type))
    throw new Error('Choose a JPG, PNG, or WebP photo.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Choose a photo smaller than 12 MB.');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That photo could not be opened. Try another one.');
  }
  try {
    if (bitmap.width * bitmap.height > 36_000_000)
      throw new Error('Choose a photo under 36 megapixels.');
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (!blob || blob.type !== 'image/webp' || blob.size > 4 * 1024 * 1024)
      throw new Error('This photo is too large to upload. Try a smaller one.');
    return new File([blob], 'plan-photo.webp', { type: 'image/webp' });
  } finally {
    bitmap.close();
  }
}
