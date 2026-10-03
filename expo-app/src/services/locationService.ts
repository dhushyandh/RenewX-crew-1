import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface GeocodeAddress {
  city: string;
  district: string;
  pincode: string;
  address: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

function cleanPincode(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return '';
  }

  const digits = String(value).replace(/\D/g, '');

  return digits.length === 6 ? digits : '';
}

function findDistrict(data: any): string {
  const administrative =
    Array.isArray(data?.localityInfo?.administrative)
      ? data.localityInfo.administrative
      : [];

  /*
   * BigDataCloud can return different administrative
   * structures depending on the location.
   *
   * Prefer an administrative level that represents
   * the district, then fall back to city/locality.
   */

  const districtCandidate = administrative.find(
    (item: any) => {
      const name = item?.name;

      if (!name || typeof name !== 'string') {
        return false;
      }

      const level = Number(item?.adminLevel);

      return level === 6 || level === 7;
    }
  );

  if (districtCandidate?.name) {
    return districtCandidate.name.trim();
  }

  return (
    data?.city?.trim?.() ||
    data?.locality?.trim?.() ||
    data?.principalSubdivision?.trim?.() ||
    ''
  );
}

export async function reverseGeocodeCoords(
  coords: {
    latitude: number;
    longitude: number;
  }
): Promise<GeocodeAddress | null> {
  const { latitude, longitude } = coords;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  // --------------------------------------------------
  // 1. BigDataCloud
  // --------------------------------------------------

  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${encodeURIComponent(latitude)}` +
      `&longitude=${encodeURIComponent(longitude)}` +
      `&localityLanguage=en`;

    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();

      const city =
        typeof data?.city === 'string'
          ? data.city.trim()
          : typeof data?.locality === 'string'
            ? data.locality.trim()
            : '';

      const district = findDistrict(data);

      const pincode = cleanPincode(
        data?.postcode
      );

      const state =
        typeof data?.principalSubdivision === 'string'
          ? data.principalSubdivision.trim()
          : '';

      const country =
        typeof data?.countryName === 'string'
          ? data.countryName.trim()
          : '';

      const addressParts = [
        data?.locality,
        data?.city,
        district,
        state,
      ].filter(
        (value): value is string =>
          typeof value === 'string' && value.trim().length > 0
      );

      const address = [
        ...new Set(addressParts),
      ].join(', ');

      if (district && pincode) {
        return {
          city,
          district,
          pincode,
          address,
          state,
          country,
          latitude,
          longitude,
        };
      }
    }
  } catch (error) {
    console.warn(
      '[LocationService] BigDataCloud error:',
      error
    );
  }

  // --------------------------------------------------
  // 2. OpenStreetMap fallback
  // --------------------------------------------------

  try {
    const osmUrl =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=json` +
      `&lat=${encodeURIComponent(latitude)}` +
      `&lon=${encodeURIComponent(longitude)}` +
      `&addressdetails=1`;

    const response = await fetch(osmUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'RenewX-App/1.0',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const address = data?.address ?? {};

      const city =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        '';

      const district =
        address.state_district ||
        address.county ||
        city ||
        '';

      const pincode = cleanPincode(
        address.postcode
      );

      const state =
        address.state || '';

      const country =
        address.country || '';

      const readableAddress =
        [
          address.road,
          address.suburb,
          address.neighbourhood,
          city,
          district,
          state,
        ]
          .filter(Boolean)
          .filter(
            (value, index, array) =>
              array.indexOf(value) === index
          )
          .join(', ');

      if (district && pincode) {
        return {
          city,
          district,
          pincode,
          address:
            readableAddress ||
            data?.display_name ||
            '',
          state,
          country,
          latitude,
          longitude,
        };
      }
    }
  } catch (error) {
    console.warn(
      '[LocationService] OSM fallback error:',
      error
    );
  }

  // IMPORTANT:
  // Never return fake location data.
  return null;
}

/**
 * Detects current GPS coordinates on Web or Native,
 * and reverse geocodes them into a structured street/city/state/pincode address.
 */
export async function detectCurrentLocationAddress(): Promise<GeocodeAddress | null> {
  try {
    let latitude: number;
    let longitude: number;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && navigator?.geolocation) {
      const coords = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          reject,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
        );
      });
      latitude = coords.latitude;
      longitude = coords.longitude;
    } else {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
    }

    return await reverseGeocodeCoords({ latitude, longitude });
  } catch (error) {
    console.warn('[LocationService] detectCurrentLocationAddress error:', error);
    return null;
  }
}
