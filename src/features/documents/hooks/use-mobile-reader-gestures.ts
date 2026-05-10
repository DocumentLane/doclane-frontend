import { RefObject, useEffect, useRef } from "react";

const MOBILE_TAP_MOVE_TOLERANCE = 12;
const MOBILE_CENTER_TAP_START_RATIO = 1 / 3;
const MOBILE_CENTER_TAP_END_RATIO = 2 / 3;
const MIN_READER_SCALE = 0.5;
const MAX_READER_SCALE = 2.5;

function clampReaderScale(scale: number) {
  return Math.min(MAX_READER_SCALE, Math.max(MIN_READER_SCALE, scale));
}

function getTouchDistance(firstTouch: Touch, secondTouch: Touch) {
  return Math.hypot(
    firstTouch.clientX - secondTouch.clientX,
    firstTouch.clientY - secondTouch.clientY,
  );
}

interface UseMobileReaderGesturesInput {
  containerRef: RefObject<HTMLDivElement | null>;
  isMobile: boolean;
  isReady: boolean;
  pageCount: number;
  currentPageRef: RefObject<number>;
  getScale: () => number;
  setScale: (scale: number) => void;
  onPageChange: (pageNumber: number) => void;
  onInteraction: () => void;
}

export function useMobileReaderGestures({
  containerRef,
  isMobile,
  isReady,
  pageCount,
  currentPageRef,
  getScale,
  setScale,
  onPageChange,
  onInteraction,
}: UseMobileReaderGesturesInput) {
  const latestInputRef = useRef({
    pageCount,
    getScale,
    setScale,
    onPageChange,
    onInteraction,
  });
  const rafRef = useRef<number | null>(null);
  const pendingScaleRef = useRef<number | null>(null);

  useEffect(() => {
    latestInputRef.current = {
      pageCount,
      getScale,
      setScale,
      onPageChange,
      onInteraction,
    };
  }, [getScale, onInteraction, onPageChange, pageCount, setScale]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !isMobile || !isReady) {
      return;
    }

    let touchStartX = 0;
    let touchStartY = 0;
    let maxTouchMove = 0;
    let pinchStartDistance: number | null = null;
    let pinchStartScale = 1;
    let didPinch = false;

    const flushScale = () => {
      rafRef.current = null;

      if (pendingScaleRef.current === null) {
        return;
      }

      latestInputRef.current.setScale(pendingScaleRef.current);
    };

    const queueScale = (scale: number) => {
      pendingScaleRef.current = scale;

      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = window.requestAnimationFrame(flushScale);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const [touch] = event.touches;

        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        maxTouchMove = 0;
        didPinch = false;
        pinchStartDistance = null;
        return;
      }

      if (event.touches.length === 2) {
        const [firstTouch, secondTouch] = event.touches;

        didPinch = true;
        pinchStartDistance = getTouchDistance(firstTouch, secondTouch);
        pinchStartScale = latestInputRef.current.getScale();
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const [touch] = event.touches;

        maxTouchMove = Math.max(
          maxTouchMove,
          Math.hypot(touch.clientX - touchStartX, touch.clientY - touchStartY),
        );
        return;
      }

      if (event.touches.length !== 2 || !pinchStartDistance) {
        return;
      }

      const [firstTouch, secondTouch] = event.touches;

      event.preventDefault();

      const nextDistance = getTouchDistance(firstTouch, secondTouch);
      const nextScale = clampReaderScale(
        pinchStartScale * (nextDistance / pinchStartDistance),
      );

      queueScale(nextScale);
      didPinch = true;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        return;
      }

      const latest = latestInputRef.current;

      if (
        didPinch ||
        maxTouchMove > MOBILE_TAP_MOVE_TOLERANCE ||
        latest.pageCount < 1
      ) {
        didPinch = false;
        return;
      }

      const tapXRatio = touchStartX / container.clientWidth;

      if (
        tapXRatio > MOBILE_CENTER_TAP_START_RATIO &&
        tapXRatio < MOBILE_CENTER_TAP_END_RATIO
      ) {
        latest.onInteraction();
        return;
      }

      const tapIsOnRightSide = tapXRatio >= MOBILE_CENTER_TAP_END_RATIO;
      const nextPage = tapIsOnRightSide
        ? Math.min(latest.pageCount, currentPageRef.current + 1)
        : Math.max(1, currentPageRef.current - 1);

      if (nextPage !== currentPageRef.current) {
        latest.onPageChange(nextPage);
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [containerRef, currentPageRef, isMobile, isReady]);
}
