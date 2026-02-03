/**
 * useReducedMotion Hook
 *
 * Detects user preference for reduced motion/animations.
 * Uses the prefers-reduced-motion media query to respect system settings.
 *
 * @returns boolean - true if user prefers reduced motion
 */

import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if the user prefers reduced motion.
 * Returns true when the user has enabled reduced motion in their system settings.
 *
 * @example
 * const reducedMotion = useReducedMotion();
 * if (reducedMotion) {
 *   // Skip or simplify animations
 * }
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    // Check if window is defined (SSR safety)
    if (typeof window === 'undefined') {
      return false;
    }
    // Initial check for reduced motion preference
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Handler for preference changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Listen for changes to the preference
    // Use addEventListener for modern browsers, addListener for older ones
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers (Safari < 14)
      mediaQuery.addListener(handleChange);
    }

    // Sync state with current value in case it changed since initial render
    setPrefersReducedMotion(mediaQuery.matches);

    // Cleanup listener on unmount
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return prefersReducedMotion;
}

export default useReducedMotion;
