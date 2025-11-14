import { useState, useEffect, useMemo, useCallback } from "react";

export interface InstitutionFilters {
  search: string;
  countries: string[];
  providerTypes: string[];
  deliveryModes: string[];
  intakePeriods: string[];
  facilities: string[];
  disciplines: string[];
  tags: string[];
  scholarshipMin?: number;
  scholarshipMax?: number;
  tuitionMin?: number;
  tuitionMax?: number;
  accreditationStatus?: string;
  rankingBand?: string;
  internationalSupport?: boolean;
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
    providerTypes: params.getAll("providerTypes").sort(),
    deliveryModes: params.getAll("deliveryModes").sort(),
    intakePeriods: params.getAll("intakePeriods").sort(),
    facilities: params.getAll("facilities").sort(),
    disciplines: params.getAll("disciplines").sort(),
    tags: params.getAll("tags").sort(),
    scholarshipMin: params.get("scholarshipMin") ? parseFloat(params.get("scholarshipMin")!) : undefined,
    scholarshipMax: params.get("scholarshipMax") ? parseFloat(params.get("scholarshipMax")!) : undefined,
    tuitionMin: params.get("tuitionMin") ? parseFloat(params.get("tuitionMin")!) : undefined,
    tuitionMax: params.get("tuitionMax") ? parseFloat(params.get("tuitionMax")!) : undefined,
    accreditationStatus: params.get("accreditationStatus") || undefined,
    rankingBand: params.get("rankingBand") || undefined,
    internationalSupport: params.get("internationalSupport") === "true" ? true : undefined,
  };
};

// Serialize filters to URL params with sorted arrays for cache stability
const serializeFiltersToURL = (filters: InstitutionFilters): string => {
  const params = new URLSearchParams();
  
  if (filters.search) params.set("search", filters.search);
  
  // Sort arrays before appending to ensure consistent query string ordering
  [...filters.countries].sort().forEach(c => params.append("countries", c));
  [...filters.providerTypes].sort().forEach(t => params.append("providerTypes", t));
  [...filters.deliveryModes].sort().forEach(m => params.append("deliveryModes", m));
  [...filters.intakePeriods].sort().forEach(i => params.append("intakePeriods", i));
  [...filters.facilities].sort().forEach(f => params.append("facilities", f));
  [...filters.disciplines].sort().forEach(d => params.append("disciplines", d));
  [...filters.tags].sort().forEach(t => params.append("tags", t));
  
  if (filters.scholarshipMin !== undefined) params.set("scholarshipMin", String(filters.scholarshipMin));
  if (filters.scholarshipMax !== undefined) params.set("scholarshipMax", String(filters.scholarshipMax));
  if (filters.tuitionMin !== undefined) params.set("tuitionMin", String(filters.tuitionMin));
  if (filters.tuitionMax !== undefined) params.set("tuitionMax", String(filters.tuitionMax));
  if (filters.accreditationStatus) params.set("accreditationStatus", filters.accreditationStatus);
  if (filters.rankingBand) params.set("rankingBand", filters.rankingBand);
  if (filters.internationalSupport) params.set("internationalSupport", "true");

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

  const setRange = useCallback((key: 'scholarship' | 'tuition', min?: number, max?: number) => {
    setFilters(prev => {
      if (key === 'scholarship') {
        return { ...prev, scholarshipMin: min, scholarshipMax: max };
      } else {
        return { ...prev, tuitionMin: min, tuitionMax: max };
      }
    });
  }, [setFilters]);

  const setSingleSelect = useCallback((key: 'accreditationStatus' | 'rankingBand', value?: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, [setFilters]);

  const setInternationalSupport = useCallback((value?: boolean) => {
    setFilters(prev => ({ ...prev, internationalSupport: value }));
  }, [setFilters]);

  const clearFilters = useCallback(() => {
    const emptyFilters: InstitutionFilters = {
      search: "",
      countries: [],
      providerTypes: [],
      deliveryModes: [],
      intakePeriods: [],
      facilities: [],
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
        label: `Country: ${country}`,
        value: country,
        onRemove: () => toggleMultiSelect('countries', country)
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

    filters.deliveryModes.forEach(mode => {
      chips.push({
        key: `delivery-${mode}`,
        label: `Delivery: ${mode}`,
        value: mode,
        onRemove: () => toggleMultiSelect('deliveryModes', mode)
      });
    });

    filters.intakePeriods.forEach(intake => {
      chips.push({
        key: `intake-${intake}`,
        label: `Intake: ${intake}`,
        value: intake,
        onRemove: () => toggleMultiSelect('intakePeriods', intake)
      });
    });

    filters.facilities.forEach(facility => {
      chips.push({
        key: `facility-${facility}`,
        label: `Facility: ${facility}`,
        value: facility,
        onRemove: () => toggleMultiSelect('facilities', facility)
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

    if (filters.tuitionMin !== undefined || filters.tuitionMax !== undefined) {
      chips.push({
        key: 'tuition-range',
        label: `Tuition: $${filters.tuitionMin?.toLocaleString() || 0} - $${filters.tuitionMax?.toLocaleString() || '∞'}`,
        value: `${filters.tuitionMin}-${filters.tuitionMax}`,
        onRemove: () => setRange('tuition', undefined, undefined)
      });
    }

    if (filters.accreditationStatus) {
      chips.push({
        key: 'accreditation',
        label: `Accreditation: ${filters.accreditationStatus}`,
        value: filters.accreditationStatus,
        onRemove: () => setSingleSelect('accreditationStatus', undefined)
      });
    }

    if (filters.rankingBand) {
      chips.push({
        key: 'ranking',
        label: `Ranking: ${filters.rankingBand}`,
        value: filters.rankingBand,
        onRemove: () => setSingleSelect('rankingBand', undefined)
      });
    }

    if (filters.internationalSupport) {
      chips.push({
        key: 'international-support',
        label: 'International Support',
        value: 'true',
        onRemove: () => setInternationalSupport(undefined)
      });
    }

    return chips;
  }, [filters, toggleMultiSelect, setRange, setSingleSelect, setInternationalSupport]);

  const hasActiveFilters = activeFilterChips.length > 0 || filters.search !== "";

  // Generate stable query params string for TanStack Query
  const queryParamsString = useMemo(() => serializeFiltersToURL(filters), [filters]);

  return {
    filters,
    setFilters,
    setSearch,
    toggleMultiSelect,
    setRange,
    setSingleSelect,
    setInternationalSupport,
    clearFilters,
    activeFilterChips,
    hasActiveFilters,
    queryParamsString, // Export this for use in TanStack Query
  };
}
