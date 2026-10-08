/**
 * Format raw bytes into human readable string (e.g. 1.25 MB, 450 KB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const safeIndex = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(dm))} ${sizes[safeIndex]}`;
}

/**
 * Calculate saved percentage between original and compressed sizes
 */
export function calculateSavings(original: number, compressed: number): string {
  if (original <= 0) return "0.00%";
  const ratio = (1 - compressed / original) * 100;
  return `${ratio.toFixed(2)}%`;
}
