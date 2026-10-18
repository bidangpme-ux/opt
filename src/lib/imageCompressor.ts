/**
 * Image Compressor Utility for SIPOPT Tanggamus
 * Compresses any uploaded photo (from mobile camera or gallery)
 * to a target size of <= 300 KB with optimal visual quality.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  width: number;
  height: number;
  compressionRatio: number; // percentage saved, e.g. 75 (%)
}

/**
 * Calculates approximate size in Kilobytes from a Base64 data URL
 */
export function getBase64SizeKB(base64String: string): number {
  const clean = base64String.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
  const padding = (clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0);
  const bytes = (clean.length * 3) / 4 - padding;
  return Math.max(1, Math.round(bytes / 1024));
}

/**
 * Compresses an image file or base64 data URL to target max size in KB (default: 300KB)
 */
export async function compressImageToTarget(
  input: File | string,
  targetMaxKB: number = 300,
  maxDimension: number = 1440
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    // 1. Get source data URL and initial size
    let initialDataUrl: string;
    let originalSizeKB = 0;

    const processDataUrl = (src: string) => {
      initialDataUrl = src;
      originalSizeKB = getBase64SizeKB(src);

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        let currentWidth = img.naturalWidth || img.width;
        let currentHeight = img.naturalHeight || img.height;

        // Scale dimensions down if exceeding maxDimension
        if (currentWidth > maxDimension || currentHeight > maxDimension) {
          const ratio = Math.min(maxDimension / currentWidth, maxDimension / currentHeight);
          currentWidth = Math.round(currentWidth * ratio);
          currentHeight = Math.round(currentHeight * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = currentWidth;
        canvas.height = currentHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas 2D context tidak tersedia'));
        }

        // Fill background with white for transparency safety
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, currentWidth, currentHeight);
        ctx.drawImage(img, 0, 0, currentWidth, currentHeight);

        // Quality stepping list to hit target <= 300 KB
        const qualities = [0.85, 0.78, 0.70, 0.60, 0.50, 0.40, 0.30];
        let bestDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        let bestSizeKB = getBase64SizeKB(bestDataUrl);

        for (const q of qualities) {
          const testDataUrl = canvas.toDataURL('image/jpeg', q);
          const testSizeKB = getBase64SizeKB(testDataUrl);

          bestDataUrl = testDataUrl;
          bestSizeKB = testSizeKB;

          if (testSizeKB <= targetMaxKB) {
            break;
          }
        }

        // If still > targetMaxKB, scale canvas down further
        if (bestSizeKB > targetMaxKB) {
          const scaleDown = 0.75;
          currentWidth = Math.round(currentWidth * scaleDown);
          currentHeight = Math.round(currentHeight * scaleDown);

          canvas.width = currentWidth;
          canvas.height = currentHeight;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, currentWidth, currentHeight);
          ctx.drawImage(img, 0, 0, currentWidth, currentHeight);

          bestDataUrl = canvas.toDataURL('image/jpeg', 0.65);
          bestSizeKB = getBase64SizeKB(bestDataUrl);
        }

        const savedRatio = originalSizeKB > 0
          ? Math.max(0, Math.round(((originalSizeKB - bestSizeKB) / originalSizeKB) * 100))
          : 0;

        resolve({
          dataUrl: bestDataUrl,
          originalSizeKB,
          compressedSizeKB: bestSizeKB,
          width: currentWidth,
          height: currentHeight,
          compressionRatio: savedRatio
        });
      };

      img.onerror = () => {
        reject(new Error('Gagal memuat gambar untuk proses kompresi'));
      };

      img.src = src;
    };

    if (input instanceof File) {
      originalSizeKB = Math.round(input.size / 1024);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          processDataUrl(reader.result);
        } else {
          reject(new Error('Gagal membaca file gambar'));
        }
      };
      reader.onerror = () => reject(new Error('Kesalahan membaca file foto'));
      reader.readAsDataURL(input);
    } else if (typeof input === 'string') {
      processDataUrl(input);
    } else {
      reject(new Error('Input tidak valid untuk kompresi'));
    }
  });
}
