import {
  BriefcaseBusinessIcon,
  ChevronUpIcon,
  FileTextIcon,
  LogOutIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import type { AuthenticatedUser } from "@/features/auth/types/auth.types";
import { useLogout } from "@/features/auth/queries/auth.queries";
import { SidebarJobStatus } from "@/features/jobs/components/sidebar-job-status";

interface AppShellProps {
  user: AuthenticatedUser;
  children: ReactNode;
}

interface AppShellLayoutProps extends AppShellProps {
  pageTitle: string;
}

const navigationSections = [
  {
    title: "Workspace",
    items: [
      {
        title: "Documents",
        href: "/",
        icon: FileTextIcon,
        enabled: true,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Jobs",
        href: "/jobs",
        icon: BriefcaseBusinessIcon,
        enabled: true,
      },
      {
        title: "Worker Settings",
        href: "/worker-settings",
        icon: SlidersHorizontalIcon,
        enabled: true,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: SettingsIcon,
        enabled: true,
      },
    ],
  },
];

function getPageTitle(pathname: string) {
  return (
    navigationSections
      .flatMap((section) => section.items)
      .find((item) => item.href === pathname)?.title ?? "Doclane"
  );
}

export function AppShell({ user, children }: AppShellProps) {
  const router = useRouter();
  const pageTitle = getPageTitle(router.pathname);

  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <AppShellLayout user={user} pageTitle={pageTitle}>
        {children}
      </AppShellLayout>
    </SidebarProvider>
  );
}

function AppShellLayout({ user, children, pageTitle }: AppShellLayoutProps) {
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const logout = useLogout();

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = () => {
    closeMobileSidebar();
    logout();
    void router.replace("/");
  };

  return (
    <>
      <Sidebar variant="inset">
        <SidebarHeader>
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">Doclane</p>
            <p className="text-xs text-sidebar-foreground/70">
              PDF workspace
            </p>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {navigationSections.map((section) => (
            <SidebarGroup key={section.title}>
              <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        render={
                          item.enabled ? <Link href={item.href} /> : undefined
                        }
                        onClick={closeMobileSidebar}
                        disabled={!item.enabled}
                        isActive={item.enabled && router.pathname === item.href}
                        tooltip={item.title}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <div className="space-y-3 p-2">
            <SidebarJobStatus onNavigate={closeMobileSidebar} />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-hidden data-popup-open:bg-sidebar-accent"
                    aria-label="Open profile menu"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {user.displayName ?? user.email ?? "User"}
                      </span>
                      <span className="block truncate text-xs text-sidebar-foreground/70">
                        {user.role}
                      </span>
                    </span>
                    <ChevronUpIcon className="size-4 shrink-0 text-sidebar-foreground/70" />
                  </button>
                }
              />
              <DropdownMenuContent side="top" align="start" className="w-52">
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  <LogOutIcon />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="h-4 w-px bg-border" />
          <h1 className="min-w-0 truncate text-sm font-semibold">{pageTitle}</h1>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </SidebarInset>
    </>
  );
}
