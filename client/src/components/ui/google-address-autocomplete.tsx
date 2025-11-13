/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

/**
 * GoogleAddressAutocomplete Component
 * 
 * Provides full street address autocomplete using Google Maps Places API.
 * Returns structured address components for complete address data.
 * 
 * IMPORTANT: When used inside a Dialog or Modal:
 * - Requires .pac-container CSS with high z-index (see index.css)
 * - Dialog's onPointerDownOutside must prevent dismissal on .pac-container clicks
 * - Google renders .pac-container outside React tree at document.body level
 */

export interface AddressComponents {
  address: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

interface GoogleAddressAutocompleteProps {
  value: string;
  onAddressSelect: (components: AddressComponents) => void;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
}

export function GoogleAddressAutocomplete({
  value,
  onAddressSelect,
  onInputChange,
  placeholder = "Enter street address",
  className = "",
  testId = "input-address-autocomplete"
}: GoogleAddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(value);

  // Sync internal state with external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    
    if (!place?.address_components) {
      return;
    }

    // Extract address components
    const components: AddressComponents = {
      address: "",
      city: "",
      state: "",
      postcode: "",
      country: ""
    };

    // Street number
    const streetNumber = place.address_components.find((c: google.maps.GeocoderAddressComponent) => 
      c.types.includes("street_number")
    )?.long_name || "";

    // Route (street name)
    const route = place.address_components.find((c: google.maps.GeocoderAddressComponent) => 
      c.types.includes("route")
    )?.long_name || "";

    // Combine street number and route for full address
    components.address = [streetNumber, route].filter(Boolean).join(" ");

    // If no street number/route, try premise or subpremise
    if (!components.address) {
      const premise = place.address_components.find((c: google.maps.GeocoderAddressComponent) => 
        c.types.includes("premise")
      )?.long_name;
      const subpremise = place.address_components.find((c: google.maps.GeocoderAddressComponent) => 
        c.types.includes("subpremise")
      )?.long_name;
      components.address = premise || subpremise || place.formatted_address?.split(',')[0] || "";
    }

    // City (locality)
    components.city = place.address_components.find((c: google.maps.GeocoderAddressComponent) => 
      c.types.includes("locality")
    )?.long_name || "";

    // If no locality, try sublocality or postal_town
    if (!components.city) {
      components.city = place.address_components.find((c: google.maps.GeocoderAddressComponent) => 
        c.types.includes("sublocality") || c.types.includes("postal_town")
      )?.long_name || "";
    }

    // State (administrative_area_level_1)
    components.state = place.address_components.find((c: google.maps.GeocoderAddressComponent) => 
      c.types.includes("administrative_area_level_1")
    )?.short_name || "";

    // Postcode
    components.postcode = place.address_components.find((c: google.maps.GeocoderAddressComponent) => 
      c.types.includes("postal_code")
    )?.long_name || "";

    // Country
    components.country = place.address_components.find((c: google.maps.GeocoderAddressComponent) => 
      c.types.includes("country")
    )?.long_name || "";

    // Update input value to show formatted address
    setInputValue(place.formatted_address || "");

    // Call onAddressSelect with structured components
    onAddressSelect(components);
  }, [onAddressSelect]);

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
          types: ["address"],
          fields: ["formatted_address", "address_components", "geometry"]
        });

        autocompleteRef.current.addListener("place_changed", handlePlaceChanged);

        setIsLoading(false);
        setError(null);
      })
      .catch((err: Error) => {
        console.error("Error loading Google Maps API:", err);
        setError("Failed to load address autocomplete");
        setIsLoading(false);
      });

    return () => {
      if (autocompleteRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [handlePlaceChanged]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    // Propagate manual input changes to parent
    onInputChange?.(newValue);
  };

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <MapPin className="h-4 w-4" />
      </div>
      <Input
        ref={inputRef}
        value={inputValue}
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
