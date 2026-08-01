import { Sidebar } from "@/components/shared/sidebar";
import { Navbar } from "@/components/shared/navbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <Sidebar />
      <div className="lg:pl-64">
        <Navbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
