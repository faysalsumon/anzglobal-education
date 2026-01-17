import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AddressComponents {
  unitNo?: string;
  street?: string;
  suburb?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  formattedAddress?: string;
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: AddressComponents) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps?: () => void;
  }
}

let isScriptLoading = false;
let isScriptLoaded = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (isScriptLoaded && window.google?.maps?.places) {
      resolve();
      return;
    }

    loadCallbacks.push(resolve);

    if (isScriptLoading) {
      return;
    }

    isScriptLoading = true;

    window.initGoogleMaps = () => {
      isScriptLoaded = true;
      isScriptLoading = false;
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

function parseAddressComponents(
  place: google.maps.places.PlaceResult
): AddressComponents {
  const components: AddressComponents = {
    formattedAddress: place.formatted_address,
  };

  if (!place.address_components) return components;

  for (const component of place.address_components) {
    const types = component.types;

    if (types.includes("subpremise")) {
      components.unitNo = component.long_name;
    } else if (types.includes("street_number")) {
      components.street = component.long_name;
    } else if (types.includes("route")) {
      components.street = components.street
        ? `${components.street} ${component.long_name}`
        : component.long_name;
    } else if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
      components.suburb = component.long_name;
    } else if (types.includes("locality")) {
      if (!components.suburb) {
        components.suburb = component.long_name;
      }
      components.city = component.long_name;
    } else if (types.includes("administrative_area_level_2")) {
      if (!components.city) {
        components.city = component.long_name;
      }
    } else if (types.includes("administrative_area_level_1")) {
      components.state = component.long_name;
    } else if (types.includes("postal_code")) {
      components.postcode = component.long_name;
    } else if (types.includes("country")) {
      components.country = component.long_name;
    }
  }

  return components;
}

export function AddressAutocomplete({
  onAddressSelect,
  placeholder = "Search for an address...",
  className,
  disabled,
  "data-testid": testId,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onAddressSelectRef = useRef(onAddressSelect);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    onAddressSelectRef.current = onAddressSelect;
  }, [onAddressSelect]);

  useEffect(() => {
    if (!apiKey) {
      console.warn("Google Maps API key not found");
      return;
    }

    setIsLoading(true);
    loadGoogleMapsScript(apiKey)
      .then(() => {
        setIsReady(true);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load Google Maps:", err);
        setIsLoading(false);
      });
  }, [apiKey]);

  useEffect(() => {
    if (!isReady || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["address"],
        fields: ["address_components", "formatted_address", "geometry"],
      }
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place && place.address_components) {
        const parsed = parseAddressComponents(place);
        onAddressSelectRef.current(parsed);
        setInputValue(place.formatted_address || "");
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isReady]);

  const handleClear = useCallback(() => {
    setInputValue("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  if (!apiKey) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative flex items-center">
        <MapPin className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isLoading ? "Loading..." : placeholder}
          disabled={disabled || isLoading}
          className="pl-9 pr-9"
          data-testid={testId}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!isLoading && inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 h-7 w-7"
            onClick={handleClear}
            data-testid={testId ? `${testId}-clear` : undefined}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        Type to search, or fill in the fields manually below
      </p>
    </div>
  );
}
