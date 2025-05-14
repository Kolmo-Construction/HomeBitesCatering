import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter'; // Added Link
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
} from '@/components/ui/card'; // Card components are not used here, but kept if needed elsewhere
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { RawLead } from '@/../../shared/schema';
import { EyeIcon } from 'lucide-react'; // Added EyeIcon for view button

interface RawLeadListProps {
  initialFilter?: string;
}

export default function RawLeadList({ initialFilter = '' }: RawLeadListProps) {
  const [, navigate] = useLocation();
  // If initialFilter is an empty string (from "All Leads" tab), treat it as "all" for Select value
  // but keep it as "" for API query.
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter === "all" || initialFilter === "" ? "" : initialFilter);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    // When initialFilter prop changes (e.g., from Tabs in RawLeadsPage)
    setStatusFilter(initialFilter === "all" || initialFilter === "" ? "" : initialFilter);
  }, [initialFilter]);

  const { data: rawLeads, isLoading } = useQuery<RawLead[]>({
    queryKey: ['/api/raw-leads', statusFilter], // statusFilter will be "" for "all"
    queryFn: async ({ queryKey }) => {
      const currentStatusFilter = queryKey[1] as string;
      const params = new URLSearchParams();
      if (currentStatusFilter) { // Only append if there's a filter
        params.append('status', currentStatusFilter);
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
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">New</Badge>;
      case 'under_review':
        return <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-black">Under Review</Badge>;
      case 'qualified':
        return <Badge className="bg-green-500 hover:bg-green-600">Qualified</Badge>;
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
            {/* The Select value is "all" when statusFilter is "", otherwise it's statusFilter */}
            <Select
              value={statusFilter === "" ? "all" : statusFilter}
              onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem> {/* Changed value to "all" */}
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
                setStatusFilter(''); // This represents "all" for the API
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
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell className="text-right">
                      <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                              e.stopPropagation(); // Prevent row click
                              navigate(`/raw-leads/${lead.id}`);
                          }}
                          aria-label="View lead details"
                      >
                          <EyeIcon className="h-4 w-4" />
                      </Button>
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