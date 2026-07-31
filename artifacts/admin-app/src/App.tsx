import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminAuthProvider, useAdminAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

import { Hospitals } from "@/pages/hospitals";
import { HospitalNew } from "@/pages/hospital-new";
import { HospitalDetail } from "@/pages/hospital-detail";
import { Users } from "@/pages/users";
import { UserDetail } from "@/pages/user-detail";
import { Notifications } from "@/pages/notifications";
import { Categories } from "@/pages/categories";
import { AuditLogs } from "@/pages/audit-logs";
import { Login } from "@/pages/login";
import { Dashboard } from "@/pages/dashboard";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>; [key: string]: unknown }) {
  const { isAuthenticated } = useAdminAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    setLocation("/login", { replace: true });
    return null;
  }

  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/hospitals/new">
        {() => <ProtectedRoute component={HospitalNew} />}
      </Route>
      <Route path="/hospitals/:id">
        {(params) => <ProtectedRoute component={HospitalDetail} id={Number(params.id)} />}
      </Route>
      <Route path="/hospitals">
        {() => <ProtectedRoute component={Hospitals} />}
      </Route>
      <Route path="/users/:id">
        {(params) => <ProtectedRoute component={UserDetail} id={Number(params.id)} />}
      </Route>
      <Route path="/users">
        {() => <ProtectedRoute component={Users} />}
      </Route>
      <Route path="/notifications">
        {() => <ProtectedRoute component={Notifications} />}
      </Route>
      <Route path="/categories">
        {() => <ProtectedRoute component={Categories} />}
      </Route>
      <Route path="/audit-logs">
        {() => <ProtectedRoute component={AuditLogs} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AdminAuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AdminAuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
