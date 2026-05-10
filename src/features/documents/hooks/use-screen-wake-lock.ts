import { useEffect } from "react";

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
}

type WakeLockNavigator = Omit<Navigator, "wakeLock"> & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

export function useScreenWakeLock(isEnabled: boolean) {
  useEffect(() => {
    if (!isEnabled || typeof navigator === "undefined") {
      return;
    }

    let wakeLockSentinel: WakeLockSentinelLike | null = null;
    let isCancelled = false;

    const releaseWakeLock = () => {
      const currentSentinel = wakeLockSentinel;

      wakeLockSentinel = null;

      if (!currentSentinel || currentSentinel.released) {
        return;
      }

      void currentSentinel.release().catch(() => {});
    };

    const requestWakeLock = async () => {
      const wakeLock = (navigator as WakeLockNavigator).wakeLock;

      if (
        !wakeLock ||
        document.visibilityState !== "visible" ||
        (wakeLockSentinel && !wakeLockSentinel.released)
      ) {
        return;
      }

      try {
        const nextSentinel = await wakeLock.request("screen");

        if (isCancelled) {
          void nextSentinel.release().catch(() => {});
          return;
        }

        wakeLockSentinel = nextSentinel;
      } catch {
        wakeLockSentinel = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
        return;
      }

      releaseWakeLock();
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isEnabled]);
}
