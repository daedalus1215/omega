import { useLayoutEffect, useState } from 'react';

/**
 * Tracks an element's rendered height, border included. Pass the returned
 * ref to the element; the height is 0 until it mounts.
 */
export const useElementHeight = <T extends HTMLElement>() => {
  const [element, setElement] = useState<T | null>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (!element) return;
    const measure = () => setHeight(element.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [setElement, height] as const;
};
