import { useSyncExternalStore, useCallback } from 'react';

// Custom event for search changes
const SEARCH_CHANGE_EVENT = 'searchchange';

// Dispatch custom event when search changes
const dispatchSearchChange = () => {
  window.dispatchEvent(new Event(SEARCH_CHANGE_EVENT));
};

// Subscribe to URL search changes
const subscribe = (callback: () => void) => {
  // Listen to popstate (browser back/forward)
  window.addEventListener('popstate', callback);
  // Listen to custom search change event
  window.addEventListener(SEARCH_CHANGE_EVENT, callback);
  
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener(SEARCH_CHANGE_EVENT, callback);
  };
};

// Get current search params
const getSnapshot = () => {
  return window.location.search;
};

// Server-side snapshot (empty)
const getServerSnapshot = () => {
  return '';
};

/**
 * Hook to manage URL query parameters with proper synchronization
 * Returns current params and a setter that merges changes
 */
export function useQueryParams() {
  // Subscribe to URL search changes
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  
  // Parse current params
  const params = new URLSearchParams(search);
  
  // Setter that merges params and updates URL
  const setParams = useCallback((updates: Record<string, string | null | undefined>) => {
    const currentParams = new URLSearchParams(window.location.search);
    
    // Apply updates (null/undefined means delete)
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        currentParams.delete(key);
      } else {
        currentParams.set(key, value);
      }
    });
    
    const newSearch = currentParams.toString();
    const newFullSearch = newSearch ? `?${newSearch}` : '';
    
    // Only update if actually changed
    if (window.location.search !== newFullSearch) {
      window.history.replaceState({}, '', window.location.pathname + newFullSearch);
      dispatchSearchChange();
    }
  }, []);
  
  return { params, setParams };
}
