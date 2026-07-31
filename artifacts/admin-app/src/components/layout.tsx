import React from "react";
import { Link, useLocation } from "wouter";
import { Activity, Bell, Building2, LayoutDashboard, LogOut, Tags, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { AlertsBell } from "@/components/alerts-bell";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hospitals", label: "Hospitals", icon: Building2 },
  { href: "/users", label: "Users", icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/audit-logs", label: "Audit Logs", icon: Activity },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { adminName, logout } = useAdminAuth();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/30 md:flex-row">
      <aside className="hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Activity className="h-5 w-5" />
            <span>Blood Bank</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-1 px-2">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground" : "text-sidebar-foreground/70"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto border-t p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{adminName || "Admin"}</span>
              <span className="text-xs text-muted-foreground">Administrator</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertsBell />
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
                <LogOut className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Button>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6 md:hidden">
           <div className="flex items-center gap-2 font-semibold text-primary">
            <Activity className="h-5 w-5" />
            <span>Admin</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <AlertsBell />
            <span className="text-sm font-medium">{adminName}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
