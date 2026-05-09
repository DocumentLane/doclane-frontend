import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type {
  ReaderViewMode,
  ThemeMode,
  UserPreferences,
} from "../types/user-preferences.types";

const USER_PREFERENCES_STORAGE_KEY = "doclane:user-preferences";
const USER_PREFERENCES_CHANGED_EVENT = "doclane:user-preferences-changed";

export const defaultUserPreferences: UserPreferences = {
  readerDefaultViewMode: "two-pages",
  readerOpenThumbnailsByDefault: false,
  readerShowToolbarByDefault: true,
  themeMode: "system",
};

const readerViewModes = new Set<ReaderViewMode>([
  "continuous-scroll",
  "single-page",
  "two-pages",
]);
const themeModes = new Set<ThemeMode>(["system", "light", "dark"]);

function getStorage() {
  return globalThis.window?.localStorage ?? null;
}

function isReaderViewMode(value: unknown): value is ReaderViewMode {
  return typeof value === "string" && readerViewModes.has(value as ReaderViewMode);
}

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && themeModes.has(value as ThemeMode);
}

export function applyThemeMode(themeMode: ThemeMode) {
  const root = globalThis.document?.documentElement;

  if (!root) {
    return;
  }

  const shouldUseDark =
    themeMode === "dark" ||
    (themeMode === "system" &&
      globalThis.window?.matchMedia("(prefers-color-scheme: dark)").matches);

  root.classList.toggle("dark", shouldUseDark);
  root.style.colorScheme = shouldUseDark ? "dark" : "light";
}

function parseUserPreferences(value: unknown): UserPreferences {
  if (!value || typeof value !== "object") {
    return defaultUserPreferences;
  }

  const preferences = value as Partial<UserPreferences>;

  return {
    readerDefaultViewMode: isReaderViewMode(preferences.readerDefaultViewMode)
      ? preferences.readerDefaultViewMode
      : defaultUserPreferences.readerDefaultViewMode,
    readerOpenThumbnailsByDefault:
      typeof preferences.readerOpenThumbnailsByDefault === "boolean"
        ? preferences.readerOpenThumbnailsByDefault
        : defaultUserPreferences.readerOpenThumbnailsByDefault,
    readerShowToolbarByDefault:
      typeof preferences.readerShowToolbarByDefault === "boolean"
        ? preferences.readerShowToolbarByDefault
        : defaultUserPreferences.readerShowToolbarByDefault,
    themeMode: isThemeMode(preferences.themeMode)
      ? preferences.themeMode
      : defaultUserPreferences.themeMode,
  };
}

export function readUserPreferences(): UserPreferences {
  const storage = getStorage();

  if (!storage) {
    return defaultUserPreferences;
  }

  const storedPreferences = storage.getItem(USER_PREFERENCES_STORAGE_KEY);

  if (!storedPreferences) {
    return defaultUserPreferences;
  }

  try {
    return parseUserPreferences(JSON.parse(storedPreferences));
  } catch {
    return defaultUserPreferences;
  }
}

export function writeUserPreferences(preferences: UserPreferences) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(USER_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new Event(USER_PREFERENCES_CHANGED_EVENT));
}

function subscribeToUserPreferences(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(USER_PREFERENCES_CHANGED_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(USER_PREFERENCES_CHANGED_EVENT, callback);
  };
}

function getUserPreferencesSnapshot() {
  return JSON.stringify(readUserPreferences());
}

function getServerUserPreferencesSnapshot() {
  return JSON.stringify(defaultUserPreferences);
}

export function useUserPreferences() {
  const preferencesSnapshot = useSyncExternalStore(
    subscribeToUserPreferences,
    getUserPreferencesSnapshot,
    getServerUserPreferencesSnapshot,
  );
  const preferences = useMemo(
    () => parseUserPreferences(JSON.parse(preferencesSnapshot)),
    [preferencesSnapshot],
  );

  const updatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    const nextPreferences = {
      ...readUserPreferences(),
      ...patch,
    };

    writeUserPreferences(nextPreferences);
  }, []);

  const resetPreferences = useCallback(() => {
    writeUserPreferences(defaultUserPreferences);
  }, []);

  return {
    preferences,
    updatePreferences,
    resetPreferences,
  };
}

export function useThemeModeSync() {
  const { preferences } = useUserPreferences();

  useEffect(() => {
    applyThemeMode(preferences.themeMode);

    if (preferences.themeMode !== "system") {
      return;
    }

    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => applyThemeMode("system");

    systemTheme.addEventListener("change", handleSystemThemeChange);

    return () => {
      systemTheme.removeEventListener("change", handleSystemThemeChange);
    };
  }, [preferences.themeMode]);
}
