import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { insertOpportunitySchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CalendarIcon, X, UserPlus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatDate } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Create an extended schema for our form that includes UI-specific fields
const formSchema = insertOpportunitySchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  eventType: z.string().min(1, "Event type is required"),
  eventDate: z.date().optional().nullable(),
  guestCount: z.coerce.number().int().positive().optional().nullable(),
  venue: z.string().optional(),
  notes: z.string().optional(),
  opportunitySource: z.string().optional(),
  // Additional fields for client association - these won't be part of the API schema
  assignToExistingClient: z.boolean().default(false),
  clientId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface OpportunityFormProps {
  opportunity?: FormValues;
  isEditing?: boolean;
  opportunityIdForEdit?: number; // Add this prop for when we want to fetch the opportunity directly
  onCancel?: () => void;
}

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
}

export default function OpportunityForm({ opportunity: initialOpportunity, isEditing = false, opportunityIdForEdit, onCancel }: OpportunityFormProps) {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [emailCheck, setEmailCheck] = useState<{loading: boolean, client?: Client | null}>({
    loading: false,
    client: null
  });
  const [phoneCheck, setPhoneCheck] = useState<{loading: boolean, client?: Client | null}>({
    loading: false,
    client: null
  });

  // Fetch opportunity data if opportunityIdForEdit is provided
  const { data: fetchedOpportunityData, isLoading: isLoadingFetchedOpportunity } = useQuery<FormValues>({
    queryKey: ['/api/opportunities', opportunityIdForEdit],
    queryFn: async () => {
      if (!opportunityIdForEdit) return undefined; // Should not happen if enabled is true
      const res = await fetch(`/api/opportunities/${opportunityIdForEdit}`);
      if (!res.ok) throw new Error('Failed to fetch opportunity');
      return res.json();
    },
    enabled: isEditing && !!opportunityIdForEdit && !initialOpportunity, // Only fetch if editing, ID provided, and no initialOpportunity
  });

  const opportunityToEdit = initialOpportunity || fetchedOpportunityData;

  // Fetch all clients for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('Failed to fetch clients');
      return res.json();
    },
    staleTime: 30000, // 30 seconds
  });

  // Set up the form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      eventType: "",
      eventDate: null,
      guestCount: null,
      venue: "",
      notes: "",
      opportunitySource: "",
      status: "new",
      assignToExistingClient: false,
      clientId: "",
    },
  });
  
  // Update form values when opportunityToEdit changes
  useEffect(() => {
    if (opportunityToEdit) {
      form.reset({
        ...opportunityToEdit,
        eventDate: opportunityToEdit.eventDate ? new Date(opportunityToEdit.eventDate) : null,
        assignToExistingClient: !!opportunityToEdit.clientId,
        clientId: opportunityToEdit.clientId ? String(opportunityToEdit.clientId) : "",
      });
    } else if (!isEditing) { // Reset for new form
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        eventType: "",
        eventDate: null,
        guestCount: null,
        venue: "",
        notes: "",
        opportunitySource: "",
        status: "new",
        assignToExistingClient: false,
        clientId: "",
      });
    }
  }, [opportunityToEdit, form, isEditing]);

  // Show loading state while fetching opportunity data
  if (isLoadingFetchedOpportunity && isEditing && !!opportunityIdForEdit && !initialOpportunity) {
    return <div className="text-center p-4">Loading opportunity data for editing...</div>;
  }

  // Handle when email or phone field changes to check for existing clients
  const watchEmail = form.watch("email");
  const watchPhone = form.watch("phone");
  const watchAssignToExistingClient = form.watch("assignToExistingClient");

  // Check for existing client when email changes
  const checkExistingClientByEmail = async (email: string) => {
    if (!email) return;
    setEmailCheck({loading: true});
    try {
      // We're simulating the check by filtering the clients we have
      // In a real app, you might have a dedicated API endpoint for this
      const existingClient = clients.find((client: Client) => 
        client.email.toLowerCase() === email.toLowerCase()
      );
      
      setEmailCheck({
        loading: false,
        client: existingClient || null
      });
    } catch (error) {
      setEmailCheck({loading: false});
      console.error("Error checking client by email:", error);
    }
  };

  // Check for existing client when phone changes
  const checkExistingClientByPhone = async (phone: string) => {
    if (!phone) return;
    setPhoneCheck({loading: true});
    try {
      // We're simulating the check by filtering the clients we have
      // In a real app, you might have a dedicated API endpoint for this
      const existingClient = clients.find((client: Client) => 
        client.phone === phone
      );
      
      setPhoneCheck({
        loading: false,
        client: existingClient || null
      });
    } catch (error) {
      setPhoneCheck({loading: false});
      console.error("Error checking client by phone:", error);
    }
  };

  // React hook to watch for changes in the email and phone fields
  useEffect(() => {
    if (watchEmail && !isEditing) {
      checkExistingClientByEmail(watchEmail);
    }
  }, [watchEmail, isEditing]);

  useEffect(() => {
    if (watchPhone && !isEditing) {
      checkExistingClientByPhone(watchPhone);
    }
  }, [watchPhone, isEditing]);

  // Create or update opportunity mutation
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { assignToExistingClient, clientId, ...opportunityValues } = values;
      
      if (isEditing && opportunityToEdit) {
        // Update existing opportunity
        const res = await apiRequest("PATCH", `/api/opportunities/${opportunityToEdit.id}`, opportunityValues);
        return res.json();
      } else {
        // Create new opportunity
        const payload = {
          ...opportunityValues,
          assignToExistingClient: values.assignToExistingClient,
          clientId: values.assignToExistingClient ? values.clientId : undefined
        };

        const res = await apiRequest("POST", "/api/opportunities", payload);
        return res.json();
      }
    },
    onSuccess: (data) => {
      // Invalidate opportunities and clients queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      
      // Show success message and redirect
      toast({
        title: isEditing ? "Opportunity updated" : "Opportunity created",
        description: isEditing 
          ? "The opportunity has been updated successfully." 
          : `The new opportunity has been created successfully${data.clientId ? ' and linked to a client' : ''}.`,
      });
      
      // Navigate back to opportunities list
      navigate("/opportunities");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} opportunity: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };
  
  // Determine if we have any existing client matches
  const existingClient = emailCheck.client || phoneCheck.client;
  const showExistingClientAlert = !isEditing && existingClient && !watchAssignToExistingClient;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{isEditing ? "Edit Opportunity" : "New Opportunity"}</CardTitle>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Wedding">Wedding</SelectItem>
                        <SelectItem value="Corporate">Corporate</SelectItem>
                        <SelectItem value="Birthday">Birthday</SelectItem>
                        <SelectItem value="Anniversary">Anniversary</SelectItem>
                        <SelectItem value="Fundraiser">Fundraiser</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Event Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              formatDate(field.value)
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="guestCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guest Count</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Number of guests"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value === "" ? null : parseInt(e.target.value, 10);
                          field.onChange(value);
                        }}
                        value={field.value === null ? "" : field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="opportunitySource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opportunity Source</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="social_media">Social Media</SelectItem>
                        <SelectItem value="search">Search Engine</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="direct">Direct Contact</SelectItem>
                        <SelectItem value="advertisement">Advertisement</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue</FormLabel>
                    <FormControl>
                      <Input placeholder="Event venue" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="negotiation">Negotiation</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Notes field spanning full width */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes or details" 
                      className="min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Alert for existing client */}
            {showExistingClientAlert && (
              <Alert variant="default" className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Existing Client Found</AlertTitle>
                <AlertDescription className="text-amber-700">
                  A client with the same {emailCheck.client ? 'email' : 'phone number'} already exists: 
                  <strong> {existingClient.firstName} {existingClient.lastName}</strong>
                  {existingClient.company && ` (${existingClient.company})`}.
                  Do you want to link this opportunity to the existing client?
                </AlertDescription>
                <div className="mt-3">
                  <FormField
                    control={form.control}
                    name="assignToExistingClient"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              if (checked) {
                                form.setValue("clientId", String(existingClient.id));
                              } else {
                                form.setValue("clientId", "");
                              }
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Assign to existing client</FormLabel>
                          <FormDescription>
                            This will link the opportunity to the existing client record
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </Alert>
            )}
            
            {/* Manual client selection (when no automatic match is found, or in edit mode) */}
            {(isEditing || !showExistingClientAlert) && (
              <FormField
                control={form.control}
                name="assignToExistingClient"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 mb-4">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Assign to a client</FormLabel>
                      <FormDescription>
                        Link this opportunity to an existing client
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}
            
            {/* Client selection dropdown, only shown if assignToExistingClient is true */}
            {form.watch("assignToExistingClient") && (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Select Client 
                      <UserPlus className="h-4 w-4 inline-block ml-2 text-primary" />
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client: Client) => (
                          <SelectItem key={client.id} value={String(client.id)}>
                            {client.firstName} {client.lastName} {client.company && `(${client.company})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="flex justify-end space-x-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90"
              >
                {mutation.isPending ? 
                  (isEditing ? "Saving..." : "Creating...") : 
                  (isEditing ? "Save Changes" : "Create Opportunity")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}