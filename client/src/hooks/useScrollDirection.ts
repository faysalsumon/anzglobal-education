import { useState, useEffect, useCallback, useRef } from "react";

type ScrollDirection = "up" | "down" | null;

interface UseScrollDirectionOptions {
  threshold?: number;
  initialDirection?: ScrollDirection;
}

export function useScrollDirection(options: UseScrollDirectionOptions = {}) {
  const { threshold = 10, initialDirection = null } = options;
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(initialDirection);
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateScrollDirection = useCallback(() => {
    const scrollY = window.scrollY;
    
    setIsAtTop(scrollY < 50);

    if (Math.abs(scrollY - lastScrollY.current) < threshold) {
      ticking.current = false;
      return;
    }

    const direction = scrollY > lastScrollY.current ? "down" : "up";
    
    if (direction !== scrollDirection && 
        (scrollY > threshold || direction === "up")) {
      setScrollDirection(direction);
    }

    lastScrollY.current = scrollY > 0 ? scrollY : 0;
    ticking.current = false;
  }, [scrollDirection, threshold]);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [updateScrollDirection]);

  return { scrollDirection, isAtTop };
}
