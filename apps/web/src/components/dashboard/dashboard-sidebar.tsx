"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { BarChart3, Building2, FileText, Lightbulb, Settings } from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
    roles: ["ORG_ADMIN", "ANALYST", "INSIGHT_REVIEWER", "STRATEGY_MANAGER", "VIEWER"],
  },
  {
    title: "Doanh nghiệp",
    href: "/dashboard/businesses",
    icon: Building2,
    roles: ["ORG_ADMIN", "ANALYST", "INSIGHT_REVIEWER", "STRATEGY_MANAGER", "VIEWER"],
  },
  {
    title: "Đợt phân tích",
    href: "/dashboard/sessions",
    icon: FileText,
    roles: ["ORG_ADMIN", "ANALYST", "INSIGHT_REVIEWER", "STRATEGY_MANAGER", "VIEWER"],
  },
  {
    title: "Insights",
    href: "/dashboard/insights",
    icon: Lightbulb,
    roles: ["ORG_ADMIN", "INSIGHT_REVIEWER", "STRATEGY_MANAGER"],
  },
  {
    title: "Cài đặt",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["ORG_ADMIN"],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { auth } = useAuth();

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(auth?.role || "VIEWER"),
  );

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col">
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold">S</span>
          </div>
          <span className="text-lg font-semibold text-foreground">Seedsight</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <div className="text-xs text-muted-foreground">Đã đăng nhập</div>
        <div className="text-sm font-medium text-foreground truncate">
          {auth?.fullName || auth?.email || auth?.userId}
        </div>
        <div className="text-xs text-muted-foreground">{auth?.role}</div>
      </div>
    </aside>
  );
}
