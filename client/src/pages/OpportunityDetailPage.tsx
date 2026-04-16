import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Pencil, Plus, Trash2, Mail, Phone, MessageSquare, Calendar, X, Send, Loader2, ExternalLink, Check, Brain, TrendingUp, AlertTriangle, Target, ThermometerSun, DollarSign, Lightbulb } from "lucide-react";
import { z } from "zod";
// Import types directly with relative path since the alias isn't working
import { Opportunity, ContactIdentifier, Communication } from "../types/opportunity";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const contactIdentifierSchema = z.object({
  type: z.enum(["email", "phone"]),
  value: z.string().min(1, "Value is required"),
  isPrimary: z.boolean().default(false),
});

const communicationSchema = z.object({
  type: z.enum(["email", "call", "sms", "note", "meeting"]),
  direction: z.enum(["incoming", "outgoing", "internal"]),
  subject: z.string().optional(),
  bodyRaw: z.string().min(1, "Content is required"),
  date: z.date(),
});

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const opportunityId = parseInt(id);
  const [_, navigate] = useLocation();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Track dialog states
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddCommunicationOpen, setIsAddCommunicationOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // Set up forms with Zod validation
  const contactForm = useForm<z.infer<typeof contactIdentifierSchema>>({
    resolver: zodResolver(contactIdentifierSchema),
    defaultValues: { 
      type: "email",
      value: "",
      isPrimary: false,
    },
  });
  
  const communicationForm = useForm<z.infer<typeof communicationSchema>>({
    resolver: zodResolver(communicationSchema),
    defaultValues: {
      type: "note",
      direction: "internal",
      subject: "",
      bodyRaw: "",
      date: new Date(),
    },
  });
  
  // Fetch opportunity data
  const { data: opportunity, isLoading: isLoadingOpportunity } = useQuery({
    queryKey: ["/api/opportunities", opportunityId],
    queryFn: async () => {
      const res = await fetch(`/api/opportunities/${opportunityId}`);
      if (!res.ok) throw new Error("Failed to fetch opportunity");
      return res.json() as Promise<Opportunity>;
    },
  });
  
  // Fetch contact identifiers
  const { data: contactIdentifiers = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ["/api/opportunities", opportunityId, "contact-identifiers"],
    queryFn: async () => {
      const res = await fetch(`/api/opportunities/${opportunityId}/contact-identifiers`);
      if (!res.ok) throw new Error("Failed to fetch contact identifiers");
      return res.json() as Promise<ContactIdentifier[]>;
    },
  });
  
  // Fetch communications
  const { data: communications = [], isLoading: isLoadingCommunications } = useQuery({
    queryKey: ["/api/opportunities", opportunityId, "communications"],
    queryFn: async () => {
      const res = await fetch(`/api/opportunities/${opportunityId}/communications`);
      if (!res.ok) throw new Error("Failed to fetch communications");
      return res.json() as Promise<Communication[]>;
    },
  });
  
  // Add contact identifier mutation
  const addContactMutation = useMutation({
    mutationFn: async (data: z.infer<typeof contactIdentifierSchema>) => {
      const res = await fetch("/api/contact-identifiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          opportunityId,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add contact identifier");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities", opportunityId, "contact-identifiers"] });
      toast({
        title: "Contact Added",
        description: "The contact identifier has been added successfully.",
      });
      contactForm.reset();
      setIsAddContactOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Add communication mutation
  const addCommunicationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof communicationSchema>) => {
      const { date, ...rest } = data;
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rest,
          opportunityId,
          timestamp: date.toISOString(),
          userId: user?.id,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add communication");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities", opportunityId, "communications"] });
      toast({
        title: "Communication Added",
        description: "The communication record has been added successfully.",
      });
      communicationForm.reset();
      setIsAddCommunicationOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete contact identifier mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      const res = await fetch(`/api/contact-identifiers/${contactId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete contact identifier");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities", opportunityId, "contact-identifiers"] });
      toast({
        title: "Contact Deleted",
        description: "The contact identifier has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete opportunity mutation
  const deleteOpportunityMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete opportunity");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Opportunity Deleted",
        description: "The lead has been deleted successfully.",
      });
      // Navigate back to opportunities list after deletion
      navigate("/opportunities");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const { data: inquiryStatus } = useQuery({
    queryKey: ["/api/opportunities", opportunityId, "inquiry-status"],
    queryFn: async () => {
      const res = await fetch(`/api/opportunities/${opportunityId}/inquiry-status`);
      if (!res.ok) return null;
      return res.json() as Promise<{
        sent: boolean;
        sentAt: string | null;
        opened: boolean;
        openedAt: string | null;
        submitted: boolean;
        submittedAt: string | null;
        inquiryId: number | null;
        inquiryStatus: string | null;
      }>;
    },
  });

  const sendInquiryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/opportunities/${opportunityId}/send-inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send inquiry");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities", opportunityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities", opportunityId, "inquiry-status"] });
      toast({
        title: "Inquiry Sent",
        description: `Menu planner emailed to ${opportunity?.email}. Their response will appear in Inquiries.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit handlers for forms
  const onSubmitContact = (data: z.infer<typeof contactIdentifierSchema>) => {
    addContactMutation.mutate(data);
  };
  
  const onSubmitCommunication = (data: z.infer<typeof communicationSchema>) => {
    addCommunicationMutation.mutate(data);
  };
  
  // Loading state
  if (isLoadingOpportunity) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Error state
  if (!opportunity) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Opportunity Not Found</h2>
        <p className="text-gray-600">The opportunity you're looking for doesn't exist or has been deleted.</p>
        <Button className="mt-4" onClick={() => navigate("/opportunities")}>
          Back to Opportunities
        </Button>
      </div>
    );
  }
  
  // Helper functions to filter and display contact information
  const getEmailContacts = () => contactIdentifiers.filter((ci: ContactIdentifier) => ci.type === "email").map((ci: ContactIdentifier) => ci.value);
  const getPhoneContacts = () => contactIdentifiers.filter((ci: ContactIdentifier) => ci.type === "phone").map((ci: ContactIdentifier) => ci.value);
  
  // Get primary email and phone if any
  const primaryEmail = contactIdentifiers.find((ci: ContactIdentifier) => ci.type === "email" && ci.isPrimary)?.value || opportunity.email;
  const primaryPhone = contactIdentifiers.find((ci: ContactIdentifier) => ci.type === "phone" && ci.isPrimary)?.value || opportunity.phone;
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with opportunity name and actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {opportunity.firstName} {opportunity.lastName}
          </h1>
          <p className="text-gray-500">{opportunity.email}</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => sendInquiryMutation.mutate()}
            disabled={sendInquiryMutation.isPending}
          >
            {sendInquiryMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {(opportunity as any).inquirySentAt ? "Resend Inquiry" : "Send Inquiry"}
          </Button>
          <Button variant="outline" onClick={() => navigate(`/opportunities/${opportunity.id}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Opportunity
          </Button>
          <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Lead</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this lead? This action cannot be undone. All associated communications, contacts, and data will be removed.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    deleteOpportunityMutation.mutate();
                    setIsDeleteConfirmOpen(false);
                  }}
                  disabled={deleteOpportunityMutation.isPending}
                >
                  {deleteOpportunityMutation.isPending ? "Deleting..." : "Delete Lead"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="default" onClick={() => navigate("/opportunities")}>
            Back to Opportunities
          </Button>
        </div>
      </div>
      
      {/* Inquiry status tracker */}
      {inquiryStatus?.sent && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Inquiry Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-0">
              {/* Sent */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium mt-1">Sent</span>
                {inquiryStatus.sentAt && (
                  <span className="text-[10px] text-muted-foreground">{format(new Date(inquiryStatus.sentAt), "MMM d, h:mm a")}</span>
                )}
              </div>
              {/* Connector */}
              <div className={cn("flex-1 h-0.5 mb-6", inquiryStatus.opened ? "bg-green-500" : "bg-gray-200")} />
              {/* Opened */}
              <div className="flex flex-col items-center">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", inquiryStatus.opened ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400")}>
                  {inquiryStatus.opened ? <Check className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                </div>
                <span className="text-xs font-medium mt-1">Opened</span>
                {inquiryStatus.openedAt && (
                  <span className="text-[10px] text-muted-foreground">{format(new Date(inquiryStatus.openedAt), "MMM d, h:mm a")}</span>
                )}
              </div>
              {/* Connector */}
              <div className={cn("flex-1 h-0.5 mb-6", inquiryStatus.submitted ? "bg-green-500" : "bg-gray-200")} />
              {/* Submitted */}
              <div className="flex flex-col items-center">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", inquiryStatus.submitted ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400")}>
                  {inquiryStatus.submitted ? <Check className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                </div>
                <span className="text-xs font-medium mt-1">Submitted</span>
                {inquiryStatus.submittedAt && (
                  <span className="text-[10px] text-muted-foreground">{format(new Date(inquiryStatus.submittedAt), "MMM d, h:mm a")}</span>
                )}
              </div>
            </div>
            {inquiryStatus.submitted && inquiryStatus.inquiryId && (
              <div className="mt-3 pt-3 border-t">
                <Button size="sm" variant="outline" onClick={() => navigate(`/quote-requests?id=${inquiryStatus.inquiryId}`)}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  View Inquiry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Opportunity details card */}
      <Card>
        <CardHeader>
          <CardTitle>Opportunity Details</CardTitle>
          <CardDescription>
            Created on {format(new Date(opportunity.createdAt), "PPP")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <Label>Status</Label>
                <div>
                  <Badge variant={opportunity.status === "new" ? "default" : opportunity.status === "contacted" ? "outline" : "secondary"}>
                    {opportunity.status.charAt(0).toUpperCase() + opportunity.status.slice(1)}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label>Priority</Label>
                <div>
                  {(() => {
                    const priority = opportunity.priority || "medium";
                    let badgeClass = "";
                    let textColor = "text-white"; // Default text color for badges

                    switch (priority) {
                      case 'hot':
                        badgeClass = "bg-red-600 hover:bg-red-700"; // More intense red for hot
                        break;
                      case 'high':
                        badgeClass = "bg-orange-500 hover:bg-orange-600";
                        break;
                      case 'medium':
                        badgeClass = "bg-yellow-500 hover:bg-yellow-600";
                        textColor = "text-gray-800"; // Darker text for yellow bg
                        break;
                      case 'low':
                        badgeClass = "bg-blue-500 hover:bg-blue-600";
                        break;
                      default:
                        badgeClass = "bg-gray-400 hover:bg-gray-500";
                    }
                    
                    return (
                      <Badge className={cn("capitalize px-2.5 py-1 text-xs font-semibold", badgeClass, textColor)}>
                        {priority}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
              
              <div>
                <Label>Event Type</Label>
                <div className="font-medium">{opportunity.eventType}</div>
              </div>
              
              {opportunity.eventDate && (
                <div>
                  <Label>Event Date</Label>
                  <div className="font-medium">{format(new Date(opportunity.eventDate), "PPP")}</div>
                </div>
              )}
              
              {opportunity.guestCount && (
                <div>
                  <Label>Guest Count</Label>
                  <div className="font-medium">{opportunity.guestCount}</div>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              {opportunity.venue && (
                <div>
                  <Label>Venue</Label>
                  <div className="font-medium">{opportunity.venue}</div>
                </div>
              )}
              
              {opportunity.opportunitySource && (
                <div>
                  <Label>Opportunity Source</Label>
                  <div className="font-medium">{opportunity.opportunitySource}</div>
                </div>
              )}
              
              {opportunity.notes && (
                <div>
                  <Label>Notes</Label>
                  <div className="text-sm text-gray-600">{opportunity.notes}</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* AI Lead Insights — shown when this opportunity was created from a raw lead */}
      {opportunity.leadData && Object.keys(opportunity.leadData).length > 0 && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-purple-600" />
              AI Lead Insights
            </CardTitle>
            <CardDescription>Scoring and analysis from when this lead was processed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {opportunity.leadData.overallQuality && (
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 mt-0.5 text-purple-500" />
                  <div>
                    <div className="text-xs text-gray-500">Lead Quality</div>
                    <div className="font-semibold capitalize">{opportunity.leadData.overallQuality}</div>
                  </div>
                </div>
              )}
              {opportunity.leadData.urgencyScore && (
                <div className="flex items-start gap-2">
                  <ThermometerSun className="h-4 w-4 mt-0.5 text-orange-500" />
                  <div>
                    <div className="text-xs text-gray-500">Urgency</div>
                    <div className="font-semibold">{opportunity.leadData.urgencyScore}/5</div>
                    {opportunity.leadData.urgencyReason && (
                      <div className="text-xs text-gray-400">{opportunity.leadData.urgencyReason}</div>
                    )}
                  </div>
                </div>
              )}
              {opportunity.leadData.budgetIndication && (
                <div className="flex items-start gap-2">
                  <DollarSign className="h-4 w-4 mt-0.5 text-green-500" />
                  <div>
                    <div className="text-xs text-gray-500">Budget</div>
                    <div className="font-semibold capitalize">{opportunity.leadData.budgetIndication.replace('_', ' ')}</div>
                    {opportunity.leadData.budgetValue && (
                      <div className="text-xs text-gray-400">${opportunity.leadData.budgetValue.toLocaleString()}</div>
                    )}
                  </div>
                </div>
              )}
              {opportunity.leadData.sentiment && (
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 mt-0.5 text-blue-500" />
                  <div>
                    <div className="text-xs text-gray-500">Sentiment</div>
                    <div className="font-semibold capitalize">{opportunity.leadData.sentiment}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Key requirements & red flags */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {opportunity.leadData.keyRequirements && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" /> Key Requirements
                  </div>
                  <ul className="text-sm space-y-0.5">
                    {(Array.isArray(opportunity.leadData.keyRequirements)
                      ? opportunity.leadData.keyRequirements
                      : [opportunity.leadData.keyRequirements]
                    ).map((req: string, i: number) => (
                      <li key={i} className="text-gray-600">- {req}</li>
                    ))}
                  </ul>
                </div>
              )}
              {opportunity.leadData.redFlags && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" /> Red Flags
                  </div>
                  <ul className="text-sm space-y-0.5">
                    {(Array.isArray(opportunity.leadData.redFlags)
                      ? opportunity.leadData.redFlags
                      : [opportunity.leadData.redFlags]
                    ).map((flag: string, i: number) => (
                      <li key={i} className="text-amber-600">- {flag}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {opportunity.leadData.suggestedNextStep && (
              <div className="mt-3 p-2 bg-purple-100 rounded text-sm">
                <span className="font-medium">Suggested next step:</span> {opportunity.leadData.suggestedNextStep}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs for contact info and communications */}
      <Tabs defaultValue="contacts" className="w-full">
        <TabsList>
          <TabsTrigger value="contacts">Contact Information</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>
        
        {/* Contact Information Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Contact Information</h2>
            <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Contact Information</DialogTitle>
                  <DialogDescription>
                    Add email or phone number for this opportunity.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...contactForm}>
                  <form onSubmit={contactForm.handleSubmit(onSubmitContact)} className="space-y-4">
                    <FormField
                      control={contactForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={contactForm.control}
                      name="value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={contactForm.watch("type") === "email" ? "email@example.com" : "+1 (555) 123-4567"} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={contactForm.control}
                      name="isPrimary"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="form-checkbox h-4 w-4 text-primary rounded"
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Set as primary contact</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="submit" disabled={addContactMutation.isPending}>
                        {addContactMutation.isPending ? "Adding..." : "Add Contact"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email addresses */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-muted-foreground" />
                  <CardTitle className="text-lg">Email Addresses</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {isLoadingContacts ? (
                    <li className="text-sm text-muted-foreground">Loading...</li>
                  ) : (
                    <>
                      {/* Show primary email from opportunity */}
                      {primaryEmail && (
                        <li className="flex items-center justify-between">
                          <span className="text-sm font-medium">{primaryEmail}</span>
                          <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200">
                            Primary
                          </Badge>
                        </li>
                      )}
                      
                      {/* Show additional emails from contactIdentifiers */}
                      {getEmailContacts()
                        .filter(email => email !== primaryEmail)
                        .map((email, index) => (
                          <li key={index} className="flex items-center justify-between">
                            <span className="text-sm">{email}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const contactId = contactIdentifiers.find(ci => ci.type === "email" && ci.value === email)?.id;
                                if (contactId) deleteContactMutation.mutate(contactId);
                              }}
                              disabled={deleteContactMutation.isPending}
                            >
                              <X className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </li>
                        ))}
                      
                      {!primaryEmail && getEmailContacts().length === 0 && (
                        <li className="text-sm text-muted-foreground">No email addresses</li>
                      )}
                    </>
                  )}
                </ul>
              </CardContent>
            </Card>
            
            {/* Phone numbers */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-muted-foreground" />
                  <CardTitle className="text-lg">Phone Numbers</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {isLoadingContacts ? (
                    <li className="text-sm text-muted-foreground">Loading...</li>
                  ) : (
                    <>
                      {/* Show primary phone from opportunity */}
                      {primaryPhone && (
                        <li className="flex items-center justify-between">
                          <span className="text-sm font-medium">{primaryPhone}</span>
                          <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200">
                            Primary
                          </Badge>
                        </li>
                      )}
                      
                      {/* Show additional phones from contactIdentifiers */}
                      {getPhoneContacts()
                        .filter(phone => phone !== primaryPhone)
                        .map((phone, index) => (
                          <li key={index} className="flex items-center justify-between">
                            <span className="text-sm">{phone}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const contactId = contactIdentifiers.find(ci => ci.type === "phone" && ci.value === phone)?.id;
                                if (contactId) deleteContactMutation.mutate(contactId);
                              }}
                              disabled={deleteContactMutation.isPending}
                            >
                              <X className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </li>
                        ))}
                      
                      {!primaryPhone && getPhoneContacts().length === 0 && (
                        <li className="text-sm text-muted-foreground">No phone numbers</li>
                      )}
                    </>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Communications Timeline</h2>
            <Dialog open={isAddCommunicationOpen} onOpenChange={setIsAddCommunicationOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Communication
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Communication</DialogTitle>
                  <DialogDescription>
                    Record a new communication for this opportunity.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...communicationForm}>
                  <form onSubmit={communicationForm.handleSubmit(onSubmitCommunication)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={communicationForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="call">Call</SelectItem>
                                <SelectItem value="sms">SMS</SelectItem>
                                <SelectItem value="note">Note</SelectItem>
                                <SelectItem value="meeting">Meeting</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={communicationForm.control}
                        name="direction"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Direction</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select direction" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="incoming">Incoming</SelectItem>
                                <SelectItem value="outgoing">Outgoing</SelectItem>
                                <SelectItem value="internal">Internal Note</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={communicationForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Brief subject" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={communicationForm.control}
                      name="bodyRaw"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Communication details" rows={4} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={communicationForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              value={field.value.toISOString().slice(0, 16)}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="submit" disabled={addCommunicationMutation.isPending}>
                        {addCommunicationMutation.isPending ? "Adding..." : "Add Communication"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-4">
            {isLoadingCommunications ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading communications...</p>
              </div>
            ) : communications.length > 0 ? (
              <div className="relative border-l-2 border-muted-foreground/20 pl-6 space-y-6 ml-2">
                {communications
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((comm) => {
                    const isGmailSynced = comm.source === 'gmail_sync';
                    const hasFullEmail = comm.metaData?.hasFullEmailInStorage;
                    
                    return (
                      <div key={comm.id} className="relative">
                        <div className={`absolute -left-8 mt-1.5 h-4 w-4 rounded-full ${isGmailSynced ? 'bg-blue-500' : 'bg-primary'}`}></div>
                        <div className="bg-card rounded-lg p-4 shadow-sm border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {comm.type === "email" && <Mail className="h-4 w-4 text-primary" />}
                              {comm.type === "call" && <Phone className="h-4 w-4 text-green-500" />}
                              {comm.type === "sms" && <MessageSquare className="h-4 w-4 text-blue-500" />}
                              {comm.type === "meeting" && <Calendar className="h-4 w-4 text-purple-500" />}
                              
                              <span className="font-medium text-sm capitalize">
                                {comm.type === "call" ? "Phone Call" : comm.type}
                              </span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {comm.direction}
                              </Badge>
                              
                              {comm.durationMinutes && (
                                <Badge variant="secondary" className="text-xs">
                                  {comm.durationMinutes} min
                                </Badge>
                              )}
                              
                              {isGmailSynced && (
                                <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200">
                                  Gmail
                                </Badge>
                              )}
                              
                              {comm.source === 'openphone' && (
                                <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-200">
                                  OpenPhone
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {comm.timestamp ? (() => {
                                try {
                                  const date = new Date(comm.timestamp);
                                  return isNaN(date.getTime()) ? "Invalid date" : format(date, "PPP p");
                                } catch (e) {
                                  return "Invalid date format";
                                }
                              })() : "Date unavailable"}
                            </span>
                          </div>
                          
                          {comm.subject && (
                            <h3 className="text-sm font-medium mb-1">{comm.subject}</h3>
                          )}
                          
                          {comm.fromAddress && (
                            <p className="text-xs text-muted-foreground mb-2">
                              From: {comm.fromAddress}
                            </p>
                          )}
                          
                          <p className="text-sm whitespace-pre-line">{comm.bodyRaw || comm.bodySummary || ''}</p>
                          
                          {/* Call-specific actions */}
                          {comm.type === "call" && (
                            <div className="flex gap-2 mt-3">
                              {comm.recordingUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => window.open(comm.recordingUrl, '_blank')}
                                  data-testid={`button-play-recording-${comm.id}`}
                                >
                                  <Phone className="h-3 w-3 mr-1" />
                                  Play Recording
                                </Button>
                              )}
                              
                              {comm.bodyRaw && comm.metaData?.hasTranscript && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => {
                                    alert(`Call Transcript:\n\n${comm.bodyRaw}`);
                                  }}
                                  data-testid={`button-view-transcript-${comm.id}`}
                                >
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  View Transcript
                                </Button>
                              )}
                            </div>
                          )}
                          
                          {/* Email-specific actions */}
                          {hasFullEmail && (
                            <Button
                              variant="link"
                              size="sm"
                              className="mt-2 p-0 h-auto text-xs text-blue-600 hover:text-blue-700"
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/communications/${comm.id}/full-email`);
                                  if (response.ok) {
                                    const emailData = await response.json();
                                    console.log('Full email data:', emailData);
                                    // TODO: Open modal or expand to show full email
                                    alert('Full email content fetched! Check console for details.');
                                  } else {
                                    console.error('Failed to fetch full email');
                                  }
                                } catch (error) {
                                  console.error('Error fetching full email:', error);
                                }
                              }}
                            >
                              View Full Email →
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground mt-2">No communications yet</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsAddCommunicationOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Communication
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}