import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Pencil, Plus, Trash2, Mail, Phone, MessageSquare, Calendar, X } from "lucide-react";
import { z } from "zod";
import { Lead, ContactIdentifier, Communication } from "@/types/lead";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  content: z.string().min(1, "Content is required"),
  date: z.date(),
});

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const leadId = parseInt(id);
  const [_, navigate] = useLocation();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Track dialog states
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddCommunicationOpen, setIsAddCommunicationOpen] = useState(false);
  
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
      content: "",
      date: new Date(),
    },
  });
  
  // Fetch lead data
  const { data: lead, isLoading: isLoadingLead } = useQuery({
    queryKey: ["/api/leads", leadId],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}`);
      if (!res.ok) throw new Error("Failed to fetch lead");
      return res.json() as Promise<Lead>;
    },
  });
  
  // Fetch contact identifiers
  const { data: contactIdentifiers = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ["/api/leads", leadId, "contact-identifiers"],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}/contact-identifiers`);
      if (!res.ok) throw new Error("Failed to fetch contact identifiers");
      return res.json() as Promise<ContactIdentifier[]>;
    },
  });
  
  // Fetch communications
  const { data: communications = [], isLoading: isLoadingCommunications } = useQuery({
    queryKey: ["/api/leads", leadId, "communications"],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}/communications`);
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
          leadId,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add contact identifier");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "contact-identifiers"] });
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
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          leadId,
          date: data.date.toISOString(),
          createdBy: user?.id,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add communication");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "communications"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "contact-identifiers"] });
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
  
  // Submit handlers for forms
  const onSubmitContact = (data: z.infer<typeof contactIdentifierSchema>) => {
    addContactMutation.mutate(data);
  };
  
  const onSubmitCommunication = (data: z.infer<typeof communicationSchema>) => {
    addCommunicationMutation.mutate(data);
  };
  
  // Loading state
  if (isLoadingLead) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Error state
  if (!lead) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Lead Not Found</h2>
        <p className="text-gray-600">The lead you're looking for doesn't exist or has been deleted.</p>
        <Button className="mt-4" onClick={() => navigate("/leads")}>
          Back to Leads
        </Button>
      </div>
    );
  }
  
  // Helper functions to filter and display contact information
  const getEmailContacts = () => contactIdentifiers.filter((ci: ContactIdentifier) => ci.type === "email").map((ci: ContactIdentifier) => ci.value);
  const getPhoneContacts = () => contactIdentifiers.filter((ci: ContactIdentifier) => ci.type === "phone").map((ci: ContactIdentifier) => ci.value);
  
  // Get primary email and phone if any
  const primaryEmail = contactIdentifiers.find((ci: ContactIdentifier) => ci.type === "email" && ci.isPrimary)?.value || lead.email;
  const primaryPhone = contactIdentifiers.find((ci: ContactIdentifier) => ci.type === "phone" && ci.isPrimary)?.value || lead.phone;
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with lead name and actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {lead.firstName} {lead.lastName}
          </h1>
          <p className="text-gray-500">{lead.email}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate(`/leads/${lead.id}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Lead
          </Button>
          <Button variant="default" onClick={() => navigate("/leads")}>
            Back to Leads
          </Button>
        </div>
      </div>
      
      {/* Lead details card */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Details</CardTitle>
          <CardDescription>
            Created on {format(new Date(lead.createdAt), "PPP")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <Label>Status</Label>
                <div>
                  <Badge variant={lead.status === "new" ? "default" : lead.status === "contacted" ? "outline" : "secondary"}>
                    {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label>Event Type</Label>
                <div className="font-medium">{lead.eventType}</div>
              </div>
              
              {lead.eventDate && (
                <div>
                  <Label>Event Date</Label>
                  <div className="font-medium">{format(new Date(lead.eventDate), "PPP")}</div>
                </div>
              )}
              
              {lead.guestCount && (
                <div>
                  <Label>Guest Count</Label>
                  <div className="font-medium">{lead.guestCount}</div>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              {lead.venue && (
                <div>
                  <Label>Venue</Label>
                  <div className="font-medium">{lead.venue}</div>
                </div>
              )}
              
              {lead.leadSource && (
                <div>
                  <Label>Lead Source</Label>
                  <div className="font-medium">{lead.leadSource}</div>
                </div>
              )}
              
              {lead.notes && (
                <div>
                  <Label>Notes</Label>
                  <div className="text-sm text-gray-600">{lead.notes}</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
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
                    Add email or phone number for this lead.
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
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Addresses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingContacts ? (
                  <div className="animate-pulse h-20 bg-gray-100 rounded"></div>
                ) : getEmailContacts().length > 0 ? (
                  <ul className="space-y-2">
                    {contactIdentifiers
                      .filter((ci: ContactIdentifier) => ci.type === "email")
                      .map((ci: ContactIdentifier) => (
                        <li key={ci.id} className="flex items-center justify-between group">
                          <div className="flex items-center">
                            <span className={`${ci.isPrimary ? "font-medium" : ""}`}>
                              {ci.value}
                              {ci.isPrimary && <Badge variant="outline" className="ml-2">Primary</Badge>}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={() => deleteContactMutation.mutate(ci.id)}
                          >
                            <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                          </Button>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <div className="text-gray-500 italic">No additional email addresses</div>
                )}
              </CardContent>
            </Card>
            
            {/* Phone numbers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  Phone Numbers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingContacts ? (
                  <div className="animate-pulse h-20 bg-gray-100 rounded"></div>
                ) : getPhoneContacts().length > 0 ? (
                  <ul className="space-y-2">
                    {contactIdentifiers
                      .filter((ci: ContactIdentifier) => ci.type === "phone")
                      .map((ci: ContactIdentifier) => (
                        <li key={ci.id} className="flex items-center justify-between group">
                          <div className="flex items-center">
                            <span className={`${ci.isPrimary ? "font-medium" : ""}`}>
                              {ci.value}
                              {ci.isPrimary && <Badge variant="outline" className="ml-2">Primary</Badge>}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={() => deleteContactMutation.mutate(ci.id)}
                          >
                            <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                          </Button>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <div className="text-gray-500 italic">No additional phone numbers</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Communication History</h2>
            <Dialog open={isAddCommunicationOpen} onOpenChange={setIsAddCommunicationOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Communication
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Communication</DialogTitle>
                  <DialogDescription>
                    Record a new communication with this lead.
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
                                <SelectItem value="internal">Internal</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {communicationForm.watch("type") !== "note" && (
                      <FormField
                        control={communicationForm.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Subject of the communication" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={communicationForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{communicationForm.watch("type") === "note" ? "Note" : "Content"}</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Enter details of the communication" rows={4} />
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
                            <input
                              type="date"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                              onChange={(e) => {
                                const date = new Date(e.target.value);
                                field.onChange(date);
                              }}
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
          
          {isLoadingCommunications ? (
            <div className="space-y-4">
              <div className="animate-pulse h-24 bg-gray-100 rounded"></div>
              <div className="animate-pulse h-24 bg-gray-100 rounded"></div>
            </div>
          ) : communications.length > 0 ? (
            <div className="space-y-4">
              {communications.map((comm: Communication) => (
                <Card key={comm.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        {comm.type === "email" && <Mail className="h-4 w-4" />}
                        {comm.type === "call" && <Phone className="h-4 w-4" />}
                        {comm.type === "sms" && <MessageSquare className="h-4 w-4" />}
                        {comm.type === "meeting" && <Calendar className="h-4 w-4" />}
                        {comm.type === "note" && <MessageSquare className="h-4 w-4" />}
                        <span className="font-medium capitalize">{comm.type}</span>
                        <Badge variant="outline" className="capitalize">{comm.direction}</Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(comm.date), "PPP")}
                      </div>
                    </div>
                    {comm.subject && (
                      <div className="font-medium">{comm.subject}</div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 whitespace-pre-line">{comm.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-gray-500">
                <p>No communication records found for this lead.</p>
                <p className="text-sm mt-1">Click "Add Communication" to record your first interaction.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}