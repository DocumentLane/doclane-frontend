import { Html, Head, Main, NextScript } from "next/document";

const themeInitializer = `
(function () {
  try {
    var stored = window.localStorage.getItem("doclane:user-preferences");
    var preferences = stored ? JSON.parse(stored) : {};
    var themeMode = preferences.themeMode === "light" || preferences.themeMode === "dark" ? preferences.themeMode : "system";
    var shouldUseDark = themeMode === "dark" || (themeMode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", shouldUseDark);
    document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";
  } catch {
    var fallbackShouldUseDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", fallbackShouldUseDark);
    document.documentElement.style.colorScheme = fallbackShouldUseDark ? "dark" : "light";
  }
})();
`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
