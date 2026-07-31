import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import RegisterHospital from "@/pages/register-hospital";

import DashboardInventory from "@/pages/dashboard/inventory";
import DashboardProfile from "@/pages/dashboard/profile";
import DashboardHistory from "@/pages/dashboard/history";
import DashboardCampNotifications from "@/pages/dashboard/camp-notifications";
import DashboardBloodRequests from "@/pages/dashboard/blood-requests";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/register-hospital" component={RegisterHospital} />

      <Route path="/dashboard" component={DashboardInventory} />
      <Route path="/dashboard/requests" component={DashboardBloodRequests} />
      <Route path="/dashboard/camps" component={DashboardCampNotifications} />
      <Route path="/dashboard/profile" component={DashboardProfile} />
      <Route path="/dashboard/history" component={DashboardHistory} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="pbc-hospital-ui-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
