export const randomColors = (length: number) =>
  Array.from({ length }, () => `#${Math.floor(Math.random() * 16777215).toString(16)}`);

export function rgbToHex(r: number, g: number, b: number): string {
  // Clamp values to be in the range of 0-255
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  // Convert to hex and pad with leading zeros if necessary
  const hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();

  return `#${hex}`;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB | null {
  // Remove the hash at the start if it's there
  hex = hex.replace(/^#/, "");

  // Check if the hex format is valid
  if (hex.length !== 6) {
    return null; // Return null for invalid hex input
  }

  // Parse the hex values
  let bigint = parseInt(hex, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;

  return { r, g, b };
}

export const scaleWeightToColor = (w: number) => Math.floor(w * 255);
