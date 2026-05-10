import { StickyNoteIcon, XIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "@/components/ui/button";
import type { DocumentNote } from "../types/document.types";

interface PdfNotesPanelProps {
  documentId: string;
  currentPage: number;
  notes: DocumentNote[];
  isReady: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  width: number;
  onWidthChange: (width: number) => void;
  onClose: () => void;
  onSaveNote: (input: {
    documentId: string;
    pageNumber: number;
    content: string;
  }) => void;
  onDeleteNote: (input: { documentId: string; pageNumber: number }) => void;
}

const MIN_PANEL_WIDTH = 320;
const MAX_PANEL_WIDTH = 720;
const AUTOSAVE_DELAY_MS = 900;

function clampPanelWidth(width: number) {
  return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, width));
}

interface LegacyTextNode {
  text?: string;
}

interface LegacyStructuredBlock {
  type?: string;
  content?: string | LegacyTextNode[];
  children?: LegacyStructuredBlock[];
}

function readLegacyInlineContent(content: LegacyStructuredBlock["content"]) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((item) => item.text ?? "").join("");
  }

  return "";
}

function flattenLegacyStructuredBlock(block: LegacyStructuredBlock): string[] {
  const ownContent = readLegacyInlineContent(block.content);
  const childContent = block.children?.flatMap(flattenLegacyStructuredBlock) ?? [];

  return ownContent ? [ownContent, ...childContent] : childContent;
}

function normalizeNoteContent(content: string) {
  const trimmedContent = content.trim();

  if (!trimmedContent.startsWith("[")) {
    return content;
  }

  try {
    const parsedContent = JSON.parse(trimmedContent) as unknown;

    if (!Array.isArray(parsedContent)) {
      return content;
    }

    const normalizedContent = parsedContent
      .flatMap((block) =>
        flattenLegacyStructuredBlock(block as LegacyStructuredBlock),
      )
      .join("\n")
      .trim();

    return normalizedContent || "";
  } catch {
    return content;
  }
}

export function PdfNotesPanel({
  documentId,
  currentPage,
  notes,
  isReady,
  isSaving,
  isDeleting,
  width,
  onWidthChange,
  onClose,
  onSaveNote,
  onDeleteNote,
}: PdfNotesPanelProps) {
  const draftsByPageRef = useRef<Record<number, string>>({});
  const lastSubmittedDraftByPageRef = useRef<Record<number, string>>({});
  const notesByPageRef = useRef<Map<number, DocumentNote>>(new Map());
  const normalizedNotesByPageRef = useRef<Map<number, string>>(new Map());
  const [draftsByPage, setDraftsByPage] = useState<Record<number, string>>({});
  const notesByPage = useMemo(
    () => new Map(notes.map((note) => [note.pageNumber, note])),
    [notes],
  );
  const normalizedNotesByPage = useMemo(
    () =>
      new Map(
        notes.map((note) => [note.pageNumber, normalizeNoteContent(note.content)]),
      ),
    [notes],
  );
  const normalizedServerContent = normalizedNotesByPage.get(currentPage) ?? "";
  const draftContent = draftsByPage[currentPage] ?? normalizedServerContent;
  const hasUnsavedChanges = draftContent !== normalizedServerContent;

  const submitDraft = useCallback(
    (pageNumber: number, draft: string) => {
      const trimmedDraft = draft.trim();

      if (lastSubmittedDraftByPageRef.current[pageNumber] === trimmedDraft) {
        return;
      }

      lastSubmittedDraftByPageRef.current = {
        ...lastSubmittedDraftByPageRef.current,
        [pageNumber]: trimmedDraft,
      };

      if (trimmedDraft.length > 0) {
        onSaveNote({
          documentId,
          pageNumber,
          content: trimmedDraft,
        });
        return;
      }

      if (notesByPageRef.current.has(pageNumber)) {
        onDeleteNote({ documentId, pageNumber });
      }
    },
    [documentId, onDeleteNote, onSaveNote],
  );

  useEffect(() => {
    draftsByPageRef.current = draftsByPage;
  }, [draftsByPage]);

  useEffect(() => {
    notesByPageRef.current = notesByPage;
    normalizedNotesByPageRef.current = normalizedNotesByPage;
  }, [notesByPage, normalizedNotesByPage]);

  useEffect(() => {
    return () => {
      const draft = draftsByPageRef.current[currentPage];

      if (draft === undefined) {
        return;
      }

      const normalizedContent =
        normalizedNotesByPageRef.current.get(currentPage) ?? "";

      if (draft === normalizedContent) {
        return;
      }

      submitDraft(currentPage, draft);
    };
  }, [currentPage, submitDraft]);

  useEffect(() => {
    if (!isReady || !hasUnsavedChanges || isSaving || isDeleting) {
      return;
    }

    const timeout = window.setTimeout(() => {
      submitDraft(currentPage, draftContent);
    }, AUTOSAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    currentPage,
    draftContent,
    hasUnsavedChanges,
    isDeleting,
    isReady,
    isSaving,
    submitDraft,
  ]);

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = width;

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      onWidthChange(clampPanelWidth(startWidth - (moveEvent.clientX - startX)));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <aside
      className="absolute inset-y-0 right-0 z-30 flex min-h-0 shrink-0 flex-col border-l bg-background shadow-xl md:relative md:shadow-none"
      style={{ width: `min(${width}px, 100vw)` }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize notes panel"
        className="absolute inset-y-0 left-0 z-10 w-2 -translate-x-1 cursor-col-resize"
        onPointerDown={handleResizeStart}
      />
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b bg-muted/30 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <StickyNoteIcon className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Page {currentPage}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isSaving ? (
            <span className="text-xs font-medium text-muted-foreground">
              Saving...
            </span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onClose}
            aria-label="Close notes panel"
          >
            <XIcon />
          </Button>
        </div>
      </div>
      <textarea
        value={draftContent}
        onChange={(event) =>
          setDraftsByPage((drafts) => ({
            ...drafts,
            [currentPage]: event.target.value,
          }))
        }
        disabled={!isReady || isDeleting}
        placeholder="Add a note for this page"
        className="min-h-0 flex-1 resize-none border-0 bg-background px-3 py-3 text-sm leading-7 outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </aside>
  );
}
