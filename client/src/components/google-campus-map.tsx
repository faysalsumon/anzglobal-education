import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Loader2, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CampusAddress {
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface GoogleCampusMapProps {
  campusAddresses: CampusAddress[];
  institutionName: string;
  selectedCampusIndex?: number | null;
  onMarkerClick?: (index: number) => void;
}

export function GoogleCampusMap({ 
  campusAddresses, 
  institutionName,
  selectedCampusIndex = null,
  onMarkerClick
}: GoogleCampusMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

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

    const initMap = async () => {
      try {
        // Load Google Maps library
        await importLibrary("maps");
        
        const geocoder = new google.maps.Geocoder();

        // Default center (will be adjusted based on campus locations)
        const defaultCenter = { lat: -25.2744, lng: 133.7751 }; // Australia center

        const mapInstance = new google.maps.Map(mapRef.current!, {
          center: defaultCenter,
          zoom: 5,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        });

        setMap(mapInstance);

        // Geocode each campus address and add markers
        const bounds = new google.maps.LatLngBounds();
        let markersAdded = 0;
        const markers: google.maps.Marker[] = [];

        for (let i = 0; i < campusAddresses.length; i++) {
          const campus = campusAddresses[i];
          const addressString = [
            campus.address,
            campus.city,
            campus.state,
            campus.postcode,
            campus.country,
          ]
            .filter(Boolean)
            .join(", ");

          if (!addressString) continue;

          try {
            const result = await geocoder.geocode({ address: addressString });
            
            if (result.results[0]) {
              const position = result.results[0].geometry.location;
              bounds.extend(position);

              // Create marker
              const marker = new google.maps.Marker({
                map: mapInstance,
                position: position,
                title: `${institutionName} - Campus ${i + 1}`,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#3465A5",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                },
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
                    ${campusAddresses.length > 1 ? `<p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 500; color: #666;">Campus ${i + 1}</p>` : ''}
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
            }
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
  }, [campusAddresses, institutionName]);

  // Update marker appearance when selectedCampusIndex changes
  useEffect(() => {
    if (!markersRef.current.length || !map) return;

    markersRef.current.forEach((marker, index) => {
      if (!marker) return;

      const isSelected = selectedCampusIndex === index;
      
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: isSelected ? 14 : 10,
        fillColor: isSelected ? "#FFB380" : "#3465A5",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: isSelected ? 3 : 2,
      });

      // Add bounce animation and pan to selected marker
      if (isSelected) {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        // Pan map to center on selected marker
        const position = marker.getPosition();
        if (position) {
          map.panTo(position);
          // Zoom in slightly if needed
          if (map.getZoom() && map.getZoom()! < 14) {
            map.setZoom(14);
          }
        }
        // Stop bouncing after 2 seconds
        setTimeout(() => {
          marker.setAnimation(null);
        }, 2000);
      } else {
        marker.setAnimation(null);
      }
    });
  }, [selectedCampusIndex, map]);

  if (!campusAddresses || campusAddresses.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Campus Location{campusAddresses.length > 1 ? 's' : ''}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {campusAddresses.length === 1
            ? 'Find us on the map'
            : `Explore our ${campusAddresses.length} campus locations`}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center h-[400px] bg-muted rounded-md">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-[400px] bg-muted rounded-md">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}
        <div
          ref={mapRef}
          className={`w-full h-[400px] rounded-md ${isLoading || error ? 'hidden' : ''}`}
          data-testid="google-map"
        />
      </CardContent>
    </Card>
  );
}
