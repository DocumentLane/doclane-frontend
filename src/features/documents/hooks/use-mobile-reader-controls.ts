import { useCallback, useEffect, useRef, useState } from "react";

const MOBILE_CONTROLS_IDLE_DELAY_MS = 2500;

interface UseMobileReaderControlsInput {
  isMobile: boolean;
  isPageListOpen: boolean;
}

export function useMobileReaderControls({
  isMobile,
  isPageListOpen,
}: UseMobileReaderControlsInput) {
  const hideTimerRef = useRef<number | null>(null);
  const [areControlsVisible, setAreControlsVisible] = useState(true);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current === null) {
      return;
    }

    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();

    if (!isMobile || isPageListOpen) {
      return;
    }

    hideTimerRef.current = window.setTimeout(() => {
      setAreControlsVisible(false);
      hideTimerRef.current = null;
    }, MOBILE_CONTROLS_IDLE_DELAY_MS);
  }, [clearHideTimer, isMobile, isPageListOpen]);

  const revealControls = useCallback(() => {
    if (!isMobile) {
      return;
    }

    setAreControlsVisible(true);
    scheduleHide();
  }, [isMobile, scheduleHide]);

  useEffect(() => {
    if (areControlsVisible) {
      scheduleHide();
    }

    return clearHideTimer;
  }, [areControlsVisible, clearHideTimer, scheduleHide]);

  return {
    areControlsVisible,
    revealControls,
  };
}
