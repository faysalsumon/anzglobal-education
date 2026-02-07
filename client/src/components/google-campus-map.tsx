import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Loader2, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Campus } from "@shared/schema";

interface GoogleCampusMapProps {
  campuses: Campus[];
  institutionName: string;
  selectedCampusIndex?: number | null;
  onMarkerClick?: (index: number) => void;
  height?: string;
  logoUrl?: string;
}

export function GoogleCampusMap({ 
  campuses, 
  institutionName,
  selectedCampusIndex = null,
  onMarkerClick,
  height = "400px",
  logoUrl
}: GoogleCampusMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError("Google Maps API key not configured");
      setIsLoading(false);
      return;
    }

    if (!mapRef.current) return;

    // Configure Google Maps API
    setOptions({
      key: apiKey,
    });

    // Create styled marker element with logo
    const createMarkerElement = (isSelected: boolean = false) => {
      const container = document.createElement("div");
      container.className = "campus-marker";
      container.style.cssText = `
        width: ${isSelected ? "48px" : "40px"};
        height: ${isSelected ? "48px" : "40px"};
        border-radius: 50%;
        overflow: hidden;
        border: ${isSelected ? "3px solid #1E2A5E" : "2px solid #2DBDB6"};
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        background: white;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      if (logoUrl) {
        const img = document.createElement("img");
        img.src = logoUrl;
        img.alt = institutionName;
        img.style.cssText = `
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 3px;
          background: white;
        `;
        img.onerror = () => {
          container.innerHTML = `
            <div style="
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 12px;
              color: #2DBDB6;
              background: white;
            ">${institutionName.charAt(0).toUpperCase()}</div>
          `;
        };
        container.appendChild(img);
      } else {
        container.innerHTML = `
          <div style="
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            color: #2DBDB6;
            background: white;
          ">${institutionName.charAt(0).toUpperCase()}</div>
        `;
      }

      return container;
    };

    const initMap = async () => {
      try {
        // Load Google Maps libraries
        await importLibrary("maps");
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
        
        const geocoder = new google.maps.Geocoder();

        // Default center (will be adjusted based on campus locations)
        const defaultCenter = { lat: -25.2744, lng: 133.7751 }; // Australia center

        const mapInstance = new google.maps.Map(mapRef.current!, {
          center: defaultCenter,
          zoom: 5,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          mapId: "campus-map",
        });

        setMap(mapInstance);

        // Geocode each campus address and add markers
        const bounds = new google.maps.LatLngBounds();
        let markersAdded = 0;
        const markers: google.maps.marker.AdvancedMarkerElement[] = [];

        for (let i = 0; i < campuses.length; i++) {
          const campus = campuses[i];
          const addressString = [
            campus.street,
            campus.city,
            campus.state,
            campus.postcode,
            campus.country,
          ]
            .filter(Boolean)
            .join(", ");

          if (!addressString) continue;

          try {
            let position: google.maps.LatLng;

            // Prefer stored lat/lng coordinates if available to avoid geocoding
            if (campus.latitude && campus.longitude) {
              position = new google.maps.LatLng(
                parseFloat(campus.latitude),
                parseFloat(campus.longitude)
              );
              bounds.extend(position);
            } else {
              // Fallback to geocoding if coordinates not stored
              const result = await geocoder.geocode({ address: addressString });
              
              if (result.results[0]) {
                position = result.results[0].geometry.location;
                bounds.extend(position);
              } else {
                continue;
              }
            }

            // Create advanced marker with custom element
            const markerContent = createMarkerElement(selectedCampusIndex === i);
            
            const marker = new AdvancedMarkerElement({
              map: mapInstance,
              position: position,
              title: `${institutionName} - ${campus.name}`,
              content: markerContent,
            });

            // Store marker with its index
            markers[i] = marker;

            // Create info window
            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div style="padding: 12px; min-width: 200px;">
                  <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #333;">
                    ${institutionName}
                  </h3>
                  <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 500; color: #666;">${campus.name}</p>
                  <p style="margin: 0; font-size: 13px; color: #666; line-height: 1.5;">
                    ${addressString}
                  </p>
                </div>
              `,
            });

            // Add click listener
            const campusIndex = i;
            marker.addListener("click", () => {
              infoWindow.open(mapInstance, marker);
              if (onMarkerClick) {
                // Toggle selection - click again to deselect
                onMarkerClick(campusIndex);
              }
            });

            markersAdded++;
          } catch (geocodeError) {
            console.error(`Failed to geocode address ${i + 1}:`, geocodeError);
          }
        }

        // Store markers in ref for later access
        markersRef.current = markers;

        // Fit map to show all markers
        if (markersAdded > 0) {
          if (markersAdded === 1) {
            mapInstance.setCenter(bounds.getCenter());
            mapInstance.setZoom(15);
          } else {
            mapInstance.fitBounds(bounds);
            // Add some padding
            const padding = { top: 50, right: 50, bottom: 50, left: 50 };
            mapInstance.fitBounds(bounds, padding);
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error initializing map:", err);
        setError("Failed to load map");
        setIsLoading(false);
      }
    };

    initMap();
  }, [campuses, institutionName]);

  // Update marker appearance when selectedCampusIndex changes
  useEffect(() => {
    if (!markersRef.current.length || !map) return;

    // Helper to create marker element for updates
    const createUpdatedMarkerElement = (isSelected: boolean = false) => {
      const container = document.createElement("div");
      container.className = "campus-marker";
      container.style.cssText = `
        width: ${isSelected ? "48px" : "40px"};
        height: ${isSelected ? "48px" : "40px"};
        border-radius: 50%;
        overflow: hidden;
        border: ${isSelected ? "3px solid #1E2A5E" : "2px solid #2DBDB6"};
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        background: white;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      if (logoUrl) {
        const img = document.createElement("img");
        img.src = logoUrl;
        img.alt = institutionName;
        img.style.cssText = `
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 3px;
          background: white;
        `;
        container.appendChild(img);
      } else {
        container.innerHTML = `
          <div style="
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            color: #2DBDB6;
            background: white;
          ">${institutionName.charAt(0).toUpperCase()}</div>
        `;
      }

      return container;
    };

    markersRef.current.forEach((marker, index) => {
      if (!marker) return;

      const isSelected = selectedCampusIndex === index;
      
      // Update marker content for selection state
      marker.content = createUpdatedMarkerElement(isSelected);

      // Pan to selected marker
      if (isSelected && marker.position) {
        map.panTo(marker.position as google.maps.LatLng);
        // Zoom in slightly if needed
        if (map.getZoom() && map.getZoom()! < 14) {
          map.setZoom(14);
        }
      }
    });
  }, [selectedCampusIndex, map, logoUrl, institutionName]);

  if (!campuses || campuses.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Campus Location{campuses.length > 1 ? 's' : ''}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {campuses.length === 1
            ? 'Find us on the map'
            : `Explore our ${campuses.length} campus locations`}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center bg-muted rounded-md" style={{ height }}>
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center bg-muted rounded-md" style={{ height }}>
            <div className="text-center">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}
        <div
          ref={mapRef}
          className={`w-full rounded-md ${isLoading || error ? 'hidden' : ''}`}
          style={{ height }}
          data-testid="google-map"
        />
      </CardContent>
    </Card>
  );
}
