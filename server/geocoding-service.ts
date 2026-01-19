import type { Campus } from "@shared/schema";

interface GeocodingResult {
  latitude: string;
  longitude: string;
  formattedAddress?: string;
}

interface GoogleGeocodingResponse {
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    formatted_address: string;
  }>;
  status: string;
  error_message?: string;
}

export class GeocodingService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
  }

  private isConfigured(): boolean {
    return !!this.apiKey;
  }

  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    if (!this.isConfigured()) {
      console.warn("Google Maps API key not configured - skipping geocoding");
      return null;
    }

    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${this.apiKey}`;

      const response = await fetch(url);
      const data: GoogleGeocodingResponse = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        const result = data.results[0];
        return {
          latitude: result.geometry.location.lat.toString(),
          longitude: result.geometry.location.lng.toString(),
          formattedAddress: result.formatted_address,
        };
      }

      if (data.status === "ZERO_RESULTS") {
        console.log(`No geocoding results for address: ${address}`);
        return null;
      }

      console.error(`Geocoding error: ${data.status} - ${data.error_message || "Unknown error"}`);
      return null;
    } catch (error) {
      console.error("Error geocoding address:", error);
      return null;
    }
  }

  buildFullAddress(campus: Campus): string {
    const parts = [
      campus.address || campus.street,
      campus.city,
      campus.state,
      campus.postcode,
      campus.country,
    ].filter(Boolean);

    return parts.join(", ");
  }

  async geocodeCampus(campus: Campus): Promise<Campus> {
    if (campus.latitude && campus.longitude) {
      return campus;
    }

    const fullAddress = this.buildFullAddress(campus);

    if (!fullAddress) {
      return campus;
    }

    const result = await this.geocodeAddress(fullAddress);

    if (result) {
      return {
        ...campus,
        latitude: result.latitude,
        longitude: result.longitude,
      };
    }

    return campus;
  }

  async geocodeCampuses(campuses: Campus[]): Promise<Campus[]> {
    if (!this.isConfigured()) {
      console.warn("Google Maps API key not configured - skipping campus geocoding");
      return campuses;
    }

    const geocodedCampuses: Campus[] = [];

    for (const campus of campuses) {
      const geocodedCampus = await this.geocodeCampus(campus);
      geocodedCampuses.push(geocodedCampus);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return geocodedCampuses;
  }
}

export const geocodingService = new GeocodingService();
