import React from 'react';
import RawLeadList from '@/components/rawLeads/RawLeadList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'wouter';

export default function RawLeadsPage() {
  const navigate = useNavigate();

  const handleAddManualLeadClick = () => {
    // This would open a form to manually add a raw lead
    navigate('/raw-leads/new');
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Lead Inbox</h1>
          <p className="text-gray-500">
            Review and convert incoming raw leads into opportunities
          </p>
        </div>
        <Button onClick={handleAddManualLeadClick}>
          <Plus className="mr-2 h-4 w-4" /> Add Manual Lead
        </Button>
      </div>
      
      <RawLeadList />
    </div>
  );
}