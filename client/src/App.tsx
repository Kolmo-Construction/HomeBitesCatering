import { useState, useEffect, lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Opportunities from "@/pages/opportunities";
import Clients from "@/pages/clients";
import Estimates from "@/pages/estimates";
import MenuItems from "@/pages/menu-items";
import Menus from "@/pages/menus";
import Calendar from "@/pages/calendar";
import RawLeadsPage from "@/pages/rawLeadsPage";
import RawLeadFormPage from "@/pages/rawLeadFormPage";
import RawLeadDetailPage from "@/pages/rawLeadDetailPage";
import QuestionnaireBuilder from "@/pages/QuestionnaireBuilder";
import QuestionnaireDocumentation from "@/pages/QuestionnaireDocumentation";
import FormBuilderTester from "@/pages/FormBuilderTester";
import UnifiedFormBuilderDocs from "@/pages/UnifiedFormBuilderDocs";
import HomeBites2025Form from "@/examples/HomeBites2025Form";
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
            <Route path="/opportunities" component={Opportunities} />
            <Route path="/opportunities/new" component={Opportunities} />
            <Route path="/opportunities/:id" component={Opportunities} />
            <Route path="/opportunities/:id/edit" component={Opportunities} />
            <Route path="/clients" component={Clients} />
            <Route path="/clients/new" component={Clients} />
            <Route path="/clients/:id" component={Clients} />
            <Route path="/clients/:id/edit" component={Clients} />
            <Route path="/estimates" component={Estimates} />
            <Route path="/estimates/new" component={Estimates} />
            <Route path="/estimates/:id/view" component={Estimates} />
            <Route path="/estimates/:id/edit" component={Estimates} />
            <Route path="/questionnaire-builder" component={QuestionnaireBuilder} />
            <Route path="/questionnaire-docs" component={QuestionnaireDocumentation} />
            <Route path="/form-builder-tester" component={FormBuilderTester} />
            <Route path="/form-builder-docs" component={UnifiedFormBuilderDocs} />
            <Route path="/form-examples/home-bites" component={FormBuilderTester} />
            <Route path="/form-examples/home-bites-2025" component={HomeBites2025Form} />
            <Route path="/menu-items" component={MenuItems} />
            <Route path="/menu-items/new" component={MenuItems} />
            <Route path="/menu-items/:id" component={MenuItems} />
            <Route path="/menu-items/:id/edit" component={MenuItems} />
            <Route path="/menus" component={Menus} />
            <Route path="/menus/new" component={Menus} />
            <Route path="/menus/:id" component={Menus} />
            <Route path="/menus/:id/edit" component={Menus} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/raw-leads" component={RawLeadsPage} />
            <Route path="/raw-leads/new" component={RawLeadFormPage} />
            <Route path="/raw-leads/:id" component={RawLeadDetailPage} />
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
