import React from 'react';

export type UseResizablePaneOptions = {
  readonly localStorageKey: string;
  readonly min: number;
  readonly max: number;
  readonly initial: number;
  readonly axis?: 'x' | 'y';
  readonly step?: number;
  readonly largeStep?: number;
  readonly snapPoints?: readonly number[]; // pixel values to snap to
  readonly snapThreshold?: number; // pixels within which to snap
};

export const useResizablePane = (options: UseResizablePaneOptions) => {
  const {
    localStorageKey,
    min,
    max,
    initial,
    axis = 'x',
    step = 10,
    largeStep = 20,
    snapPoints = [],
    snapThreshold = 8,
  } = options;

  const [size, setSize] = React.useState<number>(() => {
    const saved = Number(localStorage.getItem(localStorageKey));
    if (!Number.isFinite(saved)) return initial;
    return Math.min(Math.max(saved, min), max);
  });

  const startCoordRef = React.useRef<number>(0);
  const startSizeRef = React.useRef<number>(size);
  const isResizingRef = React.useRef<boolean>(false);

  const handleMouseMove = React.useCallback(
    (event: MouseEvent) => {
      if (!isResizingRef.current) return;
      const current = axis === 'x' ? event.clientX : event.clientY;
      const delta = current - startCoordRef.current;
      const next = Math.min(Math.max(startSizeRef.current + delta, min), max);
      setSize(next);
    },
    [axis, max, min]
  );

  const stopResizing = React.useCallback(() => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    const snapped = getSnappedSize(size, {
      min,
      max,
      snapPoints,
      snapThreshold,
    });
    setSize(snapped);
    localStorage.setItem(localStorageKey, String(snapped));
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', stopResizing);
  }, [
    handleMouseMove,
    localStorageKey,
    size,
    min,
    max,
    snapPoints,
    snapThreshold,
  ]);

  const startResizing = React.useCallback(
    (
      event:
        | React.MouseEvent<HTMLDivElement>
        | React.PointerEvent<HTMLDivElement>
    ) => {
      startCoordRef.current = axis === 'x' ? event.clientX : event.clientY;
      startSizeRef.current = size;
      isResizingRef.current = true;
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopResizing);
      event.preventDefault();
    },
    [axis, handleMouseMove, size, stopResizing]
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const isDecrease =
        axis === 'x' ? event.key === 'ArrowLeft' : event.key === 'ArrowUp';
      const isIncrease =
        axis === 'x' ? event.key === 'ArrowRight' : event.key === 'ArrowDown';
      if (!isDecrease && !isIncrease) return;
      const delta = event.shiftKey ? largeStep : step;
      const raw = isDecrease
        ? Math.max(size - delta, min)
        : Math.min(size + delta, max);
      const next = getSnappedSize(raw, { min, max, snapPoints, snapThreshold });
      setSize(next);
      localStorage.setItem(localStorageKey, String(next));
      event.preventDefault();
    },
    [
      axis,
      largeStep,
      localStorageKey,
      max,
      min,
      size,
      step,
      snapPoints,
      snapThreshold,
    ]
  );

  React.useEffect(
    () => () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', stopResizing);
      }
    },
    [handleMouseMove, stopResizing]
  );

  const handleDoubleClick = React.useCallback(() => {
    const reset = getSnappedSize(initial, {
      min,
      max,
      snapPoints,
      snapThreshold,
    });
    setSize(reset);
    localStorage.setItem(localStorageKey, String(reset));
  }, [initial, localStorageKey, max, min, snapPoints, snapThreshold]);

  return {
    size,
    setSize,
    startResizing,
    handleKeyDown,
    handleDoubleClick,
  } as const;
};

type SnapConfig = {
  min: number;
  max: number;
  snapPoints: readonly number[];
  snapThreshold: number;
};

const getSnappedSize = (value: number, config: SnapConfig): number => {
  const { min, max, snapPoints, snapThreshold } = config;
  const clamped = Math.min(Math.max(value, min), max);
  if (!snapPoints.length) return clamped;
  let best = clamped;
  let bestDist = Infinity;
  for (const p of snapPoints) {
    const dist = Math.abs(clamped - p);
    if (dist < bestDist) {
      best = p;
      bestDist = dist;
    }
  }
  return bestDist <= snapThreshold ? best : clamped;
};
