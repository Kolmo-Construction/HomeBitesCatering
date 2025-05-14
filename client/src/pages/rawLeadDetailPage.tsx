import React from 'react';
import RawLeadDetail from '@/components/rawLeads/RawLeadDetail';
import { useParams } from 'wouter';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function RawLeadDetailPage() {
  const params = useParams<{ id: string }>();
  const leadId = parseInt(params.id);

  if (isNaN(leadId)) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Invalid lead ID. Please return to the lead list and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Lead Details</h1>
      <RawLeadDetail leadId={leadId} />
    </div>
  );
}