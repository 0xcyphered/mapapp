import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

export type UserPosition = { lat: number; lng: number; accuracy: number };

export const LOCATION_DENIED_MESSAGE =
  'دسترسی به موقعیت مکانی رد شد. لطفاً از تنظیمات دستگاه اجازه دهید.';
export const LOCATION_UNAVAILABLE_MESSAGE =
  'خدمات موقعیت‌یابی در دسترس نیست. لطفاً دسترسی GPS را بررسی کنید.';

export function useUserLocation() {
  const [position, setPosition] = useState<UserPosition | null>(null);

  const request = useCallback(async (): Promise<UserPosition> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error(LOCATION_DENIED_MESSAGE);
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const pos = {
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy ?? 0,
    };
    setPosition(pos);
    return pos;
  }, []);

  return { position, request };
}