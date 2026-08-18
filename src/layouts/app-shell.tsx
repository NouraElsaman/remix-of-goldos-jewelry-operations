import { useEffect, useState, type ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { CommandPalette } from "./command-palette";
import { Topbar } from "./topbar";

/** Responsive application shell shared by every authenticated screen. */
export function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#F8F9FA]">
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-[#F8F9FA]">
          <Topbar onOpenCommandPalette={() => setPaletteOpen(true)} />
          <main className="mx-auto w-full max-w-[var(--content-max)] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
            {children}
          </main>
        </SidebarInset>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </SidebarProvider>
  );
}
