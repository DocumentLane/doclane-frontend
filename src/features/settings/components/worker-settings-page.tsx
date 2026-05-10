import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMeQuery } from "@/features/auth/queries/auth.queries";
import {
  useUpdateWorkerSettingsMutation,
  useWorkerSettingsQuery,
} from "../queries/worker-settings.queries";
import type { WorkerSettings } from "../types/worker-settings.types";

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WorkerSettingsPage() {
  const meQuery = useMeQuery();
  const settingsQuery = useWorkerSettingsQuery();
  const updateMutation = useUpdateWorkerSettingsMutation();
  const settings = settingsQuery.data;
  const isAdmin = meQuery.data?.role === "ADMIN";

  return (
    <main className="flex w-full flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Worker Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View worker/OCR runtime settings and update.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Runtime OCR settings</CardTitle>
          <CardDescription>
            Saved settings apply to future OCR work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settings ? (
            <WorkerSettingsForm
              key={`${settings.id}-${settings.updatedAt}`}
              settings={settings}
              isAdmin={isAdmin}
              isLoadError={settingsQuery.isError}
              isSaveError={updateMutation.isError}
              isSaveSuccess={updateMutation.isSuccess}
              isSaving={updateMutation.isPending}
              onSubmit={(input) => updateMutation.mutate(input)}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {settingsQuery.isError
                ? "Settings could not be loaded."
                : "Loading settings."}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

interface WorkerSettingsFormProps {
  settings: WorkerSettings;
  isAdmin: boolean;
  isLoadError: boolean;
  isSaveError: boolean;
  isSaveSuccess: boolean;
  isSaving: boolean;
  onSubmit: (input: {
    ocrLanguage: string;
    ocrDpi: number;
    ocrPsm: number;
    ocrPdfOutputEnabled: boolean;
  }) => void;
}

function WorkerSettingsForm({
  settings,
  isAdmin,
  isLoadError,
  isSaveError,
  isSaveSuccess,
  isSaving,
  onSubmit,
}: WorkerSettingsFormProps) {
  const [formState, setFormState] = useState({
    ocrLanguage: settings.ocrLanguage,
    ocrDpi: String(settings.ocrDpi),
    ocrPsm: String(settings.ocrPsm),
    ocrPdfOutputEnabled: settings.ocrPdfOutputEnabled,
  });
  const isFormDisabled = !isAdmin || isSaving;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAdmin) {
      return;
    }

    onSubmit({
      ocrLanguage: formState.ocrLanguage.trim(),
      ocrDpi: Number(formState.ocrDpi),
      ocrPsm: Number(formState.ocrPsm),
      ocrPdfOutputEnabled: formState.ocrPdfOutputEnabled,
    });
  };

  const handleReset = () => {
    setFormState({
      ocrLanguage: settings.ocrLanguage,
      ocrDpi: String(settings.ocrDpi),
      ocrPsm: String(settings.ocrPsm),
      ocrPdfOutputEnabled: settings.ocrPdfOutputEnabled,
    });
  };

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="ocr-language">OCR language</Label>
          <Input
            id="ocr-language"
            value={formState.ocrLanguage}
            disabled={isFormDisabled}
            placeholder="eng"
            onChange={(event) =>
              setFormState((value) => ({
                ...value,
                ocrLanguage: event.target.value,
              }))
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ocr-dpi">OCR DPI</Label>
          <Input
            id="ocr-dpi"
            type="number"
            min={1}
            value={formState.ocrDpi}
            disabled={isFormDisabled}
            onChange={(event) =>
              setFormState((value) => ({
                ...value,
                ocrDpi: event.target.value,
              }))
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ocr-psm">OCR PSM</Label>
          <Input
            id="ocr-psm"
            type="number"
            min={0}
            max={13}
            value={formState.ocrPsm}
            disabled={isFormDisabled}
            onChange={(event) =>
              setFormState((value) => ({
                ...value,
                ocrPsm: event.target.value,
              }))
            }
          />
        </div>
      </div>

      <Label
        htmlFor="ocr-pdf-output"
        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
      >
        <input
          id="ocr-pdf-output"
          type="checkbox"
          className="mt-0.5 size-4 accent-primary"
          checked={formState.ocrPdfOutputEnabled}
          disabled={isFormDisabled}
          onChange={(event) =>
            setFormState((value) => ({
              ...value,
              ocrPdfOutputEnabled: event.target.checked,
            }))
          }
        />
        <span className="grid gap-1">
          <span className="text-sm font-medium">OCR PDF output</span>
          <span className="text-sm font-normal text-muted-foreground">
            Generate searchable PDF output after OCR processing.
          </span>
        </span>
      </Label>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="text-sm text-muted-foreground">
          <p>Last updated: {formatDateTime(settings.updatedAt)}</p>
          {!isAdmin ? (
            <p className="mt-1 text-destructive">
              You do not have permission to change these settings.
            </p>
          ) : null}
          {isLoadError ? (
            <p className="mt-1 text-destructive">
              Settings could not be loaded.
            </p>
          ) : null}
          {isSaveError ? (
            <p className="mt-1 text-destructive">
              Settings could not be saved.
            </p>
          ) : null}
          {isSaveSuccess ? (
            <p className="mt-1 text-muted-foreground">Settings saved.</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={handleReset}
          >
            Revert
          </Button>
          <Button type="submit" disabled={isFormDisabled}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}
