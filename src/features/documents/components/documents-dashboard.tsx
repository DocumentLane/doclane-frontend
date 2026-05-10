import { UploadIcon } from "lucide-react";
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
import { DocumentList } from "./document-list";
import { DocumentUploadPanel } from "./document-upload-panel";

export function DocumentsDashboard() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <main className="flex w-full flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        </div>
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
            <DocumentUploadPanel />
          </DialogContent>
        </Dialog>
      </div>
      <DocumentList />
    </main>
  );
}
