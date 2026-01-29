import { useState, useEffect, useMemo, useCallback } from "react";

export interface InstitutionFilters {
  search: string;
  countries: string[];
  states: string[];
  cities: string[];
  providerTypes: string[];
  disciplines: string[];
  tags: string[];
  scholarshipMin?: number;
  scholarshipMax?: number;
}

export interface FilterChip {
  key: string;
  label: string;
  value: string | number;
  onRemove: () => void;
}

// Parse filters from URL params
const parseFiltersFromURL = (): InstitutionFilters => {
  const params = new URLSearchParams(window.location.search);
  
  return {
    search: params.get("search") || "",
    countries: params.getAll("countries").sort(),
    states: params.getAll("states").sort(),
    cities: params.getAll("cities").sort(),
    providerTypes: params.getAll("providerTypes").sort(),
    disciplines: params.getAll("disciplines").sort(),
    tags: params.getAll("tags").sort(),
    scholarshipMin: params.get("scholarshipMin") ? parseFloat(params.get("scholarshipMin")!) : undefined,
    scholarshipMax: params.get("scholarshipMax") ? parseFloat(params.get("scholarshipMax")!) : undefined,
  };
};

// Serialize filters to URL params with sorted arrays for cache stability
const serializeFiltersToURL = (filters: InstitutionFilters): string => {
  const params = new URLSearchParams();
  
  if (filters.search) params.set("search", filters.search);
  
  // Sort arrays before appending to ensure consistent query string ordering
  [...filters.countries].sort().forEach(c => params.append("countries", c));
  [...filters.states].sort().forEach(s => params.append("states", s));
  [...filters.cities].sort().forEach(c => params.append("cities", c));
  [...filters.providerTypes].sort().forEach(t => params.append("providerTypes", t));
  [...filters.disciplines].sort().forEach(d => params.append("disciplines", d));
  [...filters.tags].sort().forEach(t => params.append("tags", t));
  
  if (filters.scholarshipMin !== undefined) params.set("scholarshipMin", String(filters.scholarshipMin));
  if (filters.scholarshipMax !== undefined) params.set("scholarshipMax", String(filters.scholarshipMax));

  return params.toString();
};

export function useInstitutionFilters() {
  const [filters, setFiltersState] = useState<InstitutionFilters>(parseFiltersFromURL);

  // Sync filters to URL
  const syncToURL = useCallback((newFilters: InstitutionFilters) => {
    const queryString = serializeFiltersToURL(newFilters);
    const newURL = queryString ? `?${queryString}` : window.location.pathname;
    window.history.replaceState({}, "", newURL);
  }, []);

  // Listen for browser navigation (back/forward) and rehydrate filters from URL
  useEffect(() => {
    const handlePopState = () => {
      const urlFilters = parseFiltersFromURL();
      setFiltersState(urlFilters);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Set filters with functional updater to avoid race conditions
  const setFilters = useCallback((updater: InstitutionFilters | ((prev: InstitutionFilters) => InstitutionFilters)) => {
    setFiltersState(prev => {
      const newFilters = typeof updater === 'function' ? updater(prev) : updater;
      syncToURL(newFilters);
      return newFilters;
    });
  }, [syncToURL]);

  // Helper setters using functional updates
  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
  }, [setFilters]);

  const toggleMultiSelect = useCallback((key: keyof InstitutionFilters, value: string) => {
    setFilters(prev => {
      const currentArray = (prev[key] as string[]) || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(v => v !== value)
        : [...currentArray, value];
      return { ...prev, [key]: newArray };
    });
  }, [setFilters]);

  const setRange = useCallback((key: 'scholarship', min?: number, max?: number) => {
    setFilters(prev => {
      return { ...prev, scholarshipMin: min, scholarshipMax: max };
    });
  }, [setFilters]);

  const clearFilters = useCallback(() => {
    const emptyFilters: InstitutionFilters = {
      search: "",
      countries: [],
      states: [],
      cities: [],
      providerTypes: [],
      disciplines: [],
      tags: [],
    };
    setFilters(emptyFilters);
  }, [setFilters]);

  // Generate filter chips for active filters
  const activeFilterChips = useMemo((): FilterChip[] => {
    const chips: FilterChip[] = [];

    filters.countries.forEach(country => {
      chips.push({
        key: `country-${country}`,
        label: country,
        value: country,
        onRemove: () => toggleMultiSelect('countries', country)
      });
    });

    filters.states.forEach(state => {
      chips.push({
        key: `state-${state}`,
        label: state,
        value: state,
        onRemove: () => toggleMultiSelect('states', state)
      });
    });

    filters.cities.forEach(city => {
      chips.push({
        key: `city-${city}`,
        label: city,
        value: city,
        onRemove: () => toggleMultiSelect('cities', city)
      });
    });

    filters.providerTypes.forEach(type => {
      chips.push({
        key: `type-${type}`,
        label: `Type: ${type}`,
        value: type,
        onRemove: () => toggleMultiSelect('providerTypes', type)
      });
    });

    filters.disciplines.forEach(discipline => {
      chips.push({
        key: `discipline-${discipline}`,
        label: discipline,
        value: discipline,
        onRemove: () => toggleMultiSelect('disciplines', discipline)
      });
    });

    filters.tags.forEach(tag => {
      chips.push({
        key: `tag-${tag}`,
        label: tag,
        value: tag,
        onRemove: () => toggleMultiSelect('tags', tag)
      });
    });

    if (filters.scholarshipMin !== undefined || filters.scholarshipMax !== undefined) {
      chips.push({
        key: 'scholarship-range',
        label: `Scholarship: ${filters.scholarshipMin || 0}% - ${filters.scholarshipMax || 100}%`,
        value: `${filters.scholarshipMin}-${filters.scholarshipMax}`,
        onRemove: () => setRange('scholarship', undefined, undefined)
      });
    }

    return chips;
  }, [filters, toggleMultiSelect, setRange]);

  const hasActiveFilters = activeFilterChips.length > 0 || filters.search !== "";

  // Generate stable query params string for TanStack Query
  const queryParamsString = useMemo(() => serializeFiltersToURL(filters), [filters]);

  return {
    filters,
    setFilters,
    setSearch,
    toggleMultiSelect,
    setRange,
    clearFilters,
    activeFilterChips,
    hasActiveFilters,
    queryParamsString, // Export this for use in TanStack Query
  };
}
