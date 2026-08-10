import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/auth/role";
import { NavSidebar } from "@/components/layout/NavSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Brand } from "@/components/layout/Brand";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const rol = await getCurrentUserRole();

  const userInfo = {
    nombre:
      (user.user_metadata?.nombre as string | undefined) ??
      user.email?.split("@")[0] ??
      "Usuario",
    email: user.email ?? "",
    rol,
  };

  return (
    <div className="flex min-h-svh">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 lg:flex">
        <NavSidebar user={userInfo} />
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header mobile */}
        <header className="flex h-14 items-center gap-3 border-b bg-background px-4 lg:hidden">
          <MobileNav user={userInfo} />
          <Brand className="text-sm" />
        </header>

        <main className="flex-1 overflow-x-hidden bg-muted/20">{children}</main>
      </div>
      <FeedbackWidget />
    </div>
  );
}
