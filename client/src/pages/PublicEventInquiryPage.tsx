import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Event types that customers can choose from
const EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "birthday", label: "Birthday Party" },
  { value: "corporate", label: "Corporate Event" },
  { value: "private_dinner", label: "Private Dinner" },
  { value: "graduation", label: "Graduation" },
  { value: "ceremony", label: "Ceremony" },
  { value: "anniversary", label: "Anniversary" },
  { value: "holiday_party", label: "Holiday Party" },
  { value: "other", label: "Other" }
];

// Form validation schema
const inquiryFormSchema = z.object({
  // Event type (drives the rest of the form)
  eventType: z.string().min(1, "Please select an event type"),
  
  // Contact information
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  
  // Basic event details
  eventDate: z.date().optional(),
  guestCount: z.coerce.number().int().positive().optional(),
  venue: z.string().optional(),
  notes: z.string().optional(),
  
  // Event-specific fields (conditional based on eventType)
  weddingStyle: z.string().optional(),
  ceremonyGuestCount: z.coerce.number().int().positive().optional(),
  receptionGuestCount: z.coerce.number().int().positive().optional(),
  needsBarService: z.boolean().optional(),
  
  birthdayTheme: z.string().optional(),
  ageBeingCelebrated: z.coerce.number().int().positive().optional(),
  needsEntertainment: z.boolean().optional(),
  
  companyName: z.string().optional(),
  eventPurpose: z.string().optional(),
  needsAVEquipment: z.boolean().optional(),
});

type InquiryFormData = z.infer<typeof inquiryFormSchema>;

enum FormStep {
  EVENT_TYPE = 1,
  CONTACT_INFO = 2,
  EVENT_DETAILS = 3,
  SPECIFIC_QUESTIONS = 4,
  REVIEW = 5
}

