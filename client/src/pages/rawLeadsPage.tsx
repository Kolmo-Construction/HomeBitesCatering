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
        </TabsList>
        
        <TabsContent value="all">
          <RawLeadList />
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
      </Tabs>
    </div>
  );
}