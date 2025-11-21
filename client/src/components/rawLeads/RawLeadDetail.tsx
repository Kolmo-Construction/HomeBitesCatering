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
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { RawLead } from '@/../../shared/schema';
import { format } from 'date-fns';
import { 
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
  DollarSignIcon,
  MessageSquareIcon,
  ArrowRightIcon,
  LightbulbIcon,
  TargetIcon,
  ThermometerIcon,
  ZapIcon,
  InfoIcon,
  EditIcon,
  SaveIcon,
  XIcon
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

interface RawLeadDetailProps {
  leadId: number;
}

export default function RawLeadDetail({ leadId }: RawLeadDetailProps) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [notes, setNotes] = React.useState<string>('');
  const [status, setStatus] = React.useState<string>('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState<boolean>(false);
  const [isEditMode, setIsEditMode] = React.useState<boolean>(false);
  
  // Edit form fields
  const [editForm, setEditForm] = React.useState({
    extractedProspectName: '',
    extractedProspectEmail: '',
    extractedProspectPhone: '',
    extractedEventType: '',
    extractedEventDate: '',
    extractedEventTime: '',
    extractedGuestCount: '',
    extractedVenue: '',
    eventSummary: '',
  });

  const { data: rawLead, isLoading, error } = useQuery<RawLead>({
    queryKey: [`/api/raw-leads/${leadId}`],
    queryFn: async () => {
      const response = await fetch(`/api/raw-leads/${leadId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch raw lead');
      }
      return response.json();
    },
  });
  
  React.useEffect(() => {
    if (rawLead) {
      setNotes(rawLead.notes || '');
      setStatus(rawLead.status);
      setEditForm({
        extractedProspectName: rawLead.extractedProspectName || '',
        extractedProspectEmail: rawLead.extractedProspectEmail || '',
        extractedProspectPhone: rawLead.extractedProspectPhone || '',
        extractedEventType: rawLead.extractedEventType || '',
        extractedEventDate: rawLead.extractedEventDate || '',
        extractedEventTime: rawLead.extractedEventTime || '',
        extractedGuestCount: rawLead.extractedGuestCount?.toString() || '',
        extractedVenue: rawLead.extractedVenue || '',
        eventSummary: rawLead.eventSummary || '',
      });
    }
  }, [rawLead]);

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
  
  const deleteLeadMutation = useMutation({
    mutationFn: async () => {
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
      navigate('/raw-leads');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lead. Please try again.",
        variant: "destructive",
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
    updateLeadMutation.mutate({ status: newStatus as any });
  };

  const handleConvertClick = () => {
    navigate(`/opportunities/new?fromRawLeadId=${leadId}`);
  };
  
  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = () => {
    deleteLeadMutation.mutate();
    setIsDeleteDialogOpen(false);
  };

  const handleEditClick = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    // Reset form to original values
    if (rawLead) {
      setEditForm({
        extractedProspectName: rawLead.extractedProspectName || '',
        extractedProspectEmail: rawLead.extractedProspectEmail || '',
        extractedProspectPhone: rawLead.extractedProspectPhone || '',
        extractedEventType: rawLead.extractedEventType || '',
        extractedEventDate: rawLead.extractedEventDate || '',
        extractedEventTime: rawLead.extractedEventTime || '',
        extractedGuestCount: rawLead.extractedGuestCount?.toString() || '',
        extractedVenue: rawLead.extractedVenue || '',
        eventSummary: rawLead.eventSummary || '',
      });
    }
  };

  const handleSaveEdit = () => {
    updateLeadMutation.mutate({
      extractedProspectName: editForm.extractedProspectName || null,
      extractedProspectEmail: editForm.extractedProspectEmail || null,
      extractedProspectPhone: editForm.extractedProspectPhone || null,
      extractedEventType: editForm.extractedEventType || null,
      extractedEventDate: editForm.extractedEventDate || null,
      extractedEventTime: editForm.extractedEventTime || null,
      extractedGuestCount: editForm.extractedGuestCount ? parseInt(editForm.extractedGuestCount) : null,
      extractedVenue: editForm.extractedVenue || null,
      eventSummary: editForm.eventSummary || null,
    });
    setIsEditMode(false);
  };

  const handleEditFormChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper functions
  const getEventTypeIcon = (eventType?: string | null) => {
    if (!eventType) return <CalendarIcon className="h-5 w-5 text-gray-400" />;
    
    const lowerType = eventType.toLowerCase();
    if (lowerType.includes('wedding')) {
      return <HeartIcon className="h-5 w-5 text-pink-500" />;
    } else if (lowerType.includes('corporate') || lowerType.includes('business')) {
      return <BriefcaseIcon className="h-5 w-5 text-blue-600" />;
    } else if (lowerType.includes('birthday') || lowerType.includes('party')) {
      return <CakeIcon className="h-5 w-5 text-purple-500" />;
    } else {
      return <SparklesIcon className="h-5 w-5 text-indigo-500" />;
    }
  };

  const getLeadQualityColor = (quality?: string | null) => {
    switch (quality) {
      case 'hot': return 'text-red-500';
      case 'warm': return 'text-orange-500';
      case 'cold': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getLeadQualityBgColor = (quality?: string | null) => {
    switch (quality) {
      case 'hot': return 'bg-red-50 border-red-200';
      case 'warm': return 'bg-orange-50 border-orange-200';
      case 'cold': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getScoreProgress = (score?: string | null) => {
    if (!score) return 0;
    return parseInt(score) * 20; // Convert 1-5 to 0-100
  };

  const getSourceEmail = (lead: RawLead): string => {
    try {
      const rawData = lead.rawData as any;
      if (rawData?.parser_metadata?.internal_sender_email) {
        return rawData.parser_metadata.internal_sender_email;
      }
    } catch (e) {
      // Fallback
    }
    return lead.extractedProspectEmail || 'Unknown';
  };

  const getSourcePlatform = (lead: RawLead): string => {
    try {
      const rawData = lead.rawData as any;
      if (rawData?.parser_metadata?.source_system) {
        return rawData.parser_metadata.source_system;
      }
    } catch (e) {
      // Fallback
    }
    return lead.leadSourcePlatform || lead.source;
  };

  const getDetailedUrgencyExplanation = (score?: string | null): string => {
    const scoreNum = parseInt(score || '0');
    if (scoreNum >= 4) {
      return 'Event is coming up soon or client explicitly mentioned urgency. Respond within 24 hours to secure this booking.';
    } else if (scoreNum >= 3) {
      return 'Moderate timeline - client is planning ahead but expects a timely response. Aim to respond within 48 hours.';
    } else {
      return 'Client is in early planning stages or no specific timeline mentioned. Follow up within 3-5 days with initial availability and pricing.';
    }
  };

  const getDetailedClarityExplanation = (score?: string | null): string => {
    const scoreNum = parseInt(score || '0');
    if (scoreNum >= 4) {
      return 'Client provided specific details about event type, date, guest count, and requirements. You have enough information to prepare a detailed quote.';
    } else if (scoreNum >= 3) {
      return 'Client provided basic event information but some key details are missing. Request additional information about preferences, dietary restrictions, or service style.';
    } else {
      return 'Request is vague or incomplete. Schedule a consultation call to understand their needs, event vision, and must-have services before quoting.';
    }
  };

  const getDetailedBudgetExplanation = (indication?: string | null, value?: number | null): string => {
    if (value) {
      return `Client specified a budget of $${value.toLocaleString()}. Prepare menu options within this range and clearly show value for their investment.`;
    } else if (indication === 'high') {
      return 'Client indicated a premium budget or high-end expectations. Present your signature packages and highlight customization options.';
    } else if (indication === 'medium') {
      return 'Client has a moderate budget range in mind. Offer flexible package tiers showing different price points and what\'s included at each level.';
    } else if (indication === 'low') {
      return 'Budget-conscious client or mentioned looking for affordable options. Focus on value packages and clearly explain what makes your pricing competitive.';
    } else {
      return 'No budget mentioned yet. Include a range of package options (3-4 tiers) in your response so client can self-select their comfort zone.';
    }
  };

  const generateSmartNextStep = (lead: RawLead): string => {
    const urgency = parseInt(lead.aiUrgencyScore || '0');
    const clarity = parseInt(lead.aiClarityOfRequestScore || '0');
    const quality = lead.aiOverallLeadQuality;
    const eventType = lead.extractedEventType?.toLowerCase() || '';
    const hasPhone = !!lead.extractedProspectPhone;
    const hasEmail = !!lead.extractedProspectEmail;

    // Hot leads - immediate action required
    if (quality === 'hot' || urgency >= 4) {
      if (clarity >= 4 && hasPhone) {
        return `🔥 PRIORITY: Call ${lead.extractedProspectName || 'client'} at ${lead.extractedProspectPhone} within 4 hours. Event details are clear - prepare a preliminary quote before calling. Mention you saw their inquiry and can discuss menu options immediately.`;
      } else if (clarity >= 4) {
        return `🔥 PRIORITY: Email detailed quote within 12 hours. Include 2-3 package options with pricing, sample menus for ${eventType || 'their event'}, and your availability for ${lead.extractedEventDate || 'their date'}. Follow up with a call within 24 hours if no response.`;
      } else if (hasPhone) {
        return `🔥 PRIORITY: Call ${lead.extractedProspectName || 'client'} within 12 hours to gather missing details. Prepare questions about: ${clarity < 3 ? 'event type, date, guest count, venue, ' : ''}dietary preferences, service style, and budget. Offer to send preliminary options after the call.`;
      } else {
        return `🔥 PRIORITY: Send personalized email within 8 hours asking key questions to clarify their needs. Include 2-3 photos of similar ${eventType || 'events'} you've catered. Request a 15-minute call to discuss their vision and provide accurate pricing.`;
      }
    }

    // Warm leads - prompt response needed
    if (quality === 'warm' || urgency >= 3) {
      if (clarity >= 4) {
        return `⚡ Send comprehensive proposal within 24 hours including: menu options for ${lead.extractedGuestCount || 'their guest count'}, transparent pricing breakdown, and available dates. Highlight your experience with ${eventType || 'similar events'}. Schedule a tasting if budget allows.`;
      } else if (hasEmail) {
        return `⚡ Email within 24 hours with a friendly questionnaire to gather: ${clarity < 3 ? 'event date, guest count, ' : ''}service preferences (buffet/plated/family-style), dietary needs, and desired atmosphere. Attach your portfolio PDF and offer a consultation call.`;
      } else {
        return `⚡ Respond within 24-48 hours through available contact method. Ask clarifying questions about their event vision and requirements. Share your availability calendar and suggest times for a phone consultation.`;
      }
    }

    // Cold leads - nurture and educate
    if (clarity >= 3) {
      return `📧 Send welcome email within 48 hours introducing your catering services. Include: your menu showcase PDF, starting price ranges, typical packages for ${eventType || 'events'}, and testimonials. Invite them to schedule a no-obligation consultation when they're ready.`;
    } else {
      return `📧 Send informative response within 2-3 days with helpful resources: typical ${eventType || 'event'} planning timeline, catering checklist, sample menus, and starting prices. Offer to answer questions as they develop their plans. Add to newsletter list for gentle follow-up.`;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
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
          <Button onClick={() => navigate('/raw-leads')} data-testid="button-back-to-list">Back to List</Button>
        </CardFooter>
      </Card>
    );
  }

  const formatJsonData = (data: any): string => {
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="space-y-4" data-testid="lead-detail-container">
      {/* Hero Section - Lead Quality Overview */}
      <Card className={`border-2 ${getLeadQualityBgColor(rawLead.aiOverallLeadQuality)}`}>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {rawLead.extractedProspectName || 'Unnamed Lead'}
                </h1>
                {rawLead.aiOverallLeadQuality && (
                  <Badge className={`${getLeadQualityColor(rawLead.aiOverallLeadQuality)} border-current bg-white text-lg px-3 py-1`} variant="outline">
                    <ThermometerIcon className="h-4 w-4 mr-1" />
                    {rawLead.aiOverallLeadQuality.toUpperCase()} Lead
                  </Badge>
                )}
                {rawLead.createdOpportunityId && (
                  <Badge className="bg-green-500 hover:bg-green-600 text-white">
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    Converted
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <ClockIcon className="h-4 w-4" />
                Received on {format(new Date(rawLead.receivedAt), 'MMMM d, yyyy • h:mm a')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <Button variant="outline" onClick={handleCancelEdit} size="sm" data-testid="button-cancel-edit">
                    <XIcon className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} size="sm" data-testid="button-save-edit">
                    <SaveIcon className="h-4 w-4 mr-1" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  {!rawLead.createdOpportunityId && (
                    <Button variant="outline" onClick={handleEditClick} size="sm" data-testid="button-edit">
                      <EditIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  <Select 
                    value={status} 
                    onValueChange={handleStatusChange}
                    disabled={!!rawLead.createdOpportunityId}
                  >
                    <SelectTrigger className="w-[160px]" data-testid="select-status">
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
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Contact Information Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TargetIcon className="h-5 w-5 text-blue-600" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MailIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 mb-1">Name</p>
                {isEditMode ? (
                  <Input
                    value={editForm.extractedProspectName}
                    onChange={(e) => handleEditFormChange('extractedProspectName', e.target.value)}
                    placeholder="Client name"
                    className="text-sm"
                    data-testid="input-prospect-name"
                  />
                ) : (
                  <p className="font-medium text-sm break-all">{rawLead.extractedProspectName || 'Not provided'}</p>
                )}
              </div>
            </div>
            
            <Separator />

            <div className="flex items-start gap-3">
              <MailIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 mb-1">Email</p>
                {isEditMode ? (
                  <Input
                    type="email"
                    value={editForm.extractedProspectEmail}
                    onChange={(e) => handleEditFormChange('extractedProspectEmail', e.target.value)}
                    placeholder="email@example.com"
                    className="text-sm"
                    data-testid="input-prospect-email"
                  />
                ) : (
                  <p className="font-medium text-sm break-all">{rawLead.extractedProspectEmail || 'Not provided'}</p>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-start gap-3">
              <PhoneIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 mb-1">Phone</p>
                {isEditMode ? (
                  <Input
                    type="tel"
                    value={editForm.extractedProspectPhone}
                    onChange={(e) => handleEditFormChange('extractedProspectPhone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="text-sm"
                    data-testid="input-prospect-phone"
                  />
                ) : (
                  <p className="font-medium text-sm">{rawLead.extractedProspectPhone || 'Not provided'}</p>
                )}
              </div>
            </div>
            
            {!isEditMode && (
              <>
                <Separator />
                
                <div className="flex items-start gap-3">
                  <MessageSquareIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500 mb-1">Source</p>
                    <p className="font-medium text-sm break-all">{getSourceEmail(rawLead)}</p>
                    <p className="text-xs text-gray-500 mt-1">via {getSourcePlatform(rawLead)}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Event Details Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {getEventTypeIcon(rawLead.extractedEventType)}
              Event Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Event Type</p>
                  {isEditMode ? (
                    <Input
                      value={editForm.extractedEventType}
                      onChange={(e) => handleEditFormChange('extractedEventType', e.target.value)}
                      placeholder="Wedding, Corporate, etc."
                      className="text-sm"
                      data-testid="input-event-type"
                    />
                  ) : (
                    <p className="font-semibold">{rawLead.extractedEventType || 'Not specified'}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Event Date</p>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <Input
                        type="date"
                        value={editForm.extractedEventDate}
                        onChange={(e) => handleEditFormChange('extractedEventDate', e.target.value)}
                        className="text-sm"
                        data-testid="input-event-date"
                      />
                      <Input
                        type="time"
                        value={editForm.extractedEventTime}
                        onChange={(e) => handleEditFormChange('extractedEventTime', e.target.value)}
                        placeholder="Time"
                        className="text-sm"
                        data-testid="input-event-time"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold">{rawLead.extractedEventDate || 'Not specified'}</p>
                      {rawLead.extractedEventTime && (
                        <p className="text-xs text-gray-500">{rawLead.extractedEventTime}</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                  <UsersIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Guest Count</p>
                  {isEditMode ? (
                    <Input
                      type="number"
                      value={editForm.extractedGuestCount}
                      onChange={(e) => handleEditFormChange('extractedGuestCount', e.target.value)}
                      placeholder="50"
                      className="text-sm"
                      data-testid="input-guest-count"
                    />
                  ) : (
                    <p className="font-semibold">{rawLead.extractedGuestCount ? `${rawLead.extractedGuestCount} guests` : 'Not specified'}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                  <MapPinIcon className="h-5 w-5 text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 mb-1">Venue</p>
                  {isEditMode ? (
                    <Input
                      value={editForm.extractedVenue}
                      onChange={(e) => handleEditFormChange('extractedVenue', e.target.value)}
                      placeholder="Venue name or location"
                      className="text-sm"
                      data-testid="input-venue"
                    />
                  ) : (
                    <p className="font-semibold truncate">{rawLead.extractedVenue || 'Not specified'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-1">Event Summary</p>
              {isEditMode ? (
                <Textarea
                  value={editForm.eventSummary}
                  onChange={(e) => handleEditFormChange('eventSummary', e.target.value)}
                  placeholder="Brief summary of the event..."
                  className="min-h-[80px]"
                  data-testid="input-event-summary"
                />
              ) : (
                rawLead.eventSummary && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{rawLead.eventSummary}</p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessment Insights - WHY is this lead hot/warm/cold */}
      <Card className="border-l-4 border-l-indigo-500">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LightbulbIcon className="h-5 w-5 text-yellow-500" />
            Assessment Insights
          </CardTitle>
          <CardDescription>Understanding why this lead was classified as {rawLead.aiOverallLeadQuality || 'unscored'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scoring Breakdown with Detailed Explanations */}
          <div className="space-y-4">
            {/* Urgency Score */}
            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <ZapIcon className="h-5 w-5 text-orange-500" />
                  Urgency Score
                </span>
                <span className="text-lg font-bold text-orange-600">{rawLead.aiUrgencyScore || 0}/5</span>
              </div>
              <Progress value={getScoreProgress(rawLead.aiUrgencyScore)} className="h-2 mb-2" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {getDetailedUrgencyExplanation(rawLead.aiUrgencyScore)}
              </p>
            </div>

            {/* Clarity Score */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <TargetIcon className="h-5 w-5 text-blue-500" />
                  Request Clarity Score
                </span>
                <span className="text-lg font-bold text-blue-600">{rawLead.aiClarityOfRequestScore || 0}/5</span>
              </div>
              <Progress value={getScoreProgress(rawLead.aiClarityOfRequestScore)} className="h-2 mb-2" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {getDetailedClarityExplanation(rawLead.aiClarityOfRequestScore)}
              </p>
            </div>

            {/* Budget Indication */}
            <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <DollarSignIcon className="h-5 w-5 text-green-500" />
                  Budget Indicator
                </span>
                <span className="text-lg font-bold text-green-600 capitalize">
                  {rawLead.aiBudgetValue ? `$${rawLead.aiBudgetValue.toLocaleString()}` : (rawLead.aiBudgetIndication || 'Unknown')}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div 
                  className={`h-full transition-all ${
                    rawLead.aiBudgetIndication === 'high' || rawLead.aiBudgetIndication === 'specific_amount' ? 'bg-green-500 w-full' :
                    rawLead.aiBudgetIndication === 'medium' ? 'bg-yellow-500 w-2/3' :
                    rawLead.aiBudgetIndication === 'low' ? 'bg-red-500 w-1/3' :
                    'bg-gray-400 w-1/4'
                  }`}
                />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {getDetailedBudgetExplanation(rawLead.aiBudgetIndication, rawLead.aiBudgetValue)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Key Requirements */}
          {rawLead.aiKeyRequirements && Array.isArray(rawLead.aiKeyRequirements) && rawLead.aiKeyRequirements.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-600" />
                Key Requirements
              </h4>
              <ul className="space-y-2">
                {(rawLead.aiKeyRequirements as string[]).map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Potential Concerns */}
          {rawLead.aiPotentialRedFlags && Array.isArray(rawLead.aiPotentialRedFlags) && rawLead.aiPotentialRedFlags.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <AlertCircleIcon className="h-4 w-4 text-amber-600" />
                Potential Concerns
              </h4>
              <ul className="space-y-2">
                {(rawLead.aiPotentialRedFlags as string[]).map((flag, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-600 mt-0.5">⚠</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Smart Next Step Recommendation */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border-2 border-indigo-300 dark:border-indigo-700">
            <h4 className="font-bold text-base mb-3 flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
              <ArrowRightIcon className="h-5 w-5" />
              Recommended Action Plan
            </h4>
            <p className="text-sm leading-relaxed text-indigo-900 dark:text-indigo-100">
              {generateSmartNextStep(rawLead)}
            </p>
          </div>

          {/* Sentiment */}
          {rawLead.aiSentiment && (
            <div className="flex items-center gap-2 text-sm">
              <InfoIcon className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">
                Client Sentiment: <span className="font-medium capitalize">{rawLead.aiSentiment}</span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes and Raw Data Tabs */}
      <Card>
        <Tabs defaultValue="notes">
          <CardHeader>
            <TabsList>
              <TabsTrigger value="notes" data-testid="tab-notes">Notes</TabsTrigger>
              <TabsTrigger value="raw-data" data-testid="tab-raw-data">Raw Data</TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="notes" className="px-6 pb-6">
            <Textarea
              placeholder="Add internal notes about this lead..."
              className="min-h-[200px]"
              value={notes}
              onChange={handleNotesChange}
              onBlur={handleNotesBlur}
              data-testid="textarea-notes"
            />
          </TabsContent>

          <TabsContent value="raw-data" className="px-6 pb-6">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto max-h-[400px]">
              <pre className="text-xs">
                {rawLead.rawData ? formatJsonData(rawLead.rawData) : 'No raw data available'}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 pb-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/raw-leads')} data-testid="button-back">
            Back to List
          </Button>
          {!rawLead.createdOpportunityId && (
            <Button 
              variant="destructive" 
              onClick={handleDeleteClick}
              className="flex items-center gap-1"
              data-testid="button-delete"
            >
              <Trash2Icon className="h-4 w-4" />
              Delete Lead
            </Button>
          )}
        </div>
        <div>
          {!rawLead.createdOpportunityId && status !== 'junk' && (
            <Button 
              onClick={handleConvertClick}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90"
              data-testid="button-convert"
            >
              <ZapIcon className="h-4 w-4 mr-2" />
              Convert to Opportunity
            </Button>
          )}
          {rawLead.createdOpportunityId && (
            <Button 
              variant="outline" 
              onClick={() => navigate(`/opportunities/${rawLead.createdOpportunityId}`)}
              className="text-green-600 border-green-600 hover:bg-green-50"
              data-testid="button-view-opportunity"
            >
              View Linked Opportunity #{rawLead.createdOpportunityId}
            </Button>
          )}
        </div>
      </div>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lead and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
