import React from 'react';
import { Route, Switch } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

// Pages
// Main Pages
import Dashboard from './pages/dashboard';
import Login from './pages/login';
import NotFound from './pages/not-found';

// Client Management
import Clients from './pages/clients';
import ClientPortal from './pages/client-portal';

// Lead & Opportunity Management
import Leads from './pages/leads';
import RawLeadsPage from './pages/rawLeadsPage';
import RawLeadFormPage from './pages/rawLeadFormPage';
import RawLeadDetailPage from './pages/rawLeadDetailPage';
import Opportunities from './pages/opportunities';
import OpportunityDetailPage from './pages/OpportunityDetailPage';
import LeadDetailPage from './pages/LeadDetailPage';

// Calendar & Events
import Calendar from './pages/calendar';

// Menus & Items
import Menus from './pages/menus';
import MenuItems from './pages/menu-items';

// Estimates & Quotes
import Estimates from './pages/estimates';

// Questionnaire System
import QuestionnaireBuilder from './pages/QuestionnaireBuilder';
import QuestionnaireSubmit from './pages/QuestionnaireSubmit';
import SubmissionComplete from './pages/SubmissionComplete';
import PublicQuestionnaire from './pages/PublicQuestionnaire';
import QuestionnaireDocumentation from './pages/QuestionnaireDocumentation';
import ThankYou from './pages/ThankYou';

// Settings
import Settings from './pages/settings';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="min-h-screen bg-background">
        <Switch>
          {/* Main Pages */}
          <Route path="/" component={Dashboard} />
          <Route path="/login" component={Login} />
          
          {/* Client Management */}
          <Route path="/clients" component={Clients} />
          <Route path="/client-portal" component={ClientPortal} />
          
          {/* Lead & Opportunity Management */}
          <Route path="/leads" component={Leads} />
          <Route path="/raw-leads" component={RawLeadsPage} />
          <Route path="/raw-leads/new" component={RawLeadFormPage} />
          <Route path="/raw-leads/:id" component={RawLeadDetailPage} />
          <Route path="/opportunities" component={Opportunities} />
          <Route path="/opportunities/:id" component={OpportunityDetailPage} />
          <Route path="/leads/:id" component={LeadDetailPage} />
          
          {/* Calendar & Events */}
          <Route path="/calendar" component={Calendar} />
          
          {/* Menus & Items */}
          <Route path="/menus" component={Menus} />
          <Route path="/menu-items" component={MenuItems} />
          
          {/* Estimates & Quotes */}
          <Route path="/estimates" component={Estimates} />
          
          {/* Questionnaire System */}
          <Route path="/questionnaires/builder" component={QuestionnaireBuilder} />
          <Route path="/questionnaires/submit/:id?" component={QuestionnaireSubmit} />
          <Route path="/questionnaires/public/:id" component={PublicQuestionnaire} />
          <Route path="/questionnaires/documentation" component={QuestionnaireDocumentation} />
          <Route path="/submission-complete" component={SubmissionComplete} />
          <Route path="/thank-you" component={ThankYou} />
          
          {/* Settings */}
          <Route path="/settings" component={Settings} />
          
          {/* 404 Not Found */}
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </main>
    </QueryClientProvider>
  );
}