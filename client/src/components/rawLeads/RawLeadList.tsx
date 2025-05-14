import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'wouter';
import { format } from 'date-fns';
import { RawLead } from '../../../shared/schema';

export default function RawLeadList() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');

  // Build the query string based on filters
  const queryString = new URLSearchParams();
  if (statusFilter) queryString.append('status', statusFilter);
  if (sourceFilter) queryString.append('source', sourceFilter);
  
  const filterQueryPart = queryString.toString() ? `?${queryString.toString()}` : '';

  const { data: rawLeads, isLoading, error } = useQuery<RawLead[]>({
    queryKey: ['/api/raw-leads', statusFilter, sourceFilter],
    queryFn: async () => {
      const response = await fetch(`/api/raw-leads${filterQueryPart}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
  });

  const handleReviewClick = (rawLeadId: number) => {
    navigate(`/opportunities/new?fromRawLeadId=${rawLeadId}`);
  };

  // Generate status badge with appropriate color
  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'new': 'bg-blue-500',
      'under_review': 'bg-yellow-500',
      'qualified': 'bg-green-500',
      'archived': 'bg-gray-500',
      'junk': 'bg-red-500',
    };
    
    return (
      <Badge className={statusColors[status] || 'bg-gray-500'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  // Function to get a source badge with appropriate color
  const getSourceBadge = (source: string) => {
    const sourceColors: Record<string, string> = {
      'website_form': 'bg-purple-500',
      'gmail_sync': 'bg-red-400',
      'weddingwire': 'bg-pink-500',
      'manual_entry': 'bg-blue-400',
      'theknot': 'bg-green-400',
    };
    
    return (
      <Badge className={sourceColors[source] || 'bg-gray-400'}>
        {source.replace('_', ' ')}
      </Badge>
    );
  };

  // Handle loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Raw Leads</CardTitle>
          <CardDescription>Review incoming lead requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Raw Leads</CardTitle>
          <CardDescription>Error loading raw leads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-red-500">
            Failed to load raw leads. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Raw Leads</CardTitle>
        <CardDescription>Review incoming lead requests</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-4 mb-4">
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="junk">Junk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Source</label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sources</SelectItem>
                <SelectItem value="gmail_sync">Gmail Sync</SelectItem>
                <SelectItem value="website_form">Website Form</SelectItem>
                <SelectItem value="weddingwire">Wedding Wire</SelectItem>
                <SelectItem value="theknot">The Knot</SelectItem>
                <SelectItem value="manual_entry">Manual Entry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Event Summary</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rawLeads && rawLeads.length > 0 ? (
              rawLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>{getSourceBadge(lead.source)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {lead.extractedName && <span className="font-medium">{lead.extractedName}</span>}
                      {lead.extractedEmail && <span className="text-sm text-blue-500">{lead.extractedEmail}</span>}
                      {lead.extractedPhone && <span className="text-sm">{lead.extractedPhone}</span>}
                    </div>
                  </TableCell>
                  <TableCell>{lead.eventSummary || 'No summary available'}</TableCell>
                  <TableCell>{format(new Date(lead.receivedAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{getStatusBadge(lead.status)}</TableCell>
                  <TableCell>
                    <Button
                      onClick={() => handleReviewClick(lead.id)}
                      variant="outline"
                      size="sm"
                    >
                      Review & Convert
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No raw leads found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}