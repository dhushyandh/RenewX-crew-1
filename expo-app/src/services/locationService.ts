export interface GeocodeAddress {
  city: string;
  pincode: string;
  address: string;
  district?: string;
  state?: string;
}

/**
 * Safely resolves coordinates (latitude, longitude) to a postal address.
 * Uses client-side reverse geocoding to avoid Expo SDK 49's removed geocoding proxy warning:
 * "The Geocoding API has been removed in SDK 49, use Place Autocomplete service instead".
 */
export async function reverseGeocodeCoords(coords: {
  latitude: number;
  longitude: number;
}): Promise<GeocodeAddress | null> {
  const { latitude, longitude } = coords;

  // 1. Try BigDataCloud free client reverse geocode (fast, high accuracy, no key required)
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || '';
      const pincode = data.postcode ? data.postcode.replace(/\D/g, '').slice(0, 6) : '';

      const adminLevels = Array.isArray(data.localityInfo?.administrative)
        ? data.localityInfo.administrative
        : [];
      const district = adminLevels.find((a: any) => a.order >= 5 && a.order <= 8)?.name || city;
      const street = [district, city].filter(Boolean).join(', ');

      if (city || pincode || street) {
        return {
          city,
          pincode,
          address: street || city,
          district,
          state: data.principalSubdivision || '',
        };
      }
    }
  } catch (apiErr) {
    console.warn('[LocationService] BigDataCloud reverse geocode error:', apiErr);
  }

  // 2. Fallback to OpenStreetMap Nominatim
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
    const res = await fetch(osmUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'RenewX-App/1.0',
      },
    });
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || '';
      const pincode = addr.postcode ? addr.postcode.replace(/\D/g, '').slice(0, 6) : '';
      const street =
        [addr.road, addr.suburb || addr.neighbourhood, city].filter(Boolean).join(', ') ||
        data.display_name ||
        '';

      return {
        city,
        pincode,
        address: street,
        district: addr.state_district || addr.county || city,
        state: addr.state || '',
      };
    }
  } catch (osmErr) {
    console.warn('[LocationService] Nominatim reverse geocode error:', osmErr);
  }

  return null;
}
