import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { RawLead } from '@/../../shared/schema';
import { EyeIcon, Trash2Icon, CheckIcon, XIcon } from 'lucide-react';

interface RawLeadListProps {
  initialFilter?: string;
}

export default function RawLeadList({ initialFilter = '' }: RawLeadListProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for filters
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter === "all" || initialFilter === "" ? "" : initialFilter);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // State for deletions
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<number | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  useEffect(() => {
    // When initialFilter prop changes (e.g., from Tabs in RawLeadsPage)
    setStatusFilter(initialFilter === "all" || initialFilter === "" ? "" : initialFilter);
    // Clear selections when changing tabs/filters
    setSelectedLeads([]);
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
  
  // Delete a single lead
  const deleteLead = useMutation({
    mutationFn: async (leadId: number) => {
      const response = await fetch(`/api/raw-leads/${leadId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete lead');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lead deleted",
        description: "The lead has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/raw-leads'] });
      setLeadToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lead. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Delete multiple leads
  const bulkDeleteLeads = useMutation({
    mutationFn: async (leadIds: number[]) => {
      const response = await fetch('/api/raw-leads/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: leadIds }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete leads');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: `${data.deleted} leads deleted`,
        description: data.failed > 0 
          ? `${data.failed} leads could not be deleted.` 
          : "All selected leads were successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/raw-leads'] });
      setSelectedLeads([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete leads. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle selecting/deselecting a lead
  const toggleSelectLead = (leadId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click
    
    setSelectedLeads(prev => {
      if (prev.includes(leadId)) {
        return prev.filter(id => id !== leadId);
      } else {
        return [...prev, leadId];
      }
    });
  };
  
  // Toggle select all leads
  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    }
  };
  
  // Handle individual lead deletion
  const handleDeleteClick = (leadId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click
    setLeadToDelete(leadId);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle confirm of individual deletion
  const handleDeleteConfirm = () => {
    if (leadToDelete) {
      deleteLead.mutate(leadToDelete);
    }
    setIsDeleteDialogOpen(false);
  };
  
  // Handle bulk deletion
  const handleBulkDeleteClick = () => {
    if (selectedLeads.length > 0) {
      setIsBulkDeleteDialogOpen(true);
    }
  };
  
  // Handle confirm of bulk deletion
  const handleBulkDeleteConfirm = () => {
    if (selectedLeads.length > 0) {
      bulkDeleteLeads.mutate(selectedLeads);
    }
    setIsBulkDeleteDialogOpen(false);
  };

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
                <SelectItem value="all">All Statuses</SelectItem>
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
        {selectedLeads.length > 0 && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 p-2 rounded-md">
            <div className="flex items-center">
              <span className="mr-2">{selectedLeads.length} lead(s) selected</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedLeads([])}
                className="mr-2"
              >
                Cancel
              </Button>
            </div>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleBulkDeleteClick}
              disabled={selectedLeads.length === 0}
            >
              Delete Selected
            </Button>
          </div>
        )}
        
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
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all leads"
                    />
                  </TableHead>
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
                    className={`hover:bg-gray-50 ${selectedLeads.includes(lead.id) ? 'bg-blue-50' : ''}`}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()} className="p-2">
                      <Checkbox 
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedLeads(prev => [...prev, lead.id]);
                          } else {
                            setSelectedLeads(prev => prev.filter(id => id !== lead.id));
                          }
                        }}
                        aria-label={`Select lead ${lead.id}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell 
                      className="font-medium"
                      onClick={() => navigate(`/raw-leads/${lead.id}`)}
                    >
                      {lead.source}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/raw-leads/${lead.id}`)}>
                      <div>
                        <span className="font-medium">{lead.extractedName || 'Unnamed'}</span>
                      </div>
                      {lead.extractedEmail && <div className="text-gray-500 text-sm">{lead.extractedEmail}</div>}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/raw-leads/${lead.id}`)}>
                      {format(new Date(lead.receivedAt), 'MMM d, yyyy')}
                      <div className="text-gray-500 text-sm">
                        {format(new Date(lead.receivedAt), 'h:mm a')}
                      </div>
                    </TableCell>
                    <TableCell 
                      className="max-w-[200px] truncate"
                      onClick={() => navigate(`/raw-leads/${lead.id}`)}
                    >
                      {lead.eventSummary || 'No summary'}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/raw-leads/${lead.id}`)}>
                      {getStatusBadge(lead.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/raw-leads/${lead.id}`)}
                          aria-label="View lead details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteClick(lead.id, e)}
                          aria-label="Delete lead"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Individual Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the lead and all its data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-500 hover:bg-red-600">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedLeads.length} leads?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the selected leads and all their data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDeleteConfirm} className="bg-red-500 hover:bg-red-600">
                Delete {selectedLeads.length} leads
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}