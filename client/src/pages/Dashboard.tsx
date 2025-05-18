import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function Dashboard() {
  const [_, setLocation] = useLocation();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Catering Management Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Questionnaire Builder</CardTitle>
            <CardDescription>Create and manage questionnaires for different event types</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Build dynamic questionnaires with conditional logic and multiple question types.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setLocation('/questionnaires/builder')}>
              Open Builder
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Responses</CardTitle>
            <CardDescription>View and manage questionnaire responses</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Access all submitted questionnaire responses and export data.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" disabled>
              View Responses
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>Manage upcoming and past events</CardDescription>
          </CardHeader>
          <CardContent>
            <p>View all events, their details, and associated questionnaire data.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" disabled>
              View Events
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}