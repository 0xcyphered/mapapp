const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(num: number | string): string {
  const str = typeof num === 'number' ? String(num) : num;
  return str.replace(/[0-9]/g, (d) => PERSIAN_DIGITS[parseInt(d, 10)]);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${toPersianDigits(Math.round(meters))} متر`;
  }
  const km = meters / 1000;
  const formatted = km < 10 ? km.toFixed(2) : km < 100 ? km.toFixed(1) : km.toFixed(0);
  return `${toPersianDigits(formatted)} کیلومتر`;
}

export function formatCoordinate(lat: number, lng: number): string {
  return `${toPersianDigits(lat.toFixed(6))}, ${toPersianDigits(lng.toFixed(6))}`;
}

export function toPersianNumber(n: number): string {
  return toPersianDigits(n.toString());
}