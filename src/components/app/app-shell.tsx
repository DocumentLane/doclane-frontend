import {
  BriefcaseBusinessIcon,
  ChevronUpIcon,
  FilesIcon,
  LibraryIcon,
  LogOutIcon,
  SettingsIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
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

interface NavigationItem {
  title: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
  adminOnly?: boolean;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
  adminOnly?: boolean;
}

const navigationSections: NavigationSection[] = [
  {
    title: "Workspace",
    items: [
      {
        title: "Library",
        href: "/",
        icon: LibraryIcon,
        enabled: true,
      },
      {
        title: "All documents",
        href: "/?view=all",
        icon: FilesIcon,
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
  {
    title: "Operations",
    adminOnly: true,
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
      {
        title: "Admin",
        href: "/admin",
        icon: ShieldIcon,
        enabled: true,
        adminOnly: true,
      },
    ],
  },
];

function getPageTitle(router: ReturnType<typeof useRouter>) {
  if (router.pathname === "/" && router.query.view === "all") {
    return "All documents";
  }

  return (
    navigationSections
      .flatMap((section) => section.items)
      .find((item) => item.href === router.pathname)?.title ?? "Doclane"
  );
}

function isNavigationItemActive(
  item: NavigationItem,
  router: ReturnType<typeof useRouter>,
) {
  if (item.href === "/") {
    return router.pathname === "/" && router.query.view !== "all";
  }

  if (item.href === "/?view=all") {
    return router.pathname === "/" && router.query.view === "all";
  }

  return router.pathname === item.href;
}

export function AppShell({ user, children }: AppShellProps) {
  const router = useRouter();
  const pageTitle = getPageTitle(router);

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
  const visibleNavigationSections = navigationSections.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.adminOnly || user.role === "ADMIN",
    ),
  })).filter(
    (section) =>
      (!section.adminOnly || user.role === "ADMIN") && section.items.length > 0,
  );

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
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Image
              src="/favicon.ico"
              alt=""
              aria-hidden="true"
              width={32}
              height={32}
              unoptimized
              className="size-8 shrink-0 rounded-md"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Doclane</p>
              <p className="truncate text-xs text-sidebar-foreground/70">
                PDF workspace
              </p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {visibleNavigationSections.map((section) => (
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
                        isActive={item.enabled && isNavigationItemActive(item, router)}
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
              <DropdownMenuContent
                side="top"
                align="start"
                positionMethod="fixed"
                collisionAvoidance={{
                  side: "none",
                  align: "shift",
                  fallbackAxisSide: "none",
                }}
                className="w-52 data-closed:animate-none data-open:animate-none"
              >
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
          <h1 className="min-w-0 truncate text-sm font-semibold">
            {pageTitle}
          </h1>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </SidebarInset>
    </>
  );
}
