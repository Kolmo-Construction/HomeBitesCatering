// src/App.tsx
import React, { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Router } from "wouter";
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
import Settings from "@/pages/settings";
import RawLeadsPage from "@/pages/rawLeadsPage";
import RawLeadFormPage from "@/pages/rawLeadFormPage";
import RawLeadDetailPage from "@/pages/rawLeadDetailPage";
// Form Builder pages
import QuestionLibraryManager from "@/pages/QuestionLibraryManager";
import QuestionLibraryEdit from "@/pages/QuestionLibraryEdit";
import FormManager from "@/pages/FormManager";
import FormEditor from "@/pages/FormEditor";
// Calculator Test
import CalculatorTest from "@/pages/CalculatorTest";

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

  // If user is not logged in, show Login
  if (!user) {
    return (
        <div className="min-h-screen bg-gray-50">
            <Toaster />
            <Login />
        </div>
    );
  }

  // User is logged in, show admin/dashboard layout
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
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
          <Route path="/menu-items" component={MenuItems} />
          <Route path="/menu-items/new" component={MenuItems} />
          <Route path="/menu-items/:id" component={MenuItems} />
          <Route path="/menu-items/:id/edit" component={MenuItems} />
          <Route path="/menus" component={Menus} />
          <Route path="/menus/new" component={Menus} />
          <Route path="/menus/:id" component={Menus} />
          <Route path="/menus/:id/edit" component={Menus} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/settings" component={Settings} />
          <Route path="/raw-leads" component={RawLeadsPage} />
          <Route path="/raw-leads/new" component={RawLeadFormPage} />
          <Route path="/raw-leads/:id" component={RawLeadDetailPage} />
          <Route path="/admin/form-builder/question-library" component={QuestionLibraryManager} />
          <Route path="/admin/form-builder/question-library/new" component={QuestionLibraryEdit} />
          <Route path="/admin/form-builder/question-library/:id/edit" component={QuestionLibraryEdit} />
          <Route path="/admin/form-builder/forms" component={FormManager} />
          <Route path="/admin/form-builder/forms/:formId/edit" component={FormEditor} />
          <Route path="/calculator-test" component={CalculatorTest} />

          {/* Fallback Route for authenticated users */}
          <Route>
            <Dashboard />
          </Route>
        </Switch>
      </Layout>
    </div>
  );
}

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
            <AppContent />
          </Suspense>
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;