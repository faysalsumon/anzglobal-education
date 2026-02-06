import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Loader2, MapPin, X, Navigation } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CampusLocationMapDialogProps {
  location: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CampusLocationMapDialog({ 
  location, 
  isOpen, 
  onClose 
}: CampusLocationMapDialogProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      try {
        if (markerRef.current) {
          if (typeof google !== 'undefined' && google.maps?.event) {
            google.maps.event.clearInstanceListeners(markerRef.current);
          }
          markerRef.current.setMap(null);
          markerRef.current = null;
        }
        if (mapInstanceRef.current) {
          if (typeof google !== 'undefined' && google.maps?.event) {
            google.maps.event.clearInstanceListeners(mapInstanceRef.current);
          }
          mapInstanceRef.current = null;
        }
      } catch (e) {
        console.warn("Error during map cleanup:", e);
      }
    };

    if (!isOpen) {
      cleanup();
      setIsLoading(true);
      setError(null);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError("Google Maps API key not configured");
      setIsLoading(false);
      return;
    }

    setOptions({
      key: apiKey,
    });

    const initMap = async () => {
      if (!isMounted || !isOpen) return;
      
      if (!mapRef.current) {
        console.warn("Map container not found, retrying...");
        timer = setTimeout(initMap, 100);
        return;
      }
      
      cleanup();
      
      try {
        await importLibrary("maps");
        
        if (!isMounted || !isOpen || !mapRef.current) return;
        
        const geocoder = new google.maps.Geocoder();
        const defaultCenter = { lat: -33.8688, lng: 151.2093 };

        const mapInstance = new google.maps.Map(mapRef.current!, {
          center: defaultCenter,
          zoom: 15,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        });

        mapInstanceRef.current = mapInstance;

        const result = await geocoder.geocode({ address: location });
        
        if (!isMounted || !isOpen) return;
        
        if (result.results[0]) {
          const position = result.results[0].geometry.location;
          
          mapInstance.setCenter(position);
          mapInstance.setZoom(16);

          const marker = new google.maps.Marker({
            map: mapInstance,
            position: position,
            title: location,
            animation: google.maps.Animation.DROP,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: "#3455A5",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            },
          });

          markerRef.current = marker;

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 12px; min-width: 200px; max-width: 280px;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #333;">
                  Campus Location
                </h3>
                <p style="margin: 0 0 12px 0; font-size: 13px; color: #666; line-height: 1.5;">
                  ${location}
                </p>
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #3455A5; text-decoration: none; font-weight: 500;"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  Get Directions
                </a>
              </div>
            `,
          });

          marker.addListener("click", () => {
            infoWindow.open(mapInstance, marker);
          });

          infoWindow.open(mapInstance, marker);
        } else {
          setError("Could not find location on map");
        }

        setIsLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error("Error initializing map:", err);
        setError("Failed to load map");
        setIsLoading(false);
      }
    };

    timer = setTimeout(initMap, 100);
    
    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      cleanup();
    };
  }, [isOpen, location]);

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden" data-testid="dialog-campus-map">
        <DialogHeader className="p-4 pb-2 bg-gradient-to-r from-primary/10 to-transparent border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold truncate" data-testid="text-map-title">
                  {location}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">Campus Location</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGetDirections}
              className="flex-shrink-0 gap-1.5"
              data-testid="button-get-directions"
            >
              <Navigation className="h-3.5 w-3.5" />
              Directions
            </Button>
          </div>
        </DialogHeader>
        
        <div className="relative">
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
                  onClick={handleGetDirections}
                >
                  Open in Google Maps
                </Button>
              </div>
            </div>
          )}
          <div
            ref={mapRef}
            className="w-full h-[400px]"
            data-testid="map-container"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
