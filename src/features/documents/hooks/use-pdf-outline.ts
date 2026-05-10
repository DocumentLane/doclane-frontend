import { useEffect, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

export interface PdfOutlineItem {
  id: string;
  title: string;
  pageNumber: number | null;
  url: string | null;
  isBold: boolean;
  isItalic: boolean;
  items: PdfOutlineItem[];
}

interface PdfOutlineNode {
  title: string;
  bold: boolean;
  italic: boolean;
  dest: string | unknown[] | null;
  url: string | null;
  items: PdfOutlineNode[];
}

interface PdfPageReference {
  num: number;
  gen: number;
}

function isPdfPageReference(value: unknown): value is PdfPageReference {
  return (
    typeof value === "object" &&
    value !== null &&
    "num" in value &&
    "gen" in value &&
    typeof (value as { num: unknown }).num === "number" &&
    typeof (value as { gen: unknown }).gen === "number"
  );
}

async function resolveDestinationPageNumber(
  pdfDocument: PDFDocumentProxy,
  dest: PdfOutlineNode["dest"],
) {
  if (!dest) {
    return null;
  }

  const resolvedDest = typeof dest === "string" ? await pdfDocument.getDestination(dest) : dest;
  const pageReference = resolvedDest?.[0];

  if (typeof pageReference === "number") {
    return Math.min(pdfDocument.numPages, Math.max(1, pageReference + 1));
  }

  if (!isPdfPageReference(pageReference)) {
    return null;
  }

  const pageIndex = await pdfDocument.getPageIndex(pageReference);

  return Math.min(pdfDocument.numPages, Math.max(1, pageIndex + 1));
}

async function resolveOutlineItems(
  pdfDocument: PDFDocumentProxy,
  nodes: PdfOutlineNode[],
  path: string,
): Promise<PdfOutlineItem[]> {
  return Promise.all(
    nodes.map(async (node, index) => ({
      id: `${path}-${index}`,
      title: node.title.trim() || "Untitled",
      pageNumber: await resolveDestinationPageNumber(pdfDocument, node.dest),
      url: node.url,
      isBold: node.bold,
      isItalic: node.italic,
      items: await resolveOutlineItems(pdfDocument, node.items ?? [], `${path}-${index}`),
    })),
  );
}

export function usePdfOutline(pdfDocument: PDFDocumentProxy | null) {
  const [outlineItems, setOutlineItems] = useState<PdfOutlineItem[]>([]);
  const [isLoadingOutline, setIsLoadingOutline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!pdfDocument) {
      window.queueMicrotask(() => {
        if (!cancelled) {
          setOutlineItems([]);
          setIsLoadingOutline(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    window.queueMicrotask(() => {
      if (!cancelled) {
        setIsLoadingOutline(true);
      }
    });
    pdfDocument
      .getOutline()
      .then((outline) =>
        outline
          ? resolveOutlineItems(pdfDocument, outline as PdfOutlineNode[], "outline")
          : [],
      )
      .then((items) => {
        if (!cancelled) {
          setOutlineItems(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOutlineItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingOutline(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pdfDocument]);

  return { outlineItems, isLoadingOutline };
}