export default function PublicEventInquiryPage() {
  const [currentStep, setCurrentStep] = useState<FormStep>(FormStep.EVENT_TYPE);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<InquiryFormData>({
    resolver: zodResolver(inquiryFormSchema),
    defaultValues: {
      eventType: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      guestCount: undefined,
      venue: "",
      notes: "",
      needsBarService: false,
      needsEntertainment: false,
      needsAVEquipment: false,
    },
  });

  const selectedEventType = form.watch("eventType");

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: InquiryFormData) => {
      const response = await apiRequest("POST", "/api/opportunities/public-inquiry", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        eventType: data.eventType,
        eventDate: data.eventDate?.toISOString() || undefined,
        guestCount: data.guestCount || undefined,
        venue: data.venue || undefined,
        notes: data.notes || undefined,
        source: "website"
      });
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Inquiry Submitted Successfully!",
        description: "We'll be in touch with you soon to discuss your event.",
      });
    },
    onError: (error) => {
      console.error("Error submitting inquiry:", error);
      toast({
        title: "Submission Error",
        description: "There was an issue submitting your inquiry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InquiryFormData) => {
    submitMutation.mutate(data);
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, FormStep.REVIEW));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, FormStep.EVENT_TYPE));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-4">
              Your event inquiry has been submitted successfully. Our team will review your request and contact you within 24 hours.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Submit Another Inquiry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Plan Your Perfect Event</h1>
          <p className="text-xl text-gray-600">Tell us about your vision and we'll create something amazing together</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step <= currentStep
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                )}
              >
                {step}
              </div>
            ))}
          </div>
          <div className="mt-2 text-center text-sm text-gray-600">
            Step {currentStep} of 5
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === FormStep.EVENT_TYPE && "What type of event are you planning?"}
              {currentStep === FormStep.CONTACT_INFO && "Let's get to know you"}
              {currentStep === FormStep.EVENT_DETAILS && "Tell us about your event"}
              {currentStep === FormStep.SPECIFIC_QUESTIONS && "A few more details"}
              {currentStep === FormStep.REVIEW && "Review your information"}
            </CardTitle>
            <CardDescription>
              {currentStep === FormStep.EVENT_TYPE && "This helps us customize the questions for your specific needs"}
              {currentStep === FormStep.CONTACT_INFO && "We'll use this to get in touch with you"}
              {currentStep === FormStep.EVENT_DETAILS && "Help us understand your vision"}
              {currentStep === FormStep.SPECIFIC_QUESTIONS && "These details help us prepare better for your event"}
              {currentStep === FormStep.REVIEW && "Please review your information before submitting"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Step 1: Event Type Selection */}
                {currentStep === FormStep.EVENT_TYPE && (
                  <FormField
                    control={form.control}
                    name="eventType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your event type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EVENT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Step 2: Contact Information */}
                {currentStep === FormStep.CONTACT_INFO && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your first name" {...field} />
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
                              <Input placeholder="Your last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your.email@example.com" {...field} />
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
                          <FormLabel>Phone Number (Optional)</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 3: Basic Event Details */}
                {currentStep === FormStep.EVENT_DETAILS && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="eventDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Event Date (Optional)</FormLabel>
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
                                    format(field.value, "PPP")
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
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
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
                          <FormLabel>Expected Number of Guests</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="50" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="venue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Venue (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Where will your event take place?" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell us about your vision, special requirements, or any other details..."
                              rows={4}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 4: Event-Specific Questions */}
                {currentStep === FormStep.SPECIFIC_QUESTIONS && (
                  <div className="space-y-4">
                    {/* Wedding-specific questions */}
                    {selectedEventType === "wedding" && (
                      <>
                        <FormField
                          control={form.control}
                          name="weddingStyle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Wedding Style</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select your preferred style" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="formal">Formal</SelectItem>
                                  <SelectItem value="casual">Casual</SelectItem>
                                  <SelectItem value="rustic">Rustic</SelectItem>
                                  <SelectItem value="modern">Modern</SelectItem>
                                  <SelectItem value="vintage">Vintage</SelectItem>
                                  <SelectItem value="garden">Garden</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="ceremonyGuestCount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ceremony Guests</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="30" min="1" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="receptionGuestCount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Reception Guests</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="100" min="1" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}

                    {/* Birthday-specific questions */}
                    {selectedEventType === "birthday" && (
                      <>
                        <FormField
                          control={form.control}
                          name="birthdayTheme"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Party Theme (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Superhero, Princess, 80s, etc." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="ageBeingCelebrated"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Age Being Celebrated</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="25" min="1" max="120" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {/* Corporate-specific questions */}
                    {selectedEventType === "corporate" && (
                      <>
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your company name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="eventPurpose"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Event Purpose</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="What's the occasion?" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="holiday_party">Holiday Party</SelectItem>
                                  <SelectItem value="product_launch">Product Launch</SelectItem>
                                  <SelectItem value="team_building">Team Building</SelectItem>
                                  <SelectItem value="client_appreciation">Client Appreciation</SelectItem>
                                  <SelectItem value="conference">Conference</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {/* Generic message for other event types */}
                    {!["wedding", "birthday", "corporate"].includes(selectedEventType) && selectedEventType && (
                      <div className="text-center text-gray-600 py-8">
                        <p>Thank you for providing the basic information!</p>
                        <p>Our team will reach out to discuss the specific details for your {EVENT_TYPES.find(t => t.value === selectedEventType)?.label.toLowerCase()} event.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5: Review */}
                {currentStep === FormStep.REVIEW && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Event Information</h3>
                      <p><strong>Type:</strong> {EVENT_TYPES.find(t => t.value === selectedEventType)?.label}</p>
                      {form.getValues("eventDate") && <p><strong>Date:</strong> {format(form.getValues("eventDate")!, "PPP")}</p>}
                      {form.getValues("guestCount") && <p><strong>Guests:</strong> {form.getValues("guestCount")}</p>}
                      {form.getValues("venue") && <p><strong>Venue:</strong> {form.getValues("venue")}</p>}
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Contact Information</h3>
                      <p><strong>Name:</strong> {form.getValues("firstName")} {form.getValues("lastName")}</p>
                      <p><strong>Email:</strong> {form.getValues("email")}</p>
                      {form.getValues("phone") && <p><strong>Phone:</strong> {form.getValues("phone")}</p>}
                    </div>
                    {form.getValues("notes") && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Additional Notes</h3>
                        <p>{form.getValues("notes")}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex justify-between pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === FormStep.EVENT_TYPE}
                  >
                    Previous
                  </Button>
                  
                  {currentStep < FormStep.REVIEW ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={
                        (currentStep === FormStep.EVENT_TYPE && !selectedEventType) ||
                        (currentStep === FormStep.CONTACT_INFO && (!form.getValues("firstName") || !form.getValues("lastName") || !form.getValues("email")))
                      }
                    >
                      Next
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      disabled={submitMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {submitMutation.isPending ? "Submitting..." : "Submit Inquiry"}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}