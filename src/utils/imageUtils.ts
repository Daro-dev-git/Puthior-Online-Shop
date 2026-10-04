/**
 * Utility for reading and compressing image files selected from the local computer.
 * Converts to high-quality compressed JPEG data URL for instant rendering and safe cloud storage.
 * Keeps document payload well under Firestore's 1MB limit.
 */
export interface ProcessedImageResult {
  dataUrl: string;
  width: number;
  height: number;
}

export async function processLocalImageFile(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.72
): Promise<ProcessedImageResult> {
  return new Promise((resolve, reject) => {
    // Basic file validation
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file must be an image'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image from local computer'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image preview'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale proportionally if larger than maximum bounds
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: reader.result as string,
            width: img.width,
            height: img.height,
          });
          return;
        }

        // Draw image onto canvas with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG data URL to keep size small & reliable in database
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({
          dataUrl,
          width,
          height,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
