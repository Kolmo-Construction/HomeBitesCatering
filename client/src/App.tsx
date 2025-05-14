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
import Calendar from "@/pages/calendar";
import Layout from "@/components/layout/Layout";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";

function AppContent() {
  const { user, loading } = useAuthContext();
  
  if (loading) {
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
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      
      {!user ? (
        <Login />
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
            <Route path="/estimates/new" component={Estimates} />
            <Route path="/estimates/:id/view" component={Estimates} />
            <Route path="/estimates/:id/edit" component={Estimates} />
            <Route path="/menu-items" component={MenuItems} />
            <Route path="/menu-items/new" component={MenuItems} />
            <Route path="/menu-items/:id" component={MenuItems} />
            <Route path="/menu-items/:id/edit" component={MenuItems} />
            <Route path="/menus" component={Menus} />
            <Route path="/menus/new" component={Menus} />
            <Route path="/menus/:id" component={Menus} />
            <Route path="/menus/:id/edit" component={Menus} />
            <Route path="/calendar" component={Calendar} />
            <Route>
              <Dashboard />
            </Route>
          </Switch>
        </Layout>
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
