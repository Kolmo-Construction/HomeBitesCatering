// src/App.tsx
import React, { Suspense } from "react"; // Removed useState, useEffect, lazy as they weren't used in the modified version
import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Router, useLocation } from "wouter"; // Added Router and useLocation for path-based rendering
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient"; // Assuming this path is correct
import Login from "@/pages/login"; // Assuming this path is correct
import Dashboard from "@/pages/dashboard";
import Opportunities from "@/pages/opportunities";
import FollowUps from "@/pages/FollowUps";
import Pipeline from "@/pages/Pipeline";
import Clients from "@/pages/clients";
import Quotes from "@/pages/quotes";
import Menus from "@/pages/menus";
import BaseIngredients from "@/pages/base-ingredients";
import StagingBaseIngredients from "@/pages/StagingBaseIngredients";
import Recipes from "@/pages/recipes";
import KitchenHelp from "@/pages/kitchen-help";
import Calendar from "@/pages/calendar";
import Settings from "@/pages/settings";
import Users from "@/pages/users";
import RawLeadsPage from "@/pages/rawLeadsPage";
import RawLeadFormPage from "@/pages/rawLeadFormPage";
import RawLeadDetailPage from "@/pages/rawLeadDetailPage";

// Tier 3: Client portal (magic-link authenticated)
import ClientPortal from "@/pages/ClientPortal";

// Import the Dietary Demo page
import DietaryDemo from "@/pages/DietaryDemo";

// Import the public quote request form
import Inquire from "@/pages/Inquire";

// Import the admin Quote Requests inbox
import Inquiries from "@/pages/Inquiries";

// Import the Event Command Center (chef one-stop-shop)
import Events from "@/pages/Events";

// Public quote viewer (customer accepts/declines via tokenized link)
import PublicQuote from "@/pages/PublicQuote";

// Public customer event page (celebration view, separate from the quote page)
import PublicEventPage from "@/pages/PublicEventPage";

// Public self-serve "find my event" link recovery page
import FindMyEvent from "@/pages/FindMyEvent";

// P0-3: Public decline-feedback form (magic-link)
import PublicDeclineFeedback from "@/pages/PublicDeclineFeedback";

// P1-1: Public tasting booking + post-booking payment page
import PublicTasting from "@/pages/PublicTasting";
import PublicTastingThanks from "@/pages/PublicTastingThanks";

import UnmatchedInbox from "@/pages/UnmatchedInbox";

// Admin catalog + pricing-config editor
import Catalog from "@/pages/Catalog";

// Admin social publishing (Buffer-backed IG + FB)
import SocialPage from "@/pages/social";

// Public auth recovery flows (no login required)
import ForgotPassword from "@/pages/forgot-password";
import ForgotUsername from "@/pages/forgot-username";
import ResetPassword from "@/pages/reset-password";
import AcceptInvite from "@/pages/accept-invite";

// Authed account-security page (password change + MFA)
import AccountSecurity from "@/pages/account-security";

