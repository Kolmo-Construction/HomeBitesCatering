import React, { useState } from 'react';
import RawLeadForm from '@/components/rawLeads/RawLeadForm';
import { EmailParserWidget } from '@/components/rawLeads/EmailParserWidget';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PrefilledData {
  prospectName?: string;
  prospectEmail?: string;
  prospectPhone?: string;
  eventType?: string;
  eventDate?: string;
  guestCount?: number;
  venue?: string;
  budget?: number;
  keyRequirements?: string[];
  potentialRedFlags?: string[];
  suggestedNextStep?: string;
}

export default function RawLeadFormPage() {
  const [prefilledData, setPrefilledData] = useState<PrefilledData | undefined>(undefined);

  const handleSelectLead = (leadData: PrefilledData) => {
    setPrefilledData(leadData);
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Add New Lead</h1>
      
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="manual" data-testid="tab-manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="email-parser" data-testid="tab-email-parser">Parse From Email</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <RawLeadForm />
        </TabsContent>

        <TabsContent value="email-parser" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Parsed Email</h2>
              <EmailParserWidget onSelectLead={handleSelectLead} />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-4">Lead Form</h2>
              <RawLeadForm prefilledData={prefilledData} key={JSON.stringify(prefilledData)} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}