import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Droplet,
  Moon,
  Sun,
  LayoutGrid,
  HeartHandshake,
  CalendarHeart,
  History,
  UserCog,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="border-b bg-white dark:bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2.5 font-display font-bold text-lg text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Droplet className="w-4 h-4" fill="currentColor" strokeWidth={1.5} />
            </span>
            <span>Blood Bank <span className="text-muted-foreground font-medium">for Hospitals &amp; Blood Banks</span></span>
          </Link>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    logout();
                    setLocation("/login");
                  }}
                >
                  Log out
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => setLocation("/login")}>
                Log in
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 bg-background">
        {children}
      </main>
    </div>
  );
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inventory", icon: LayoutGrid, exact: true },
  { href: "/dashboard/requests", label: "Blood Requests", icon: HeartHandshake },
  { href: "/dashboard/camps", label: "Donation Camps", icon: CalendarHeart },
  { href: "/dashboard/history", label: "Update History", icon: History },
  { href: "/dashboard/profile", label: "Profile Settings", icon: UserCog },
];

export function ProtectedLayout({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { isAuthenticated, role, logout } = useAuth();
  const [location, setLocation] = useLocation();

  if (!isAuthenticated || (requiredRole && role !== requiredRole)) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      <aside className="w-full md:w-64 md:shrink-0 bg-sidebar text-sidebar-foreground flex flex-col md:h-[100dvh] md:sticky md:top-0">
        <div className="p-4 border-b border-sidebar-border flex justify-between items-center">
          <div>
            <Link href="/dashboard" className="flex items-center gap-2.5 font-display font-bold text-base text-sidebar-foreground">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
                <Droplet className="w-3.5 h-3.5" fill="currentColor" strokeWidth={1.5} />
              </span>
              <span>Blood Bank</span>
            </Link>
            <div className="mt-2 text-[11px] font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
              Facility Portal
            </div>
          </div>
          <ThemeToggle />
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? location === href : location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 text-sm rounded-md font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => {
              logout();
              setLocation("/login");
            }}
          >
            <LogOut className="w-4 h-4" />
            Log out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
