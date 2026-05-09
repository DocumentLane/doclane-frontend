import Image from "next/image";
import type { RefObject } from "react";
import { cn } from "@/lib/utils";

interface PdfViewerStageProps {
  containerRef: RefObject<HTMLDivElement | null>;
  viewerRef: RefObject<HTMLDivElement | null>;
  isLoaded: boolean;
  isViewerReadyForDisplay: boolean;
  previewUrl: string | null;
  title: string;
}

export function PdfViewerStage({
  containerRef,
  viewerRef,
  isLoaded,
  isViewerReadyForDisplay,
  previewUrl,
  title,
}: PdfViewerStageProps) {
  const shouldShowPreview = Boolean(previewUrl) && !isViewerReadyForDisplay;

  return (
    <section className="relative min-h-0 flex-1 bg-muted">
      <div ref={containerRef} className="absolute inset-0 overflow-auto">
        {!isLoaded && !previewUrl ? (
          <p className="absolute left-6 top-6 z-10 text-sm text-muted-foreground">
            Loading PDF...
          </p>
        ) : null}
        <div ref={viewerRef} className="pdfViewer px-8 py-6" />
      </div>
      {previewUrl ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-10 flex items-start justify-center overflow-hidden bg-muted px-8 py-6 transition-opacity duration-200",
            shouldShowPreview ? "opacity-100" : "opacity-0",
          )}
          aria-hidden={!shouldShowPreview}
        >
          <div className="relative min-h-full w-full">
            <Image
              src={previewUrl}
              alt={`${title} preview`}
              fill
              unoptimized
              priority
              sizes="100vw"
              className="object-contain object-top"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
