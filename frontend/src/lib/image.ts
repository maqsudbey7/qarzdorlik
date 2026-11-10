/** Rasmni telefonda siqish: uzun tomoni 1600px, JPEG 80% — odatda 150–400 KB. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('not image');
  const bitmap = await createImageBitmap(file).catch(() => null);
  const src: CanvasImageSource & { width: number; height: number } = bitmap ?? (await loadImg(file));
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
  const w = Math.round(src.width * scale);
  const h = Math.round(src.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0, w, h);
  bitmap?.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', quality));
}

function loadImg(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