import Layout from "@/components/layout/Layout"; // Assuming this path is correct
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext"; // Assuming this path is correct

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

  // Check if the current path is for any public-facing page
  const isInquirePage = location === "/inquire";
  const isPublicQuotePage = location.startsWith("/quote/");
  const isPublicEventPage = location.startsWith("/event/");
  const isFindMyEventPage = location === "/find-my-event";
  const isClientPortalPage = location.startsWith("/my-events");
  const isDeclineFeedbackPage = location.startsWith("/decline-feedback/");
  const isTastingPage = location === "/tasting" || location.startsWith("/tasting/");
  const isPublicFormPage = isInquirePage || isPublicQuotePage || isPublicEventPage || isFindMyEventPage || isClientPortalPage || isDeclineFeedbackPage || isTastingPage;


  if (isPublicFormPage && !user) { // Allow access to public forms even if not logged in
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster />
        <Switch>
          {/* Tier 3: Client portal (magic-link auth) */}
          <Route path="/my-events" component={ClientPortal} />
          <Route path="/inquire" component={Inquire} />
          <Route path="/quote/:token" component={PublicQuote} />
          <Route path="/event/:token" component={PublicEventPage} />
          <Route path="/find-my-event" component={FindMyEvent} />
          <Route path="/decline-feedback/:token" component={PublicDeclineFeedback} />
          <Route path="/tasting" component={PublicTasting} />
          <Route path="/tasting/thanks" component={PublicTastingThanks} />
          <Route>
            <div className="flex items-center justify-center h-screen text-xl">404 - Page Not Found</div>
          </Route>
        </Switch>
      </div>
    );
  }

  // If user is not logged in and not accessing a public form, show Login —
  // but first route to the recovery pages if that's where they are. These
  // need to work without an auth session.
  if (!user) {
    if (location === "/forgot-password") {
      return (
        <div className="min-h-screen bg-gray-50">
          <Toaster />
          <ForgotPassword />
        </div>
      );
    }
    if (location === "/forgot-username") {
      return (
        <div className="min-h-screen bg-gray-50">
          <Toaster />
          <ForgotUsername />
        </div>
      );
    }
    if (location === "/reset-password") {
      return (
        <div className="min-h-screen bg-gray-50">
          <Toaster />
          <ResetPassword />
        </div>
      );
    }
    if (location === "/accept-invite") {
      return (
        <div className="min-h-screen bg-gray-50">
          <Toaster />
          <AcceptInvite />
        </div>
      );
    }
    return (
        <div className="min-h-screen bg-gray-50">
            <Toaster />
            <Login />
        </div>
    );
  }

  // Role-based routing: chefs only get kitchen-facing pages. Everything else
  // redirects to /events (their primary workspace). Defense-in-depth — the
  // server also strips financial data and blocks non-chef endpoints, but
  // route-level guarding keeps chefs from seeing sales UI even momentarily.
  const isChef = user.role === "chef";

  // User is logged in, show admin/dashboard layout
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      <Layout>
        {isChef ? (
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/events" component={Events} />
            <Route path="/events/:id" component={Events} />
            <Route path="/base-ingredients" component={BaseIngredients} />
            <Route path="/recipes" component={Recipes} />
            <Route path="/menus" component={Menus} />
            <Route path="/menus/:id" component={Menus} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/help" component={KitchenHelp} />
            {/* Anything else: send chefs to their workspace */}
            <Route>
              {() => {
                if (typeof window !== "undefined") {
                  window.location.replace("/events");
                }
                return null;
              }}
            </Route>
          </Switch>
        ) : (
          <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/follow-ups" component={FollowUps} />
          <Route path="/pipeline" component={Pipeline} />
          <Route path="/opportunities" component={Opportunities} />
          <Route path="/opportunities/new" component={Opportunities} />
          <Route path="/opportunities/:id" component={Opportunities} />
          <Route path="/opportunities/:id/edit" component={Opportunities} />
          <Route path="/clients" component={Clients} />
          <Route path="/clients/new" component={Clients} />
          <Route path="/clients/:id" component={Clients} />
          <Route path="/clients/:id/edit" component={Clients} />
          <Route path="/unmatched" component={UnmatchedInbox} />
          <Route path="/quotes" component={Quotes} />
          <Route path="/quotes/new" component={Quotes} />
          <Route path="/quotes/:id/view" component={Quotes} />
          <Route path="/quotes/:id/edit" component={Quotes} />
          <Route path="/base-ingredients" component={BaseIngredients} />
          <Route path="/admin/staging-base-ingredients" component={StagingBaseIngredients} />
          <Route path="/recipes" component={Recipes} />
          <Route path="/help" component={KitchenHelp} />
          <Route path="/menus" component={Menus} />
          <Route path="/menus/new" component={Menus} />
          <Route path="/menus/:id" component={Menus} />
          <Route path="/menus/:id/edit" component={Menus} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/settings" component={Settings} />
          <Route path="/account/security" component={AccountSecurity} />
          <Route path="/users" component={Users} />
          <Route path="/raw-leads" component={RawLeadsPage} />
          <Route path="/raw-leads/new" component={RawLeadFormPage} />
          <Route path="/raw-leads/:id" component={RawLeadDetailPage} />
          <Route path="/inquiries" component={Inquiries} />
          <Route path="/catalog" component={Catalog} />
          <Route path="/social" component={SocialPage} />
          <Route path="/events" component={Events} />
          <Route path="/events/:id" component={Events} />
          <Route path="/dietary-demo" component={DietaryDemo} />

          {/* Public forms accessible when logged in */}
          <Route path="/inquire" component={Inquire} />
          <Route path="/quote/:token" component={PublicQuote} />
          <Route path="/event/:token" component={PublicEventPage} />
          <Route path="/find-my-event" component={FindMyEvent} />
          <Route path="/decline-feedback/:token" component={PublicDeclineFeedback} />
          <Route path="/tasting" component={PublicTasting} />
          <Route path="/tasting/thanks" component={PublicTastingThanks} />

          {/* Fallback Route for authenticated users */}
          <Route>
            <Dashboard /> {/* Or a 404 component within the Layout */}
          </Route>
        </Switch>
        )}
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