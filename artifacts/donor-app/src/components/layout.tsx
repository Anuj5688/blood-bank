import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Activity, Bell, Moon, Sun, User as UserIcon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

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
  const { isAuthenticated, role, userName, logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="border-b bg-white dark:bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Activity className="w-6 h-6" />
            <span>Blood Bank</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
              Find Blood
            </Link>
            <Link href="/notifications" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
              <Bell className="w-4 h-4" />
              Alerts
            </Link>
            
            <ThemeToggle />
            
            {!isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setLocation("/login")}>
                  Log in
                </Button>
                <Button variant="default" onClick={() => setLocation("/register")}>
                  Register
                </Button>
              </div>
            ) : (
              <>
                {role === "user" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <UserIcon className="w-4 h-4" />
                        {userName || "Profile"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setLocation("/profile")}>
                        My Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocation("/my-requests")}>
                        My Blood Requests
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        logout();
                        setLocation("/");
                      }}>
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 bg-gray-50/50 dark:bg-background">
        {children}
      </main>
    </div>
  );
}

// Used by account-only pages (e.g. donor profile) that require the user to
// be signed in. Reuses the same top-nav chrome as PublicLayout — donor-app
// has no sidebar dashboard, unlike hospital-app.
export function ProtectedLayout({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { isAuthenticated, role } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated || (requiredRole && role !== requiredRole)) {
    setLocation("/login");
    return null;
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">{children}</div>
    </PublicLayout>
  );
}

