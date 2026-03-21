import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BackupTrigger } from "@/components/layout/backup-trigger";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-10 items-center px-4 md:hidden">
          <SidebarTrigger />
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        <BackupTrigger />
      </SidebarInset>
    </SidebarProvider>
  );
}
