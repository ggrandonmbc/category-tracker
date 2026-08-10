"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShoppingCart, LayoutGrid as CategoryIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Brand } from "./Brand";
import { NAV_GROUPS, type Modo } from "./nav-config";
import { NotificationBell } from "./NotificationBell";

const MODO_STORAGE_KEY = "catman_modo";

export function NavSidebar({
  user,
  onNavigate,
}: {
  user: { nombre: string; email: string; rol?: "admin" | "analyst" };
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [modo, setModo] = useState<Modo>("compras");

  useEffect(() => {
    const saved = window.localStorage.getItem(MODO_STORAGE_KEY);
    if (saved === "compras" || saved === "category") setModo(saved);
  }, []);

  function handleModoChange(next: Modo) {
    setModo(next);
    window.localStorage.setItem(MODO_STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent("catman-modo-change", { detail: next }));
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
        <Brand variant="dark" />
        <NotificationBell />
      </div>

      {/* Toggle Compras / Category Management */}
      <div className="px-3 pt-3">
        <div className="flex rounded-lg bg-sidebar-accent/40 p-0.5">
          <button
            onClick={() => handleModoChange("compras")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              modo === "compras"
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
            )}
          >
            <ShoppingCart className="size-3.5" />
            Compras
          </button>
          <button
            onClick={() => handleModoChange("category")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              modo === "category"
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
            )}
          >
            <CategoryIcon className="size-3.5" />
            Category Mgmt
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_GROUPS.map((group, gi) => {
          const items = group.items.filter(item =>
            (item.modos ?? ["compras", "category"]).includes(modo) &&
            (!item.roles || item.roles.includes(user.rol ?? "analyst"))
          );
          if (items.length === 0) return null;
          return (
            <div key={gi} className="mb-2">
              {group.label && (
                <div className="px-5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">
                  {group.label}
                </div>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const href = modo === "compras" && item.hrefCompras ? item.hrefCompras : item.href;
                const hrefPath = href.split("?")[0];
                const active =
                  pathname === hrefPath ||
                  (hrefPath !== "/" && pathname?.startsWith(hrefPath + "/"));
                return (
                  <Link
                    key={item.href}
                    href={href}
                    onClick={onNavigate}
                    className={cn(
                      "group mx-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      active &&
                        "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.hint && !active && (
                      <span className="text-[10px] text-sidebar-foreground/40">
                        {item.hint}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3">
          <div className="flex items-center gap-1.5">
            <div className="text-sm font-medium text-sidebar-foreground">
              {user.nombre}
            </div>
            {user.rol && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                  user.rol === "admin"
                    ? "bg-sidebar-primary/20 text-sidebar-primary"
                    : "bg-sidebar-accent text-sidebar-foreground/60"
                )}
              >
                {user.rol === "admin" ? "Admin" : "Analyst"}
              </span>
            )}
          </div>
          <div className="truncate text-xs text-sidebar-foreground/60">
            {user.email}
          </div>
        </div>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
