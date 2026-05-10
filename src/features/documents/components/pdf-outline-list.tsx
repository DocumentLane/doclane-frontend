import { ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PdfOutlineItem } from "../hooks/use-pdf-outline";

interface PdfOutlineListProps {
  items: PdfOutlineItem[];
  currentPage: number;
  onPageChange: (pageNumber: number) => void;
}

function isOutlineBranchActive(item: PdfOutlineItem, currentPage: number): boolean {
  return (
    item.pageNumber === currentPage ||
    item.items.some((childItem) => isOutlineBranchActive(childItem, currentPage))
  );
}

function PdfOutlineListItem({
  item,
  currentPage,
  depth,
  onPageChange,
}: {
  item: PdfOutlineItem;
  currentPage: number;
  depth: number;
  onPageChange: (pageNumber: number) => void;
}) {
  const isActive = item.pageNumber === currentPage;
  const isBranchActive = !isActive && isOutlineBranchActive(item, currentPage);
  const canNavigate = item.pageNumber !== null || item.url !== null;
  const itemStyle = {
    paddingLeft: `${0.5 + Math.min(depth, 4) * 0.75}rem`,
  };
  const content = (
    <>
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
      {item.url ? <ExternalLinkIcon className="size-3 shrink-0" /> : null}
      {item.pageNumber ? (
        <span className="shrink-0 text-[0.7rem] tabular-nums opacity-70">
          {item.pageNumber}
        </span>
      ) : null}
    </>
  );

  return (
    <li>
      {item.url && !item.pageNumber ? (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "flex min-h-8 w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-xs transition hover:bg-muted hover:text-foreground",
            item.isBold && "font-semibold",
            item.isItalic && "italic",
          )}
          style={itemStyle}
        >
          {content}
        </a>
      ) : (
        <button
          type="button"
          disabled={!canNavigate}
          className={cn(
            "flex min-h-8 w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-xs transition disabled:cursor-default disabled:opacity-60",
            isActive
              ? "bg-primary text-primary-foreground"
              : isBranchActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            item.isBold && "font-semibold",
            item.isItalic && "italic",
          )}
          style={itemStyle}
          onClick={() => {
            if (item.pageNumber) {
              onPageChange(item.pageNumber);
            } else if (item.url) {
              window.open(item.url, "_blank", "noopener,noreferrer");
            }
          }}
        >
          {content}
        </button>
      )}
      {item.items.length > 0 ? (
        <ol className="mt-1 grid gap-1">
          {item.items.map((childItem) => (
            <PdfOutlineListItem
              key={childItem.id}
              item={childItem}
              currentPage={currentPage}
              depth={depth + 1}
              onPageChange={onPageChange}
            />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

export function PdfOutlineList({
  items,
  currentPage,
  onPageChange,
}: PdfOutlineListProps) {
  return (
    <ol className="grid gap-1">
      {items.map((item) => (
        <PdfOutlineListItem
          key={item.id}
          item={item}
          currentPage={currentPage}
          depth={0}
          onPageChange={onPageChange}
        />
      ))}
    </ol>
  );
}
