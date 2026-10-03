import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { reverseGeocodeCoords } from '@/services/locationService';

const LOCATION_STORAGE_KEY = '@renewx_user_location_v3';
const DEFAULT_LOCATION = '';

export interface UserLocation {
  label: string;
  district: string;
  pincode: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
}

export interface LocationContextType {
  location: string;
  area: string;
  pincode: string;
  userLocation: UserLocation | null;
  isDetecting: boolean;
  locationError: boolean;
  detectLocation: () => Promise<string | null>;
  setLocationManually: (newLoc: string, structured?: Partial<UserLocation>) => void;
  showLocationModal: boolean;
  setShowLocationModal: (show: boolean) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<string>(DEFAULT_LOCATION);
  const [area, setArea] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<boolean>(false);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);

  // Load saved location on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
              const loc = parsed.location || parsed.label || '';
              const dist = parsed.district || parsed.area || parsed.city || '';
              const pin = parsed.pincode || '';
              if (loc) {
                setLocation(loc);
                setArea(dist);
                setPincode(pin);
                setUserLocation({
                  label: loc,
                  district: dist,
                  pincode: pin,
                  city: parsed.city || dist,
                  state: parsed.state || '',
                  latitude: parsed.latitude,
                  longitude: parsed.longitude,
                });
                return;
              }
            }
          } catch {
            // Legacy string format fallback
            const parts = saved.split(' - ');
            if (parts.length === 2) {
              const dist = parts[0].trim();
              const pin = parts[1].trim();
              setLocation(saved);
              setArea(dist);
              setPincode(pin);
              setUserLocation({
                label: saved,
                district: dist,
                pincode: pin,
                city: dist,
                state: '',
              });
            }
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const saveLocation = useCallback(
    async (
      locStr: string,
      detectedDistrict?: string,
      detectedPincode?: string,
      extra?: { city?: string; state?: string; latitude?: number; longitude?: number }
    ) => {
      setLocation(locStr);
      setLocationError(false);
      const dist = detectedDistrict || '';
      const pin = detectedPincode || '';
      if (dist) setArea(dist);
      if (pin) setPincode(pin);

      const structured: UserLocation = {
        label: locStr,
        district: dist,
        pincode: pin,
        city: extra?.city || dist,
        state: extra?.state || '',
        latitude: extra?.latitude,
        longitude: extra?.longitude,
      };
      setUserLocation(structured);

      try {
        await AsyncStorage.setItem(
          LOCATION_STORAGE_KEY,
          JSON.stringify({
            location: locStr,
            district: dist,
            pincode: pin,
            city: structured.city,
            state: structured.state,
            latitude: structured.latitude,
            longitude: structured.longitude,
          })
        );
      } catch {}
    },
    []
  );

  const detectLocation = useCallback(async (): Promise<string | null> => {
    setIsDetecting(true);
    setLocationError(false);

    try {
      let latitude: number;
      let longitude: number;

      // ----------------------------------------------
      // Web
      // ----------------------------------------------
      if (
        Platform.OS === 'web' &&
        typeof window !== 'undefined' &&
        navigator.geolocation
      ) {
        const coords = await new Promise<{
          latitude: number;
          longitude: number;
        }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            },
            reject,
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 30000,
            }
          );
        });

        latitude = coords.latitude;
        longitude = coords.longitude;
      }
      // ----------------------------------------------
      // Native
      // ----------------------------------------------
      else {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setLocationError(true);
          return null;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }

      // ----------------------------------------------
      // Reverse geocode
      // ----------------------------------------------
      const result = await reverseGeocodeCoords({
        latitude,
        longitude,
      });

      if (!result) {
        console.warn('[LocationContext] Could not determine district/pincode');
        setLocationError(true);
        return null;
      }

      const detectedDistrict = result.district.trim();
      const detectedPincode = result.pincode.trim();

      if (!detectedDistrict || !detectedPincode) {
        console.warn('[LocationContext] Missing district or pincode', result);
        setLocationError(true);
        return null;
      }

      const formattedLocation = `${detectedDistrict} - ${detectedPincode}`;

      await saveLocation(formattedLocation, detectedDistrict, detectedPincode, {
        city: result.city,
        state: result.state,
        latitude: result.latitude,
        longitude: result.longitude,
      });

      return formattedLocation;
    } catch (error) {
      console.warn('[LocationContext] Location detection failed:', error);
      setLocationError(true);
      return null;
    } finally {
      setIsDetecting(false);
    }
  }, [saveLocation]);

  const setLocationManually = useCallback(
    (newLoc: string, structured?: Partial<UserLocation>) => {
      const parts = newLoc.split(' - ');
      const a = structured?.district || parts[0]?.trim() || newLoc;
      const p = structured?.pincode || parts[1]?.trim() || '';
      saveLocation(newLoc, a, p, {
        city: structured?.city || a,
        state: structured?.state || '',
        latitude: structured?.latitude,
        longitude: structured?.longitude,
      });
    },
    [saveLocation]
  );

  return (
    <LocationContext.Provider
      value={{
        location,
        area,
        pincode,
        userLocation,
        isDetecting,
        locationError,
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
