import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { RawLead } from '@/../../shared/schema';
import { format } from 'date-fns';

interface RawLeadDetailProps {
  leadId: number;
}

export default function RawLeadDetail({ leadId }: RawLeadDetailProps) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [notes, setNotes] = React.useState<string>('');
  const [status, setStatus] = React.useState<string>('');

  const { data: rawLead, isLoading, error } = useQuery<RawLead>({
    queryKey: [`/api/raw-leads/${leadId}`],
    queryFn: async () => {
      const response = await fetch(`/api/raw-leads/${leadId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch raw lead');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setNotes(data.notes || '');
      setStatus(data.status);
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async (data: Partial<RawLead>) => {
      const response = await fetch(`/api/raw-leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update raw lead');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/raw-leads/${leadId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/raw-leads'] });
      toast({
        title: 'Success',
        description: 'Raw lead updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const handleNotesBlur = () => {
    if (rawLead && notes !== rawLead.notes) {
      updateLeadMutation.mutate({ notes });
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    updateLeadMutation.mutate({ status: newStatus });
  };

  const handleConvertClick = () => {
    navigate(`/opportunities/new?fromRawLeadId=${leadId}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !rawLead) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>
            Failed to load raw lead details. Please try again.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => navigate('/raw-leads')}>Back to List</Button>
        </CardFooter>
      </Card>
    );
  }

  // Function to format JSON for display
  const formatJsonData = (data: any): string => {
    return JSON.stringify(data, null, 2);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>
            {rawLead.extractedName || 'Unnamed Lead'}{' '}
            <Badge>{rawLead.source}</Badge>
            {rawLead.createdOpportunityId && (
              <Badge className="ml-2 bg-green-500 hover:bg-green-600">Converted to Opportunity</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Received on {format(new Date(rawLead.receivedAt), 'MMMM d, yyyy hh:mm a')}
          </CardDescription>
        </div>
        <div className="flex space-x-2">
          <Select 
            value={status} 
            onValueChange={handleStatusChange}
            disabled={!!rawLead.createdOpportunityId}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="junk">Junk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Email</h3>
            <p>{rawLead.extractedEmail || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Phone</h3>
            <p>{rawLead.extractedPhone || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Event Summary</h3>
            <p>{rawLead.eventSummary || 'No summary available'}</p>
          </div>
          {rawLead.createdOpportunityId && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Linked Opportunity</h3>
              <p className="flex items-center space-x-2">
                <span className="font-medium">#{rawLead.createdOpportunityId}</span>
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => navigate(`/opportunities/${rawLead.createdOpportunityId}`)}
                >
                  View Opportunity
                </Button>
              </p>
            </div>
          )}
        </div>

        <Tabs defaultValue="notes">
          <TabsList>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="mt-4">
            <Textarea
              placeholder="Add internal notes about this lead..."
              className="min-h-[200px]"
              value={notes}
              onChange={handleNotesChange}
              onBlur={handleNotesBlur}
            />
          </TabsContent>

          <TabsContent value="raw-data" className="mt-4">
            <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[400px]">
              <pre className="text-xs">
                {rawLead.rawData ? formatJsonData(rawLead.rawData) : 'No raw data available'}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => navigate('/raw-leads')}>
          Back to List
        </Button>
        {!rawLead.createdOpportunityId && status !== 'junk' && (
          <Button onClick={handleConvertClick}>
            Convert to Opportunity
          </Button>
        )}
        {rawLead.createdOpportunityId && (
          <Button 
            variant="outline" 
            onClick={() => navigate(`/opportunities/${rawLead.createdOpportunityId}`)}
            className="text-green-600 border-green-600 hover:bg-green-50"
          >
            View Linked Opportunity #{rawLead.createdOpportunityId}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}