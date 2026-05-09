import { CheckIcon, LaptopIcon, MoonIcon, RotateCcwIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useMeQuery } from "@/features/auth/queries/auth.queries";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "../lib/user-preferences";
import type { ReaderViewMode, ThemeMode } from "../types/user-preferences.types";

const readerViewModeOptions: Array<{
  value: ReaderViewMode;
  label: string;
  description: string;
}> = [
  {
    value: "continuous-scroll",
    label: "Continuous Scroll",
    description: "Read long documents in one vertical flow.",
  },
  {
    value: "single-page",
    label: "Single Page",
    description: "Move to the next page one page at a time.",
  },
  {
    value: "two-pages",
    label: "Two Pages",
    description: "Use a book-like spread on wider screens.",
  },
];

const themeModeOptions: Array<{
  value: ThemeMode;
  label: string;
  icon: typeof LaptopIcon;
}> = [
  {
    value: "system",
    label: "System",
    icon: LaptopIcon,
  },
  {
    value: "light",
    label: "Light",
    icon: SunIcon,
  },
  {
    value: "dark",
    label: "Dark",
    icon: MoonIcon,
  },
];

export function SettingsPage() {
  const meQuery = useMeQuery();
  const { preferences, updatePreferences, resetPreferences } =
    useUserPreferences();

  return (
    <main className="flex w-full flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage document reader defaults and account information.
          </p>
        </div>
        <Button variant="outline" onClick={resetPreferences}>
          <RotateCcwIcon />
          Restore defaults
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Reader Defaults</CardTitle>
            <CardDescription>
              Choose the screen state used when opening a new document.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-medium">Theme</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select the app color mode.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {themeModeOptions.map((option) => {
                  const isSelected = preferences.themeMode === option.value;
                  const Icon = option.icon;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "flex h-20 items-center justify-between rounded-lg border bg-background p-3 text-left transition hover:bg-muted/70",
                        isSelected
                          ? "border-primary ring-2 ring-ring/40"
                          : "border-border",
                      )}
                      onClick={() =>
                        updatePreferences({
                          themeMode: option.value,
                        })
                      }
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {option.label}
                        </span>
                      </span>
                      {isSelected ? <CheckIcon className="size-4" /> : null}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-medium">Default View</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select the page layout used when a PDF opens.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {readerViewModeOptions.map((option) => {
                  const isSelected =
                    preferences.readerDefaultViewMode === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "flex min-h-28 flex-col justify-between rounded-lg border bg-background p-3 text-left transition hover:bg-muted/70",
                        isSelected
                          ? "border-primary ring-2 ring-ring/40"
                          : "border-border",
                      )}
                      onClick={() =>
                        updatePreferences({
                          readerDefaultViewMode: option.value,
                        })
                      }
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {option.label}
                        </span>
                        {isSelected ? <CheckIcon className="size-4" /> : null}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-3">
              <PreferenceCheckbox
                id="reader-open-thumbnails"
                checked={preferences.readerOpenThumbnailsByDefault}
                title="Show outline and thumbnails by default"
                description="When off, documents open with the left thumbnail panel hidden."
                onChange={(checked) =>
                  updatePreferences({
                    readerOpenThumbnailsByDefault: checked,
                  })
                }
              />
              <PreferenceCheckbox
                id="reader-show-toolbar"
                checked={preferences.readerShowToolbarByDefault}
                title="Show the top toolbar by default"
                description="When off, documents open with only the round button in the upper right."
                onChange={(checked) =>
                  updatePreferences({
                    readerShowToolbarByDefault: checked,
                  })
                }
              />
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Current signed-in user information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <AccountField
              label="Name"
              value={meQuery.data?.displayName ?? "Not set"}
            />
            <AccountField
              label="Email"
              value={meQuery.data?.email ?? "Not set"}
            />
            <AccountField label="Role" value={meQuery.data?.role ?? "-"} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

interface PreferenceCheckboxProps {
  id: string;
  checked: boolean;
  title: string;
  description: string;
  onChange: (checked: boolean) => void;
}

function PreferenceCheckbox({
  id,
  checked,
  title,
  description,
  onChange,
}: PreferenceCheckboxProps) {
  return (
    <Label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 accent-primary"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="grid gap-1">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-sm font-normal text-muted-foreground">
          {description}
        </span>
      </span>
    </Label>
  );
}

function AccountField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}
