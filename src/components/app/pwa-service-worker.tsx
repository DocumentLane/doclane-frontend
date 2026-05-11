import { useEffect } from "react";

export function PwaServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
      .catch((error: unknown) => {
        console.warn("Service worker registration failed.", error);
      });
  }, []);

  return null;
}
