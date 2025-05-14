import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Leads from "@/pages/leads";
import Clients from "@/pages/clients";
import Estimates from "@/pages/estimates";
import MenuItems from "@/pages/menu-items";
import Menus from "@/pages/menus";
import Layout from "@/components/layout/Layout";

function App() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <Toaster />
        
        {!user ? (
          <Login onLoginSuccess={(userData) => setUser(userData)} />
        ) : (
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/leads" component={Leads} />
              <Route path="/leads/new" component={Leads} />
              <Route path="/leads/:id" component={Leads} />
              <Route path="/leads/:id/edit" component={Leads} />
              <Route path="/clients" component={Clients} />
              <Route path="/clients/new" component={Clients} />
              <Route path="/clients/:id" component={Clients} />
              <Route path="/clients/:id/edit" component={Clients} />
              <Route path="/estimates" component={Estimates} />
              <Route path="/menu-items" component={MenuItems} />
              <Route path="/menu-items/new" component={MenuItems} />
              <Route path="/menu-items/:id" component={MenuItems} />
              <Route path="/menu-items/:id/edit" component={MenuItems} />
              <Route path="/menus" component={Menus} />
              <Route path="/menus/new" component={Menus} />
              <Route path="/menus/:id" component={Menus} />
              <Route path="/menus/:id/edit" component={Menus} />
              <Route>
                <Dashboard />
              </Route>
            </Switch>
          </Layout>
        )}
      </div>
    </QueryClientProvider>
  );
}

export default App;
