import { useEffect, useRef, useState, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
}

declare global {
  interface Window {
    google?: typeof google;
  }
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  placeholder = "Enter location",
  className = "",
  testId = "input-location-autocomplete"
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    
    if (place?.formatted_address) {
      onChange(place.formatted_address);
    } else if (place?.address_components) {
      const city = place.address_components.find((c) => c.types.includes("locality"))?.long_name;
      const country = place.address_components.find((c) => c.types.includes("country"))?.long_name;
      
      if (city && country) {
        onChange(`${city}, ${country}`);
      }
    }
  }, [onChange]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError("Google Maps API key not configured");
      return;
    }

    setIsLoading(true);

    setOptions({
      key: apiKey,
      v: "weekly",
      libraries: ["places"]
    });

    importLibrary("places")
      .then(() => {
        if (!inputRef.current || !window.google) return;

        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ["(cities)"],
          fields: ["formatted_address", "address_components", "geometry"]
        });

        autocompleteRef.current.addListener("place_changed", handlePlaceChanged);

        setIsLoading(false);
        setError(null);
      })
      .catch((err: Error) => {
        console.error("Error loading Google Maps API:", err);
        setError("Failed to load location autocomplete");
        setIsLoading(false);
      });

    return () => {
      if (autocompleteRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [handlePlaceChanged]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <MapPin className="h-4 w-4" />
      </div>
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`pl-9 ${className}`}
        data-testid={testId}
        disabled={isLoading}
      />
      {error && (
        <p className="text-xs text-muted-foreground mt-1">
          {error} - Manual input available
        </p>
      )}
    </div>
  );
}
