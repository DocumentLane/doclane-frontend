import "@/styles/globals.css";
import "pdfjs-dist/web/pdf_viewer.css";
import { QueryClientProvider } from "@tanstack/react-query";
import type { AppProps } from "next/app";
import type { NextComponentType, NextPageContext } from "next";
import { useRouter } from "next/router";
import { useState, useSyncExternalStore } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app/app-shell";
import { LoginPanel } from "@/features/auth/components/login-panel";
import { useMeQuery } from "@/features/auth/queries/auth.queries";
import { useThemeModeSync } from "@/features/settings/lib/user-preferences";
import { createQueryClient } from "@/lib/query/query-client";

type AppPage = NextComponentType<NextPageContext> & {
  fullscreen?: boolean;
};

interface AuthenticatedAppProps {
  Component: AppPage;
  pageProps: AppProps["pageProps"];
}

function subscribeClientMounted(callback: () => void) {
  queueMicrotask(callback);

  return () => {};
}

function getClientMountedSnapshot() {
  return true;
}

function getServerMountedSnapshot() {
  return false;
}

function AuthenticatedApp({ Component, pageProps }: AuthenticatedAppProps) {
  const isClientMounted = useSyncExternalStore(
    subscribeClientMounted,
    getClientMountedSnapshot,
    getServerMountedSnapshot,
  );
  const meQuery = useMeQuery(isClientMounted);

  if (!isClientMounted || meQuery.isLoading) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking session...</p>
      </main>
    );
  }

  if (!meQuery.data) {
    return <LoginPanel />;
  }

  if (Component.fullscreen) {
    return <Component {...pageProps} />;
  }

  return (
    <AppShell user={meQuery.data}>
      <Component {...pageProps} />
    </AppShell>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [queryClient] = useState(() => createQueryClient());
  const isAuthCallback = router.pathname === "/auth/callback";
  const isPublicPage = router.pathname.startsWith("/public/");

  useThemeModeSync();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {isAuthCallback || isPublicPage ? (
          <Component {...pageProps} />
        ) : (
          <AuthenticatedApp Component={Component} pageProps={pageProps} />
        )}
        <Toaster position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
