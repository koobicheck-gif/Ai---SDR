import { Sidebar } from "@/components/dashboard/Sidebar";
import { AuthGate } from "@/components/AuthGate";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>
      </div>
    </AuthGate>
  );
}
