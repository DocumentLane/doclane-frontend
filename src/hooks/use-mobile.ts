import * as React from "react"

const MOBILE_BREAKPOINT = 768
const mobileQuery = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function getServerSnapshot() {
  return false
}

function getSnapshot() {
  return window.matchMedia(mobileQuery).matches
}

function subscribe(callback: () => void) {
  const mql = window.matchMedia(mobileQuery)

  mql.addEventListener("change", callback)

  return () => mql.removeEventListener("change", callback)
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
