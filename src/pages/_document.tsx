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
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="application-name" content="Doclane" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Doclane" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#171717" media="(prefers-color-scheme: dark)" />
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
