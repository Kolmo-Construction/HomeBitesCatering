import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { RawLead } from '@/../../shared/schema';

interface RawLeadListProps {
  initialFilter?: string;
}

export default function RawLeadList({ initialFilter = '' }: RawLeadListProps) {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
  }, [initialFilter]);

  const { data: rawLeads, isLoading } = useQuery<RawLead[]>({
    queryKey: ['/api/raw-leads', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      const response = await fetch(`/api/raw-leads?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch raw leads');
      }
      return response.json();
    },
  });

  const filteredLeads = rawLeads
    ? rawLeads.filter(
        (lead) =>
          searchTerm === '' ||
          (lead.extractedName && lead.extractedName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (lead.extractedEmail && lead.extractedEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (lead.eventSummary && lead.eventSummary.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="default">New</Badge>;
      case 'under_review':
        return <Badge variant="secondary">Under Review</Badge>;
      case 'qualified':
        return <Badge variant="success" className="bg-green-500 hover:bg-green-600">Qualified</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      case 'junk':
        return <Badge variant="destructive">Junk</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search leads by name, email, or summary..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Filter:</span>
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
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">No leads found matching your criteria.</p>
            <Button 
              variant="link" 
              onClick={() => {
                setStatusFilter('');
                setSearchTerm('');
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Name / Email</TableHead>
                  <TableHead>Date Received</TableHead>
                  <TableHead>Event Summary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow 
                    key={lead.id} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/raw-leads/${lead.id}`)}
                  >
                    <TableCell className="font-medium">{lead.source}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{lead.extractedName || 'Unnamed'}</span>
                      </div>
                      {lead.extractedEmail && <div className="text-gray-500 text-sm">{lead.extractedEmail}</div>}
                    </TableCell>
                    <TableCell>
                      {format(new Date(lead.receivedAt), 'MMM d, yyyy')}
                      <div className="text-gray-500 text-sm">
                        {format(new Date(lead.receivedAt), 'h:mm a')}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {lead.eventSummary || 'No summary'}
                    </TableCell>
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    <TableCell>
                      {lead.createdOpportunityId ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="success" className="bg-green-500 hover:bg-green-600">Converted</Badge>
                          <Button
                            variant="link"
                            size="sm"
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/opportunities/${lead.createdOpportunityId}`);
                            }}
                          >
                            View Opportunity
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/raw-leads/${lead.id}`);
                          }}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}