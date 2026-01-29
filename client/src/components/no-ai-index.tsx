import { useEffect } from "react";

export function useNoAIIndex() {
  useEffect(() => {
    const existingRobots = document.querySelector('meta[name="robots"]');
    if (existingRobots) {
      existingRobots.setAttribute('content', 'noindex, nofollow, noai, noimageai');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'noindex, nofollow, noai, noimageai';
      document.head.appendChild(meta);
    }

    return () => {
      const meta = document.querySelector('meta[name="robots"][content*="noai"]');
      if (meta) {
        meta.remove();
      }
    };
  }, []);
}

export function NoAIIndexMeta() {
  useNoAIIndex();
  return null;
}
