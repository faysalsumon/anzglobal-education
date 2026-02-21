import { useEffect, useRef, useState, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Loader2, MapPin, Search, List, Map as MapIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Campus } from "@shared/schema";

export interface InstitutionCampus extends Campus {
  institutionId: string;
  institutionName: string;
  institutionLogo?: string | null;
  providerType?: string | null;
}

interface InstitutionMapSearchProps {
  campuses: InstitutionCampus[];
  onInstitutionClick?: (institutionId: string) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  isLoading?: boolean;
  className?: string;
  hideInternalToggle?: boolean;
}

export function InstitutionMapSearch({
  campuses,
  onInstitutionClick,
  onBoundsChange,
  isLoading: externalLoading = false,
  className,
  hideInternalToggle = false,
}: InstitutionMapSearchProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: google.maps.marker.AdvancedMarkerElement; campus: InstitutionCampus }>>(new Map());
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const selectedMarkerIdRef = useRef<string | null>(null);
  
  const [searchValue, setSearchValue] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [updateOnMove, setUpdateOnMove] = useState(true);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(({ marker }) => {
      marker.map = null;
    });
    markersRef.current.clear();
    selectedMarkerIdRef.current = null;
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  }, []);

  const createMarkerElement = useCallback((campus: InstitutionCampus, isSelected: boolean = false) => {
    const container = document.createElement("div");
    container.className = "institution-marker";
    container.style.cssText = `
      width: ${isSelected ? "52px" : "44px"};
      height: ${isSelected ? "52px" : "44px"};
      border-radius: 50%;
      overflow: hidden;
      border: ${isSelected ? "4px solid #3455A5" : "3px solid #FF5000"};
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    if (campus.institutionLogo) {
      const img = document.createElement("img");
      img.src = campus.institutionLogo;
      img.alt = campus.institutionName;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        padding: 4px;
        background: white;
      `;
      img.onerror = () => {
        const fallbackDiv = document.createElement('div');
        fallbackDiv.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;color:#FF5000;background:white;';
        fallbackDiv.textContent = campus.institutionName.charAt(0).toUpperCase();
        container.replaceChildren(fallbackDiv);
      };
      container.appendChild(img);
    } else {
      const fallbackDiv = document.createElement('div');
      fallbackDiv.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;color:#FF5000;background:white;';
      fallbackDiv.textContent = campus.institutionName.charAt(0).toUpperCase();
      container.appendChild(fallbackDiv);
    }

    return container;
  }, []);

  const addMarkers = useCallback(async (mapInstance: google.maps.Map, campusList: InstitutionCampus[]) => {
    clearMarkers();
    const bounds = new google.maps.LatLngBounds();
    let markersAdded = 0;

    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
    
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    // Track positions to offset overlapping markers
    const positionCounts: Record<string, number> = {};
    const getOffsetPosition = (lat: number, lng: number): { lat: number; lng: number } => {
      // Round to 2 decimal places to group nearby markers
      const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
      const count = positionCounts[key] || 0;
      positionCounts[key] = count + 1;
      
      if (count === 0) return { lat, lng };
      
      // Spiral offset pattern to spread overlapping markers
      const angle = (count * 45) * (Math.PI / 180);
      const offset = 0.015 * Math.ceil(count / 8); // Increase radius every 8 markers
      return {
        lat: lat + Math.sin(angle) * offset,
        lng: lng + Math.cos(angle) * offset,
      };
    };

    for (const campus of campusList) {
      if (!campus.latitude || !campus.longitude) continue;

      const lat = parseFloat(campus.latitude);
      const lng = parseFloat(campus.longitude);
      
      if (isNaN(lat) || isNaN(lng)) continue;

      // Apply offset to prevent overlapping markers
      const adjustedPos = getOffsetPosition(lat, lng);
      const position = new google.maps.LatLng(adjustedPos.lat, adjustedPos.lng);
      bounds.extend(new google.maps.LatLng(lat, lng)); // Use original position for bounds

      const markerContent = createMarkerElement(campus, false);
      
      const marker = new AdvancedMarkerElement({
        map: mapInstance,
        position,
        title: campus.institutionName,
        content: markerContent,
      });

      const markerId = `${campus.institutionId}-${campus.latitude}-${campus.longitude}`;
      
      marker.addListener("click", () => {
        if (selectedMarkerIdRef.current && selectedMarkerIdRef.current !== markerId) {
          const prevData = markersRef.current.get(selectedMarkerIdRef.current);
          if (prevData) {
            const prevContent = prevData.marker.content as HTMLElement;
            if (prevContent) {
              prevContent.style.width = "44px";
              prevContent.style.height = "44px";
              prevContent.style.border = "3px solid #FF5000";
            }
          }
        }

        selectedMarkerIdRef.current = markerId;
        const currentContent = marker.content as HTMLElement;
        if (currentContent) {
          currentContent.style.width = "52px";
          currentContent.style.height = "52px";
          currentContent.style.border = "4px solid #3455A5";
        }

        const viewDetailsId = `view-details-${markerId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;
        const infoContent = `
          <div style="padding: 12px; min-width: 220px; max-width: 300px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              ${campus.institutionLogo ? `
                <img src="${campus.institutionLogo}" alt="${campus.institutionName}" 
                  style="width: 40px; height: 40px; border-radius: 6px; object-fit: contain; border: 1px solid #eee; background: white;" />
              ` : `
                <div style="width: 40px; height: 40px; border-radius: 6px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #FF5000;">
                  ${campus.institutionName.charAt(0).toUpperCase()}
                </div>
              `}
              <div>
                <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #333;">
                  ${campus.institutionName}
                </h3>
                ${campus.name ? `<p style="margin: 0; font-size: 12px; color: #666;">${campus.name}</p>` : ''}
              </div>
            </div>
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #888; line-height: 1.4;">
              ${[campus.address || campus.street, campus.city, campus.state, campus.postcode].filter(Boolean).join(", ")}
            </p>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
              ${campus.providerType ? `<span style="display: inline-block; padding: 2px 8px; background: #f0f0f0; border-radius: 4px; font-size: 11px; color: #666;">${campus.providerType}</span>` : '<span></span>'}
              <button id="${viewDetailsId}" data-testid="button-view-institution-details" style="
                padding: 6px 12px;
                background: #3455A5;
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
              ">View Details</button>
            </div>
          </div>
        `;

        infoWindowRef.current!.setContent(infoContent);
        infoWindowRef.current!.open(mapInstance, marker);
        
        google.maps.event.addListenerOnce(infoWindowRef.current!, 'domready', () => {
          const viewDetailsBtn = document.getElementById(viewDetailsId);
          if (viewDetailsBtn && onInstitutionClick) {
            viewDetailsBtn.onclick = (e) => {
              e.stopPropagation();
              onInstitutionClick(campus.institutionId);
            };
          }
        });
      });

      markersRef.current.set(markerId, { marker, campus });
      markersAdded++;
    }

    if (markersAdded > 1 && !selectedLocation) {
      mapInstance.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } else if (markersAdded === 1) {
      mapInstance.setCenter(bounds.getCenter());
      mapInstance.setZoom(14);
    }
  }, [clearMarkers, createMarkerElement, onInstitutionClick, selectedLocation]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError("Google Maps API key not configured");
      setIsMapLoading(false);
      return;
    }

    if (!mapRef.current) return;

    setOptions({
      key: apiKey,
      v: "weekly",
      libraries: ["places", "marker"]
    });

    const initMap = async () => {
      try {
        await importLibrary("maps");
        await importLibrary("places");
        await importLibrary("marker");

        const defaultCenter = { lat: -25.2744, lng: 133.7751 };

        const mapInstance = new google.maps.Map(mapRef.current!, {
          center: defaultCenter,
          zoom: 4,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControlOptions: {
            position: google.maps.ControlPosition.TOP_RIGHT,
          },
          mapId: "institution-map",
        });

        setMap(mapInstance);

        if (inputRef.current) {
          autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
            types: ["geocode"],
            componentRestrictions: { country: ["au", "nz", "gb", "us", "ca", "in", "sg", "my"] },
            fields: ["formatted_address", "geometry", "address_components"]
          });

          autocompleteRef.current.addListener("place_changed", () => {
            const place = autocompleteRef.current?.getPlace();
            
            if (place?.geometry?.location) {
              mapInstance.setCenter(place.geometry.location);
              mapInstance.setZoom(12);
              setSelectedLocation(place.formatted_address || "");
              setSearchValue(place.formatted_address || "");
            }
          });
        }

        mapInstance.addListener("idle", () => {
          if (updateOnMove && onBoundsChange) {
            const bounds = mapInstance.getBounds();
            if (bounds) {
              const ne = bounds.getNorthEast();
              const sw = bounds.getSouthWest();
              onBoundsChange({
                north: ne.lat(),
                south: sw.lat(),
                east: ne.lng(),
                west: sw.lng(),
              });
            }
          }
        });

        setIsMapLoading(false);
      } catch (err) {
        console.error("Error initializing map:", err);
        setError("Failed to load map");
        setIsMapLoading(false);
      }
    };

    initMap();

    return () => {
      if (autocompleteRef.current && window.google) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [updateOnMove, onBoundsChange]);

  useEffect(() => {
    if (map && campuses.length > 0) {
      addMarkers(map, campuses);
    }
  }, [map, campuses, addMarkers]);

  const handleClearSearch = () => {
    setSearchValue("");
    setSelectedLocation(null);
    if (map) {
      map.setCenter({ lat: -25.2744, lng: 133.7751 });
      map.setZoom(4);
    }
  };

  const isLoading = isMapLoading || externalLoading;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex flex-col sm:flex-row gap-2 p-3 bg-background border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search region, suburb or postcode"
            className="pl-9 pr-8"
            data-testid="input-map-search"
          />
          {selectedLocation && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={handleClearSearch}
              data-testid="button-clear-search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-muted/30">
            <Checkbox
              id="update-on-move"
              checked={updateOnMove}
              onCheckedChange={(checked) => setUpdateOnMove(checked === true)}
              data-testid="checkbox-update-on-move"
            />
            <label htmlFor="update-on-move" className="text-sm whitespace-nowrap cursor-pointer">
              Update map as it moves
            </label>
          </div>

          {!hideInternalToggle && (
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "map" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode("map")}
                data-testid="button-map-internal-view-map"
              >
                <MapIcon className="h-4 w-4 mr-1" />
                Map
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode("list")}
                data-testid="button-map-internal-view-list"
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
            </div>
          )}
        </div>
      </div>

      {selectedLocation && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
          <Badge variant="secondary" className="gap-1">
            <MapPin className="h-3 w-3" />
            {selectedLocation}
            <button onClick={handleClearSearch} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      <div className="relative flex-1 min-h-[400px]">
        {viewMode === "map" ? (
          <>
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
                </div>
              </div>
            )}
            <div
              ref={mapRef}
              className="w-full h-full"
              data-testid="institution-map"
            />
            {!isLoading && !error && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md text-sm text-muted-foreground">
                Pan/Zoom the map to find more institutions
              </div>
            )}
          </>
        ) : (
          <div className="p-4 space-y-3 overflow-auto h-full">
            {campuses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No campuses found in this area</p>
                <p className="text-sm">Try zooming out or searching a different location</p>
              </div>
            ) : (
              campuses.map((campus, index) => (
                <Card
                  key={`${campus.institutionId}-${index}`}
                  className="cursor-pointer hover-elevate"
                  onClick={() => onInstitutionClick?.(campus.institutionId)}
                  data-testid={`card-campus-${campus.institutionId}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {campus.institutionLogo ? (
                        <img
                          src={campus.institutionLogo}
                          alt={campus.institutionName}
                          className="w-12 h-12 rounded object-contain bg-white border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                          <MapPin className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{campus.institutionName}</h3>
                        {campus.name && (
                          <p className="text-sm text-muted-foreground">{campus.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {[campus.city, campus.state, campus.country].filter(Boolean).join(", ")}
                        </p>
                        {campus.providerType && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {campus.providerType}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
