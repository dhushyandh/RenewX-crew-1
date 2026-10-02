import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const LOCATION_STORAGE_KEY = '@renewx_user_location_v2';
const DEFAULT_LOCATION = 'Bangalore - 560004';

interface LocationContextType {
  location: string;
  area: string;
  pincode: string;
  isDetecting: boolean;
  detectLocation: () => Promise<string | null>;
  setLocationManually: (newLoc: string) => void;
  showLocationModal: boolean;
  setShowLocationModal: (show: boolean) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<string>(DEFAULT_LOCATION);
  const [area, setArea] = useState<string>('Bangalore');
  const [pincode, setPincode] = useState<string>('560004');
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);

  // Load saved location on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
        if (saved) {
          setLocation(saved);
          const parts = saved.split(' - ');
          if (parts.length === 2) {
            setArea(parts[0].trim());
            setPincode(parts[1].trim());
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const saveLocation = useCallback(async (locStr: string, areaStr?: string, pinStr?: string) => {
    setLocation(locStr);
    if (areaStr) setArea(areaStr);
    if (pinStr) setPincode(pinStr);
    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, locStr).catch(() => {});
  }, []);

  const detectLocation = useCallback(async (): Promise<string | null> => {
    setIsDetecting(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;

      // 1. Web Geolocation or Expo Location
      if (Platform.OS === 'web' && typeof window !== 'undefined' && navigator.geolocation) {
        try {
          const coords = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              (err) => reject(err),
              { timeout: 10000, enableHighAccuracy: true }
            );
          });
          lat = coords.latitude;
          lng = coords.longitude;
        } catch {
          // fall through to expo-location
        }
      }

      if (lat === null || lng === null) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setIsDetecting(false);
          return null;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      }

      let detectedArea = '';
      let detectedPin = '';

      // 2. Try Expo Reverse Geocode first
      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (geocode && geocode.length > 0) {
          const g = geocode[0];
          detectedArea =
            g.district ||
            g.subregion ||
            g.name ||
            g.city ||
            g.street ||
            '';
          detectedPin = g.postalCode || '';
        }
      } catch {
        // ignore expo reverse geocode error
      }

      // 3. Fallback to client reverse geocode API if missing pincode or area
      if (!detectedArea || !detectedPin) {
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
          );
          if (response.ok) {
            const data = await response.json();
            if (!detectedArea) {
              detectedArea = data.locality || data.city || data.principalSubdivision || '';
            }
            if (!detectedPin) {
              detectedPin = data.postcode || '';
            }
          }
        } catch {
          // fallback
        }
      }

      // Fallback defaults if area or pincode couldn't be resolved
      if (!detectedArea) detectedArea = 'Bengaluru Central';
      if (!detectedPin) detectedPin = '560001';

      const finalFormatted = `${detectedArea} - ${detectedPin}`;
      await saveLocation(finalFormatted, detectedArea, detectedPin);
      setIsDetecting(false);
      return finalFormatted;
    } catch {
      setIsDetecting(false);
      return null;
    }
  }, [saveLocation]);

  const setLocationManually = useCallback(
    (newLoc: string) => {
      const parts = newLoc.split(' - ');
      const a = parts[0]?.trim() || newLoc;
      const p = parts[1]?.trim() || '';
      saveLocation(newLoc, a, p);
    },
    [saveLocation]
  );

  return (
    <LocationContext.Provider
      value={{
        location,
        area,
        pincode,
        isDetecting,
        detectLocation,
        setLocationManually,
        showLocationModal,
        setShowLocationModal,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
