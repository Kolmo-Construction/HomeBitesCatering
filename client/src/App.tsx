// src/App.tsx
import React, { Suspense } from "react"; // Removed useState, useEffect, lazy as they weren't used in the modified version
import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Router, useLocation } from "wouter"; // Added Router and useLocation for path-based rendering
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient"; // Assuming this path is correct
import Login from "@/pages/login"; // Assuming this path is correct
import Dashboard from "@/pages/dashboard"; // Assuming this path is correct
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

// Import the new WeddingInquiryForm
import WeddingInquiryForm from "@/pages/wedding/WeddingInquiryForm";
// Import the EventTypeSelectionStep if you want a general landing page for event types
import EventTypeSelectionStep from "@/components/form-steps/EventTypeSelectionStep"; // Assuming this is now a shared component
import { eventTypes } from "@/data/event-types"; // For the EventTypeSelectionStep props
import { EventType } from "@/pages/wedding/types/weddingFormTypes"; // Get EventType for onSelectEventType

// Import the Dietary Demo page
import DietaryDemo from "@/pages/DietaryDemo";

import Layout from "@/components/layout/Layout"; // Assuming this path is correct
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext"; // Assuming this path is correct

// Component to handle public form routing logic
const PublicRoutes = () => {
  const [location] = useLocation(); // Use wouter's useLocation hook

  // Example: General inquiry landing page showing event type selection
  if (location === "/inquiry" || location === "/event-selection") {
    // This is a conceptual landing page. You'd pass a handler to navigate
    // to specific forms like /wedding-inquiry based on selection.
    const handleSelectEventType = (type: EventType) => {
        // For wouter, you might use navigate hook or window.location.href
        if (type === "Wedding") {
             // navigate("/wedding-inquiry"); // If using useNavigation hook from wouter
             window.location.href = "/wedding-inquiry";
        } else if (type === "Corporate") {
            // window.location.href = "/corporate-inquiry"; // For future corporate form
        }
        // Add other event types
    };
    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* You might want a simpler header for this page */}
            <div className="w-full bg-gradient-to-r from-gray-700 to-gray-800 text-white p-6 mb-8">
                <div className="container mx-auto text-center">
                <h1 className="text-4xl font-extrabold mb-3">Plan Your Event</h1>
                <p className="text-lg">Select the type of event you're planning.</p>
                </div>
            </div>
             <EventTypeSelectionStep
                onSelectEventType={handleSelectEventType}
                selectedEventType={null} // No pre-selection on this page
                // Ensure eventTypes data is correctly imported and passed if needed by the component
                // eventTypesData={eventTypes} // Assuming EventTypeSelectionStep takes this prop
            />
        </div>
    );
  }

  // Specific route for the Wedding Inquiry Form
  // The <Route> component from wouter will handle this in AppContent
  return null; // Fallback, routing is handled by <Route>
};


function AppContent() {
  const { user, loading } = useAuthContext();
  const [location] = useLocation(); // Get current location

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

  // Check if the current path is for any public-facing inquiry form
  // For this refactor, we are focusing on /wedding-inquiry
  const isWeddingInquiryPage = location === "/wedding-inquiry";
  // You can add more conditions here for other public forms like /corporate-inquiry, /event-selection etc.
  const isPublicFormPage = isWeddingInquiryPage || location === "/inquiry" || location === "/event-selection";


  if (isPublicFormPage && !user) { // Allow access to public forms even if not logged in
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster />
        <Switch>
          <Route path="/wedding-inquiry" component={WeddingInquiryForm} />
          {/* Route for the generic event selection page */}
          <Route path="/inquiry" component={PublicRoutes} />
          <Route path="/event-selection" component={PublicRoutes} />
          {/* Fallback for public routes if needed, or redirect */}
          <Route>
            <div className="flex items-center justify-center h-screen text-xl">404 - Page Not Found</div>
          </Route>
        </Switch>
      </div>
    );
  }

  // If user is not logged in and not accessing a public form, show Login
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
          <Route path="/dietary-demo" component={DietaryDemo} />

          {/* Public forms accessible even when logged in, if desired, or redirect from here */}
          <Route path="/wedding-inquiry" component={WeddingInquiryForm} />
          <Route path="/inquiry" component={PublicRoutes} />
          <Route path="/event-selection" component={PublicRoutes} />

          {/* Fallback Route for authenticated users */}
          <Route>
            <Dashboard /> {/* Or a 404 component within the Layout */}
          </Route>
        </Switch>
      </Layout>
    </div>
  );
}

function App() {
  return (
    // Wrap with Wouter's Router for useLocation hook to work correctly
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