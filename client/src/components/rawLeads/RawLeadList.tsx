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
import { 
  EyeIcon, 
  Trash2Icon, 
  MailIcon,
  PhoneIcon,
  CalendarIcon,
  UsersIcon,
  MapPinIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  HeartIcon,
  BriefcaseIcon,
  CakeIcon,
  SparklesIcon,
  MessageSquareIcon
} from 'lucide-react';

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
    setStatusFilter(initialFilter === "all" || initialFilter === "" ? "" : initialFilter);
    setSelectedLeads([]);
  }, [initialFilter]);

  const { data: rawLeads, isLoading } = useQuery<RawLead[]>({
    queryKey: ['/api/raw-leads', statusFilter],
    queryFn: async ({ queryKey }) => {
      const currentStatusFilter = queryKey[1] as string;
      const params = new URLSearchParams();
      if (currentStatusFilter) {
        params.append('status', currentStatusFilter);
      }
      const response = await fetch(`/api/raw-leads?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch raw leads');
      }
      return response.json();
    },
  });
  
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
  
  const bulkDeleteLeads = useMutation({
    mutationFn: async (leadIds: number[]) => {
      const response = await fetch('/api/raw-leads/delete-many', {
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
  
  const handleDeleteClick = (leadId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setLeadToDelete(leadId);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = () => {
    if (leadToDelete) {
      deleteLead.mutate(leadToDelete);
    }
    setIsDeleteDialogOpen(false);
  };
  
  const handleBulkDeleteClick = () => {
    if (selectedLeads.length > 0) {
      setIsBulkDeleteDialogOpen(true);
    }
  };
  
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
          (lead.extractedProspectName && lead.extractedProspectName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (lead.extractedProspectEmail && lead.extractedProspectEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (lead.eventSummary && lead.eventSummary.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    }
  };

  // Helper function to extract source email from rawData
  const getSourceEmail = (lead: RawLead): string => {
    try {
      const rawData = lead.rawData as any;
      if (rawData?.parser_metadata?.internal_sender_email) {
        return rawData.parser_metadata.internal_sender_email;
      }
      if (rawData?.inquiry_data?.client_email) {
        return rawData.inquiry_data.client_email;
      }
    } catch (e) {
      // Fallback to extractedProspectEmail if available
    }
    return lead.extractedProspectEmail || lead.source;
  };

  // Helper function to get lead quality badge
  const getLeadQualityBadge = (quality?: string) => {
    if (!quality) return null;
    
    switch (quality) {
      case 'hot':
        return (
          <Badge className="bg-red-500 hover:bg-red-600 text-white">
            <TrendingUpIcon className="h-3 w-3 mr-1" />
            Hot
          </Badge>
        );
      case 'warm':
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
            <TrendingUpIcon className="h-3 w-3 mr-1" />
            Warm
          </Badge>
        );
      case 'cold':
        return (
          <Badge className="bg-blue-400 hover:bg-blue-500 text-white">
            Cold
          </Badge>
        );
      default:
        return null;
    }
  };

  // Helper function to get event type icon
  const getEventTypeIcon = (eventType?: string) => {
    if (!eventType) return <CalendarIcon className="h-4 w-4 text-gray-400" />;
    
    const lowerType = eventType.toLowerCase();
    if (lowerType.includes('wedding')) {
      return <HeartIcon className="h-4 w-4 text-pink-500" />;
    } else if (lowerType.includes('corporate') || lowerType.includes('business')) {
      return <BriefcaseIcon className="h-4 w-4 text-blue-600" />;
    } else if (lowerType.includes('birthday') || lowerType.includes('party')) {
      return <CakeIcon className="h-4 w-4 text-purple-500" />;
    } else {
      return <SparklesIcon className="h-4 w-4 text-indigo-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-white">
            <span className="inline-block w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse" />
            New
          </Badge>
        );
      case 'under_review':
        return (
          <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white">
            <ClockIcon className="h-3 w-3 mr-1" />
            Under Review
          </Badge>
        );
      case 'qualified':
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Qualified
          </Badge>
        );
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      case 'junk':
        return (
          <Badge variant="destructive">
            <AlertCircleIcon className="h-3 w-3 mr-1" />
            Junk
          </Badge>
        );
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
              data-testid="input-search-leads"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Filter:</span>
            <Select
              value={statusFilter === "" ? "all" : statusFilter}
              onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="disqualified">Disqualified</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="junk">Junk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedLeads.length > 0 && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
            <div className="flex items-center">
              <span className="mr-2 font-medium text-blue-900 dark:text-blue-100">
                {selectedLeads.length} lead(s) selected
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedLeads([])}
                className="mr-2"
                data-testid="button-cancel-selection"
              >
                Cancel
              </Button>
            </div>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleBulkDeleteClick}
              disabled={selectedLeads.length === 0}
              data-testid="button-delete-selected"
            >
              <Trash2Icon className="h-3 w-3 mr-1" />
              Delete Selected
            </Button>
          </div>
        )}
        
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquareIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-2">No leads found matching your criteria.</p>
            <Button
              variant="link"
              onClick={() => {
                setStatusFilter('');
                setSearchTerm('');
              }}
              data-testid="button-clear-filters"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all leads"
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Source</TableHead>
                  <TableHead className="font-semibold">Name / Email</TableHead>
                  <TableHead className="font-semibold">Date Received</TableHead>
                  <TableHead className="font-semibold">Event Summary</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${selectedLeads.includes(lead.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    data-testid={`row-lead-${lead.id}`}
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
                        data-testid={`checkbox-lead-${lead.id}`}
                      />
                    </TableCell>
                    <TableCell 
                      onClick={() => navigate(`/raw-leads/${lead.id}`)}
                      className="max-w-[200px]"
                    >
                      <div className="flex items-center gap-2">
                        <MailIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate" title={getSourceEmail(lead)}>
                            {getSourceEmail(lead)}
                          </div>
                          {lead.leadSourcePlatform && (
                            <div className="text-xs text-gray-500 truncate">
                              via {lead.leadSourcePlatform}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => navigate(`/raw-leads/${lead.id}`)}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {lead.extractedProspectName || 'Name not extracted'}
                            </span>
                            {lead.aiOverallLeadQuality && getLeadQualityBadge(lead.aiOverallLeadQuality)}
                          </div>
                          {lead.extractedProspectEmail && (
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <MailIcon className="h-3 w-3" />
                              <span className="truncate">{lead.extractedProspectEmail}</span>
                            </div>
                          )}
                          {lead.extractedProspectPhone && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <PhoneIcon className="h-3 w-3" />
                              {lead.extractedProspectPhone}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => navigate(`/raw-leads/${lead.id}`)}>
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium">
                            {format(new Date(lead.receivedAt), 'MMM d, yyyy')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(lead.receivedAt), 'h:mm a')}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell 
                      onClick={() => navigate(`/raw-leads/${lead.id}`)}
                      className="max-w-[300px]"
                    >
                      <div className="space-y-1">
                        {lead.extractedEventType && (
                          <div className="flex items-center gap-1.5">
                            {getEventTypeIcon(lead.extractedEventType)}
                            <span className="text-sm font-medium">{lead.extractedEventType}</span>
                          </div>
                        )}
                        {lead.extractedEventDate && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <CalendarIcon className="h-3 w-3" />
                            {lead.extractedEventDate}
                          </div>
                        )}
                        {lead.extractedGuestCount && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <UsersIcon className="h-3 w-3" />
                            {lead.extractedGuestCount} guests
                          </div>
                        )}
                        {lead.extractedVenue && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <MapPinIcon className="h-3 w-3" />
                            <span className="truncate">{lead.extractedVenue}</span>
                          </div>
                        )}
                        {lead.eventSummary && !lead.extractedEventType && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {lead.eventSummary}
                          </div>
                        )}
                      </div>
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
                          className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          data-testid={`button-view-${lead.id}`}
                        >
                          <EyeIcon className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteClick(lead.id, e)}
                          aria-label="Delete lead"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          data-testid={`button-delete-${lead.id}`}
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
        
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the lead and all its data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-500 hover:bg-red-600" data-testid="button-confirm-delete">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedLeads.length} leads?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the selected leads and all their data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDeleteConfirm} className="bg-red-500 hover:bg-red-600" data-testid="button-confirm-bulk-delete">
                Delete {selectedLeads.length} leads
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
