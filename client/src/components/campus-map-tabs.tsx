import { useEffect, useRef, useState, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Loader2, MapPin, Navigation, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CampusMapTabsProps {
  campusLocations: string[];
  institutionName?: string;
  institutionLogo?: string;
}

export function CampusMapTabs({ 
  campusLocations, 
  institutionName = "Campus",
  institutionLogo
}: CampusMapTabsProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  // Extract campus name from location string (first part before comma)
  const extractCampusName = (location: string): string => {
    const parts = location.split(',').map(p => p.trim());
    return parts[0] || "Campus";
  };

  // Extract address from location string (everything after the campus name)
  const extractAddress = (location: string): string => {
    const parts = location.split(',').map(p => p.trim());
    if (parts.length > 1) {
      return parts.slice(1).join(', ');
    }
    return location;
  };

  // Create info window content using DOM nodes (safer than HTML strings)
  const createInfoWindowContent = useCallback((name: string, address: string): HTMLElement => {
    const container = document.createElement("div");
    container.style.cssText = "padding: 12px; min-width: 200px; max-width: 280px;";
    
    const title = document.createElement("h3");
    title.style.cssText = "margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #333;";
    title.textContent = name;
    
    const addressEl = document.createElement("p");
    addressEl.style.cssText = "margin: 0 0 12px 0; font-size: 13px; color: #666; line-height: 1.5;";
    addressEl.textContent = address;
    
    const link = document.createElement("a");
    link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.cssText = "display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #3465A5; text-decoration: none; font-weight: 500;";
    link.textContent = "Get Directions";
    
    container.appendChild(title);
    container.appendChild(addressEl);
    container.appendChild(link);
    
    return container;
  }, []);

  // Cleanup function for map resources
  const cleanupMap = useCallback(() => {
    try {
      // Clear all markers
      markersRef.current.forEach(marker => {
        if (marker) {
          google.maps.event.clearInstanceListeners(marker);
          marker.setMap(null);
        }
      });
      markersRef.current = [];
      
      // Close all info windows
      infoWindowsRef.current.forEach(infoWindow => {
        if (infoWindow) {
          infoWindow.close();
        }
      });
      infoWindowsRef.current = [];
      
      // Clear map instance listeners
      if (mapInstanceRef.current) {
        google.maps.event.clearInstanceListeners(mapInstanceRef.current);
        mapInstanceRef.current = null;
      }
    } catch (e) {
      console.warn("Error during map cleanup:", e);
    }
  }, []);

  useEffect(() => {
    if (!campusLocations || campusLocations.length === 0) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError("Google Maps API key not configured");
      setIsLoading(false);
      return;
    }

    if (!mapRef.current) return;

    setOptions({
      key: apiKey,
    });

    let isMounted = true;

    const initMap = async () => {
      try {
        // Cleanup previous instance
        cleanupMap();
        
        await importLibrary("maps");
        
        if (!mapRef.current || !isMounted) return;
        
        const geocoder = new google.maps.Geocoder();
        const defaultCenter = { lat: -25.2744, lng: 133.7751 }; // Australia center

        const mapInstance = new google.maps.Map(mapRef.current!, {
          center: defaultCenter,
          zoom: 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        });

        mapInstanceRef.current = mapInstance;
        setMap(mapInstance);

        // Geocode all locations and create markers
        const markers: google.maps.Marker[] = [];
        const infoWindows: google.maps.InfoWindow[] = [];
        const bounds = new google.maps.LatLngBounds();

        for (let i = 0; i < campusLocations.length; i++) {
          if (!isMounted) return;
          
          const address = campusLocations[i];
          
          try {
            const result = await geocoder.geocode({ address });
            
            if (result.results[0]) {
              const position = result.results[0].geometry.location;
              bounds.extend(position);

              // Create marker
              const marker = new google.maps.Marker({
                map: mapInstance,
                position,
                title: address,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: i === selectedIndex ? 14 : 10,
                  fillColor: i === selectedIndex ? "#3465A5" : "#FF5000",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 3,
                },
                animation: google.maps.Animation.DROP,
              });

              // Create info window with DOM nodes (safer)
              const infoWindow = new google.maps.InfoWindow({
                content: createInfoWindowContent(institutionName, address),
              });

              const campusIndex = i;
              marker.addListener("click", () => {
                // Close other info windows
                infoWindows.forEach(iw => iw.close());
                infoWindow.open(mapInstance, marker);
                setSelectedIndex(campusIndex);
              });

              markers.push(marker);
              infoWindows.push(infoWindow);
            }
          } catch (geocodeError) {
            console.error(`Failed to geocode address ${i + 1}:`, geocodeError);
          }
        }

        if (!isMounted) return;

        markersRef.current = markers;
        infoWindowsRef.current = infoWindows;

        // Fit map to show all markers
        if (markers.length > 0) {
          if (markers.length === 1) {
            mapInstance.setCenter(bounds.getCenter());
            mapInstance.setZoom(15);
          } else {
            mapInstance.fitBounds(bounds);
            const padding = { top: 50, right: 50, bottom: 50, left: 50 };
            mapInstance.fitBounds(bounds, padding);
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error initializing map:", err);
        if (isMounted) {
          setError("Failed to load map");
          setIsLoading(false);
        }
      }
    };

    initMap();
    
    return () => {
      isMounted = false;
      cleanupMap();
    };
  }, [campusLocations, institutionName, cleanupMap, createInfoWindowContent]);

  // Update markers when selection changes
  useEffect(() => {
    if (!markersRef.current.length || !map) return;

    markersRef.current.forEach((marker, index) => {
      if (!marker) return;

      const isSelected = selectedIndex === index;
      
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: isSelected ? 14 : 10,
        fillColor: isSelected ? "#3465A5" : "#FF5000",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      });

      if (isSelected && marker.getPosition()) {
        map.panTo(marker.getPosition()!);
        if (map.getZoom() && map.getZoom()! < 14) {
          map.setZoom(15);
        }
      }
    });
  }, [selectedIndex, map]);

  const handleGetDirections = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!campusLocations || campusLocations.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full">
      {/* Campus Tabs - Left Side */}
      <div className="lg:w-72 w-full flex-shrink-0 space-y-2">
        <p className="text-xs text-muted-foreground mb-3 px-1">
          Select a campus to view on map
        </p>
        <div className="space-y-2 max-h-[300px] lg:max-h-[350px] overflow-y-auto pr-1">
          {campusLocations.map((location, index) => {
            const isSelected = selectedIndex === index;
            const campusName = extractCampusName(location);
            const campusAddress = extractAddress(location);
            
            return (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all duration-200",
                  "hover-elevate active-elevate-2",
                  isSelected 
                    ? "border-primary bg-primary/10 shadow-sm" 
                    : "border-border bg-muted/30"
                )}
                data-testid={`tab-campus-${index}`}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg flex-shrink-0 transition-colors",
                    isSelected ? "bg-primary text-white" : "bg-muted"
                  )}>
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-semibold text-sm mb-0.5",
                      isSelected && "text-primary"
                    )}>
                      {campusName}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {campusAddress}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Get Directions Button */}
        {campusLocations[selectedIndex] && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 gap-2"
            onClick={() => handleGetDirections(campusLocations[selectedIndex])}
            data-testid="button-get-directions"
          >
            <Navigation className="h-4 w-4" />
            Get Directions
          </Button>
        )}
      </div>

      {/* Map Container - Right Side */}
      <div className="flex-1 relative rounded-lg overflow-hidden border bg-muted/30 min-h-[300px] lg:min-h-[350px]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => handleGetDirections(campusLocations[selectedIndex])}
                data-testid="button-open-google-maps"
              >
                Open in Google Maps
              </Button>
            </div>
          </div>
        )}
        <div
          ref={mapRef}
          className="w-full h-full min-h-[300px] lg:min-h-[350px]"
          data-testid="campus-map"
        />
      </div>
    </div>
  );
}
