import Head from "next/head";
import { useRouter } from "next/router";

const SITE_NAME = "Doclane";
const DEFAULT_DESCRIPTION = "Read, manage, and annotate PDFs in Doclane.";
const DEFAULT_TITLE = "Doclane";

interface SeoHeadProps {
  title?: string;
  description?: string;
  imageUrl?: string | null;
  noIndex?: boolean;
}

function getAbsoluteUrl(path: string) {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (!siteUrl) {
    return path;
  }

  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function getPageTitle(title?: string) {
  if (!title || title === DEFAULT_TITLE) {
    return DEFAULT_TITLE;
  }

  return `${title} | ${SITE_NAME}`;
}

export function SeoHead({
  title,
  description = DEFAULT_DESCRIPTION,
  imageUrl,
  noIndex = false,
}: SeoHeadProps) {
  const router = useRouter();
  const pageTitle = getPageTitle(title);
  const canonicalUrl = getAbsoluteUrl(router.asPath.split("#")[0] ?? "/");

  return (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      {noIndex ? <meta name="robots" content="noindex,nofollow" /> : null}
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      {imageUrl ? <meta property="og:image" content={imageUrl} /> : null}

      <meta name="twitter:card" content={imageUrl ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      {imageUrl ? <meta name="twitter:image" content={imageUrl} /> : null}
    </Head>
  );
}
