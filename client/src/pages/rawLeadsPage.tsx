import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import RawLeadList from '@/components/rawLeads/RawLeadList';
import { PlusCircle } from 'lucide-react';

export default function RawLeadsPage() {
  const [, navigate] = useLocation();

  // Determine the active tab from the URL or default to "all"
  // This part is more complex if you want deep linking for tabs.
  // For simplicity, we'll just use the Tabs component's defaultValue.
  // Or, you can manage tab state here and pass it to RawLeadList.

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Incoming Leads</h1>
        <Button onClick={() => navigate('/raw-leads/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Lead Manually
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Leads</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="under_review">Under Review</TabsTrigger>
          <TabsTrigger value="qualified">Qualified</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
          <TabsTrigger value="junk">Junk</TabsTrigger> {/* Added Junk tab trigger */}
        </TabsList>

        <TabsContent value="all">
          {/* Pass "all" so RawLeadList knows to set its internal filter to "" */}
          <RawLeadList initialFilter="all" />
        </TabsContent>

        <TabsContent value="new">
          <RawLeadList initialFilter="new" />
        </TabsContent>

        <TabsContent value="under_review">
          <RawLeadList initialFilter="under_review" />
        </TabsContent>

        <TabsContent value="qualified">
          <RawLeadList initialFilter="qualified" />
        </TabsContent>

        <TabsContent value="archived">
          <RawLeadList initialFilter="archived" />
        </TabsContent>

        <TabsContent value="junk">  {/* Added Junk tab content */}
          <RawLeadList initialFilter="junk" />
        </TabsContent>
      </Tabs>
    </div>
  );
}