/**
 * Utility for resizing and compressing images via HTML5 Canvas on the client side.
 * Bypasses direct file size bloat and ensures consistent image format for IPC storage.
 */

export interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: string;
}

export interface OptimizedImageResult {
  base64DataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export async function optimizeImage(
  file: File | Blob,
  options: OptimizeImageOptions = {}
): Promise<OptimizedImageResult> {
  const maxWidth = options.maxWidth || 1200;
  const maxHeight = options.maxHeight || 1200;
  const quality = options.quality !== undefined ? options.quality : 0.85;
  const outputType = options.outputType || 'image/webp';

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D canvas context'));
        return;
      }

      // Fill transparent background with white if converting PNG to JPEG
      if (outputType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      const base64DataUrl = canvas.toDataURL(outputType, quality);

      // Estimate byte size from base64 string
      const base64Length = base64DataUrl.split(',')[1]?.length || 0;
      const padding = (base64DataUrl.match(/=+$/) || [''])[0].length;
      const sizeBytes = Math.max(0, Math.round((base64Length * 3) / 4) - padding);

      resolve({
        base64DataUrl,
        width,
        height,
        sizeBytes,
      });
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for optimization'));
    };

    img.src = objectUrl;
  });
}
