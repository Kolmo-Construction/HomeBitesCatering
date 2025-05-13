import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "./lib/queryClient";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/dashboard";
import Leads from "@/pages/leads";
import MenuItems from "@/pages/menu-items";
import Menus from "@/pages/menus";
import Estimates from "@/pages/estimates";
import Clients from "@/pages/clients";
import Calendar from "@/pages/calendar";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import ClientPortal from "@/pages/client-portal";
import { useAuth } from "@/hooks/use-auth";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // For non-authenticated users, show the login screen
  if (!user) {
    return (
      <Switch>
        <Route path="/client/:token" component={ClientPortal} />
        <Route path="/:rest*" component={Login} />
      </Switch>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/leads" component={Leads} />
        <Route path="/clients" component={Clients} />
        <Route path="/menu-items" component={MenuItems} />
        <Route path="/menus" component={Menus} />
        <Route path="/estimates" component={Estimates} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
