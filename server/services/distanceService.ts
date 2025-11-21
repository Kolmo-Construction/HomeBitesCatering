import fetch from 'node-fetch';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface DistanceResult {
  distanceMiles: number;
  durationMinutes: number;
  isWithinServiceArea: boolean;
}

const SERVICE_AREA_RADIUS_MILES = 100; // Configurable service area radius

/**
 * Geocode an address to get coordinates using OpenRouteService
 */
async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTESERVICE_API_KEY not configured');
      return null;
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodedAddress}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error('Geocoding failed:', response.status, response.statusText);
      return null;
    }

    const data = await response.json() as any;
    
    if (data.features && data.features.length > 0) {
      const [longitude, latitude] = data.features[0].geometry.coordinates;
      return { latitude, longitude };
    }

    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

/**
 * Calculate driving distance and duration between two locations
 */
async function calculateDistance(
  fromCoords: Coordinates,
  toCoords: Coordinates
): Promise<{ distanceMeters: number; durationSeconds: number } | null> {
  try {
    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTESERVICE_API_KEY not configured');
      return null;
    }

    const url = 'https://api.openrouteservice.org/v2/matrix/driving-car';
    
    const body = {
      locations: [
        [fromCoords.longitude, fromCoords.latitude],
        [toCoords.longitude, toCoords.latitude]
      ],
      metrics: ['distance', 'duration']
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error('Distance calculation failed:', response.status, response.statusText);
      return null;
    }

    const data = await response.json() as any;
    
    if (data.distances && data.durations) {
      return {
        distanceMeters: data.distances[0][1],
        durationSeconds: data.durations[0][1]
      };
    }

    return null;
  } catch (error) {
    console.error('Error calculating distance:', error);
    return null;
  }
}

/**
 * Calculate distance from business location to event venue
 */
export async function calculateDistanceToVenue(venueAddress: string): Promise<DistanceResult | null> {
  try {
    const businessAddress = process.env.BUSINESS_ADDRESS;
    if (!businessAddress) {
      console.error('BUSINESS_ADDRESS not configured');
      return null;
    }

    // Geocode both addresses
    const [businessCoords, venueCoords] = await Promise.all([
      geocodeAddress(businessAddress),
      geocodeAddress(venueAddress)
    ]);

    if (!businessCoords || !venueCoords) {
      console.log('Failed to geocode addresses');
      return null;
    }

    // Calculate distance
    const result = await calculateDistance(businessCoords, venueCoords);
    
    if (!result) {
      return null;
    }

    // Convert to miles and minutes
    const distanceMiles = result.distanceMeters / 1609.34;
    const durationMinutes = result.durationSeconds / 60;
    const isWithinServiceArea = distanceMiles <= SERVICE_AREA_RADIUS_MILES;

    return {
      distanceMiles: Math.round(distanceMiles * 10) / 10, // Round to 1 decimal
      durationMinutes: Math.round(durationMinutes),
      isWithinServiceArea
    };
  } catch (error) {
    console.error('Error in calculateDistanceToVenue:', error);
    return null;
  }
}
