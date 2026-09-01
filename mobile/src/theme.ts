export const COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  gray: '#9ca3af',
  grayLight: '#f1f5f9',
  bg: '#e8e4e0',
  white: '#ffffff',
  textDark: '#1f2937',
  textMid: '#4b5563',
} as const;

/** MapLibre wants [lng, lat]. Tehran. */
export const TEHRAN: [number, number] = [51.389, 35.6892];