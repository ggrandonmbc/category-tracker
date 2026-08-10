import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Layers,
  Store,
  LayoutGrid,
  TrendingUp,
  Sparkles,
  Bell,
  BookOpen,
  MessageSquare,
} from "lucide-react";

export type Modo = "compras" | "category";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  hint?: string;
  /** En qué modo(s) del toggle superior aparece este item. Default: ambos. */
  modos?: Modo[];
  /** Href alternativo cuando el modo activo es "compras" (ej. deep-link a otra pestaña). */
  hrefCompras?: string;
  /** Si se define, solo se muestra a usuarios con ese rol. */
  roles?: Array<"admin" | "analyst">;
};

export type NavGroup = {
  label?: string;
  items: NavItem[];
};

const AMBOS: Modo[] = ["compras", "category"];

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Análisis",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, modos: AMBOS },
      { label: "SKUs", href: "/skus", icon: Package, hint: "~8.000 SKUs", modos: ["category"] },
      { label: "Categorías", href: "/categorias", icon: Layers, modos: ["category"] },
      { label: "Tiendas", href: "/tiendas", icon: Store, modos: ["category"] },
    ],
  },
  {
    label: "Acción",
    items: [
      { label: "Planogramas", href: "/planogramas", icon: LayoutGrid, modos: AMBOS },
      {
        label: "Optimización",
        href: "/optimizacion?tab=cuadrantes",
        hrefCompras: "/optimizacion?tab=cuando-comprar",
        icon: Sparkles,
        hint: "compras, espacio y más",
        modos: AMBOS,
      },
      { label: "Tendencias", href: "/tendencias", icon: TrendingUp, modos: ["category"] },
      { label: "Alertas", href: "/alertas", icon: Bell, modos: AMBOS },
    ],
  },
  {
    label: "Ayuda",
    items: [
      { label: "Manual & Indicadores", href: "/manual", icon: BookOpen, modos: AMBOS },
      { label: "Feedback", href: "/feedback", icon: MessageSquare, modos: AMBOS, roles: ["admin"] },
    ],
  },
];
