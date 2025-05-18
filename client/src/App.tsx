import React from 'react';
import { Route, Switch } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

// Pages
import QuestionnaireBuilder from './pages/QuestionnaireBuilder';
import QuestionnaireSubmit from './pages/QuestionnaireSubmit';
import SubmissionComplete from './pages/SubmissionComplete';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="min-h-screen bg-background">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/login" component={Login} />
          <Route path="/questionnaires/builder" component={QuestionnaireBuilder} />
          <Route path="/questionnaires/submit/:id?" component={QuestionnaireSubmit} />
          <Route path="/submission-complete" component={SubmissionComplete} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </main>
    </QueryClientProvider>
  );
}