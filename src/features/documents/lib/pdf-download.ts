interface PdfDownloadNameSource {
  title: string;
  originalFileName: string;
}

const fallbackPdfFileName = "document.pdf";

function sanitizeFileName(fileName: string) {
  const sanitized = fileName
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized || fallbackPdfFileName;
}

export function getPdfDownloadFileName(source: PdfDownloadNameSource) {
  const baseFileName = source.originalFileName || source.title;
  const sanitizedFileName = sanitizeFileName(baseFileName);

  return sanitizedFileName.toLowerCase().endsWith(".pdf")
    ? sanitizedFileName
    : `${sanitizedFileName}.pdf`;
}

export function saveBlobAsFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
