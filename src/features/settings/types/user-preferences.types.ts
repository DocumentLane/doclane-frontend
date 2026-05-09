export type ReaderViewMode = "continuous-scroll" | "single-page" | "two-pages";
export type ThemeMode = "system" | "light" | "dark";

export interface UserPreferences {
  readerDefaultViewMode: ReaderViewMode;
  readerOpenThumbnailsByDefault: boolean;
  readerShowToolbarByDefault: boolean;
  themeMode: ThemeMode;
}
