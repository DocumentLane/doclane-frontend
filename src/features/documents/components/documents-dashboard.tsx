import { UploadIcon } from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMeQuery } from "@/features/auth/queries/auth.queries";
import { DocumentList } from "./document-list";
import { DocumentUploadPanel } from "./document-upload-panel";

export function DocumentsDashboard() {
  const router = useRouter();
  const meQuery = useMeQuery();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const scope = router.query.view === "all" ? "all" : "library";
  const activeFolderId = scope === "library" ? selectedFolderId : null;
  const canUpload = meQuery.data?.role === "ADMIN";

  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId);

    if (scope === "all") {
      void router.push("/", undefined, { shallow: true });
    }
  };

  return (
    <main className="flex w-full flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        </div>
        {canUpload ? (
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger render={<Button />}>
              <UploadIcon />
              Upload
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100svh-2rem)] overflow-hidden sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload PDF</DialogTitle>
                <DialogDescription>
                  After upload, the document appears in the list when server
                  processing finishes and the file is ready.
                </DialogDescription>
              </DialogHeader>
              <DocumentUploadPanel folderId={activeFolderId} />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
      <DocumentList
        folderId={activeFolderId}
        scope={scope}
        canCreateFolder={canUpload}
        onSelectFolder={handleSelectFolder}
      />
    </main>
  );
}
