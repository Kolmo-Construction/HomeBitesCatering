/**
 * Tier 1: Unified Public Inquiry Form
 *
 * Single adaptive form at /get-started that replaces the separate
 * PublicEventInquiryPage, PublicInquiryForm, and ComprehensiveWeddingInquiry.
 * Event-type-specific fields render conditionally based on step 1 selection.
 *
 * Submits to POST /api/opportunities/public-inquiry (same endpoint the old forms used).
 */
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
import { CalendarIcon, CheckCircle, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const EVENT_TYPES = [
  { value: "wedding", label: "Wedding", icon: "💍" },
  { value: "corporate", label: "Corporate Event", icon: "🏢" },
  { value: "birthday", label: "Birthday Party", icon: "🎂" },
  { value: "baby_shower", label: "Baby Shower", icon: "👶" },
  { value: "engagement", label: "Engagement Party", icon: "🥂" },
  { value: "anniversary", label: "Anniversary", icon: "💕" },
  { value: "graduation", label: "Graduation", icon: "🎓" },
  { value: "holiday_party", label: "Holiday Party", icon: "🎄" },
  { value: "fundraiser", label: "Fundraiser / Gala", icon: "✨" },
  { value: "reunion", label: "Reunion", icon: "👨‍👩‍👧‍👦" },
  { value: "food_truck", label: "Food Truck", icon: "🚚" },
  { value: "other", label: "Other Event", icon: "🎉" },
];

const inquirySchema = z.object({
  eventType: z.string().min(1, "Please select an event type"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  eventDate: z.date().optional(),
  guestCount: z.coerce.number().int().positive("Guest count must be a positive number").optional(),
  venue: z.string().optional(),
  notes: z.string().optional(),
  // Wedding-specific
  partnerFirstName: z.string().optional(),
  partnerLastName: z.string().optional(),
  ceremonyTime: z.string().optional(),
  receptionTime: z.string().optional(),
  // Corporate-specific
  companyName: z.string().optional(),
  eventPurpose: z.string().optional(),
  needsAVEquipment: z.boolean().optional(),
  // Birthday-specific
  honoreeAge: z.string().optional(),
  birthdayTheme: z.string().optional(),
  // Common extras
  needsBarService: z.boolean().optional(),
  dietaryNotes: z.string().optional(),
  budget: z.string().optional(),
  howDidYouHearAboutUs: z.string().optional(),
});

type InquiryData = z.infer<typeof inquirySchema>;

type Step = "event_type" | "contact" | "event_details" | "extras" | "review";

const STEPS: Step[] = ["event_type", "contact", "event_details", "extras", "review"];
const STEP_LABELS: Record<Step, string> = {
  event_type: "Event Type",
  contact: "Contact Info",
  event_details: "Event Details",
  extras: "Additional Info",
  review: "Review & Submit",
};

export default function UnifiedInquiryForm() {
  const [currentStep, setCurrentStep] = useState<Step>("event_type");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<InquiryData>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      eventType: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      venue: "",
      notes: "",
      needsBarService: false,
      needsAVEquipment: false,
      dietaryNotes: "",
      howDidYouHearAboutUs: "",
    },
  });

  const selectedType = form.watch("eventType");
  const stepIndex = STEPS.indexOf(currentStep);

  const submitMutation = useMutation({
    mutationFn: async (data: InquiryData) => {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        eventType: data.eventType,
        eventDate: data.eventDate?.toISOString() || undefined,
        guestCount: data.guestCount || undefined,
        venue: data.venue || undefined,
        notes: [
          data.notes,
          data.partnerFirstName ? `Partner: ${data.partnerFirstName} ${data.partnerLastName || ""}` : null,
          data.companyName ? `Company: ${data.companyName}` : null,
          data.eventPurpose ? `Purpose: ${data.eventPurpose}` : null,
          data.honoreeAge ? `Honoree age: ${data.honoreeAge}` : null,
          data.birthdayTheme ? `Theme: ${data.birthdayTheme}` : null,
          data.needsBarService ? "Needs bar service" : null,
          data.needsAVEquipment ? "Needs AV equipment" : null,
          data.dietaryNotes ? `Dietary: ${data.dietaryNotes}` : null,
          data.budget ? `Budget: ${data.budget}` : null,
          data.howDidYouHearAboutUs ? `Source: ${data.howDidYouHearAboutUs}` : null,
        ].filter(Boolean).join("\n"),
        opportunitySource: data.howDidYouHearAboutUs || "website",
      };
      const res = await fetch("/api/opportunities/public-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Submission failed");
      return res.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    },
  });

  const goNext = () => {
    const next = STEPS[stepIndex + 1];
    if (next) setCurrentStep(next);
  };
  const goBack = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setCurrentStep(prev);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-4">
              We've received your inquiry and will be in touch soon with next steps for your {selectedType.replace(/_/g, " ")}.
            </p>
            <p className="text-sm text-gray-500">Check your email for a confirmation.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-[#8B7355] to-[#6B5345] text-white py-8 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Plan Your Event
          </h1>
          <p className="text-amber-100">Tell us about your celebration and we'll craft the perfect menu.</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-2xl mx-auto px-6 pt-6">
        <div className="flex items-center justify-between mb-1">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition",
                  i <= stepIndex ? "bg-[#8B7355] text-white" : "bg-gray-200 text-gray-500"
                )}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("w-8 sm:w-16 h-0.5 mx-1", i < stepIndex ? "bg-[#8B7355]" : "bg-gray-200")} />
              )}
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 text-center mt-1">{STEP_LABELS[currentStep]}</p>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => submitMutation.mutate(data))}>
            {/* Step 1: Event Type */}
            {currentStep === "event_type" && (
              <Card>
                <CardHeader>
                  <CardTitle>What type of event are you planning?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {EVENT_TYPES.map((et) => (
                      <button
                        key={et.value}
                        type="button"
                        onClick={() => { form.setValue("eventType", et.value); goNext(); }}
                        className={cn(
                          "p-4 rounded-lg border-2 text-center transition hover:border-[#8B7355] hover:bg-amber-50",
                          selectedType === et.value ? "border-[#8B7355] bg-amber-50" : "border-gray-200"
                        )}
                      >
                        <div className="text-2xl mb-1">{et.icon}</div>
                        <div className="text-sm font-medium">{et.label}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Contact Info */}
            {currentStep === "contact" && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem><FormLabel>First Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  {/* Wedding: partner name */}
                  {selectedType === "wedding" && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <FormField control={form.control} name="partnerFirstName" render={({ field }) => (
                        <FormItem><FormLabel>Partner First Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="partnerLastName" render={({ field }) => (
                        <FormItem><FormLabel>Partner Last Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                  )}
                  {/* Corporate: company */}
                  {selectedType === "corporate" && (
                    <FormField control={form.control} name="companyName" render={({ field }) => (
                      <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 3: Event Details */}
            {currentStep === "event_details" && (
              <Card>
                <CardHeader>
                  <CardTitle>Event Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="eventDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full justify-start text-left", !field.value && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : "Select a date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} disabled={(date) => date < new Date()} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="guestCount" render={({ field }) => (
                    <FormItem><FormLabel>Estimated Guest Count</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="venue" render={({ field }) => (
                    <FormItem><FormLabel>Venue / Location</FormLabel><FormControl><Input placeholder="Venue name or address" {...field} /></FormControl></FormItem>
                  )} />

                  {/* Event-type-specific questions */}
                  {selectedType === "corporate" && (
                    <FormField control={form.control} name="eventPurpose" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Purpose</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="team_building">Team Building</SelectItem>
                              <SelectItem value="client_entertainment">Client Entertainment</SelectItem>
                              <SelectItem value="conference">Conference / Seminar</SelectItem>
                              <SelectItem value="holiday">Holiday Party</SelectItem>
                              <SelectItem value="launch">Product Launch</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )} />
                  )}
                  {selectedType === "birthday" && (
                    <>
                      <FormField control={form.control} name="honoreeAge" render={({ field }) => (
                        <FormItem><FormLabel>Age Being Celebrated</FormLabel><FormControl><Input {...field} placeholder="e.g. 30" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="birthdayTheme" render={({ field }) => (
                        <FormItem><FormLabel>Party Theme (if any)</FormLabel><FormControl><Input {...field} placeholder="e.g. Hawaiian Luau" /></FormControl></FormItem>
                      )} />
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 4: Additional Info */}
            {currentStep === "extras" && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                  <CardDescription>Optional details to help us prepare your quote.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="dietaryNotes" render={({ field }) => (
                    <FormItem><FormLabel>Dietary Restrictions or Allergies</FormLabel><FormControl><Input {...field} placeholder="e.g. Vegan options needed, nut allergy" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="budget" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Approximate Budget</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under_1000">Under $1,000</SelectItem>
                            <SelectItem value="1000_3000">$1,000 - $3,000</SelectItem>
                            <SelectItem value="3000_5000">$3,000 - $5,000</SelectItem>
                            <SelectItem value="5000_10000">$5,000 - $10,000</SelectItem>
                            <SelectItem value="10000_plus">$10,000+</SelectItem>
                            <SelectItem value="not_sure">Not sure yet</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="howDidYouHearAboutUs" render={({ field }) => (
                    <FormItem>
                      <FormLabel>How did you hear about us?</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="google">Google Search</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="facebook">Facebook</SelectItem>
                            <SelectItem value="referral">Friend / Referral</SelectItem>
                            <SelectItem value="wedding_wire">WeddingWire</SelectItem>
                            <SelectItem value="the_knot">The Knot</SelectItem>
                            <SelectItem value="yelp">Yelp</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Anything else you'd like us to know?</FormLabel><FormControl><Textarea rows={4} {...field} placeholder="Special requests, theme ideas, questions..." /></FormControl></FormItem>
                  )} />
                </CardContent>
              </Card>
            )}

            {/* Step 5: Review */}
            {currentStep === "review" && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Your Inquiry</CardTitle>
                  <CardDescription>Make sure everything looks good before submitting.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-y-2">
                      <div className="text-gray-500">Event Type</div>
                      <div className="font-medium capitalize">{selectedType.replace(/_/g, " ")}</div>
                      <div className="text-gray-500">Name</div>
                      <div className="font-medium">{form.getValues("firstName")} {form.getValues("lastName")}</div>
                      <div className="text-gray-500">Email</div>
                      <div className="font-medium">{form.getValues("email")}</div>
                      {form.getValues("phone") && (<><div className="text-gray-500">Phone</div><div className="font-medium">{form.getValues("phone")}</div></>)}
                      {form.getValues("eventDate") && (<><div className="text-gray-500">Event Date</div><div className="font-medium">{format(form.getValues("eventDate")!, "PPP")}</div></>)}
                      {form.getValues("guestCount") && (<><div className="text-gray-500">Guest Count</div><div className="font-medium">{form.getValues("guestCount")}</div></>)}
                      {form.getValues("venue") && (<><div className="text-gray-500">Venue</div><div className="font-medium">{form.getValues("venue")}</div></>)}
                    </div>
                    {form.getValues("notes") && (
                      <div className="pt-2 border-t">
                        <div className="text-gray-500 mb-1">Additional Notes</div>
                        <div className="text-gray-700 whitespace-pre-wrap">{form.getValues("notes")}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between mt-6">
              {stepIndex > 0 ? (
                <Button type="button" variant="outline" onClick={goBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              ) : <div />}
              {currentStep === "review" ? (
                <Button type="submit" disabled={submitMutation.isPending} className="bg-[#8B7355] hover:bg-[#6B5345]">
                  <Sparkles className="h-4 w-4 mr-2" />
                  {submitMutation.isPending ? "Submitting..." : "Submit Inquiry"}
                </Button>
              ) : currentStep !== "event_type" ? (
                <Button type="button" onClick={goNext} className="bg-[#8B7355] hover:bg-[#6B5345]">
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : null}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
