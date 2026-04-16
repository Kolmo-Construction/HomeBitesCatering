// client/src/components/form-steps/EventDetailsStep.tsx
import React from "react";
import { useFormContext} from "react-hook-form"; // Consolidating RHF imports
import { Form, FormControl, FormItem, FormLabel, FormMessage, FormField } from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card"; // Added Card, CardContent
import {
  ChevronLeft,
  ChevronRight,
  Info as InfoIcon,
  Truck as TruckIcon,
  Utensils as UtensilsIcon,
  Clock as ClockIcon,
  Table as TableIcon,
  GlassWater as GlassWaterIcon
} from "lucide-react"; // Added necessary icons

import { EventType, EventInquiryFormData } from "@/types/form-types"; // Adjust path as needed
const EventDetailsStep = ({ 
  eventType,
  onPrevious,
  onNext 
}: { 
  eventType: EventType;
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch, formState: { errors, isValid } } = useFormContext<EventInquiryFormData>();

  // Watch values to conditionally show fields
  const venueSecured = watch("venueSecured");
  const hasCocktailHour = watch("hasCocktailHour");
  const hasMainCourse = watch("hasMainCourse");
  const serviceStyle = watch("serviceStyle"); // We're keeping the field name as serviceStyle for compatibility

  // Service type options
  const serviceTypeOptions = [
    { value: "catering_buffet", label: "Catering Buffet" },
    { value: "breakfast_brunch", label: "Breakfast/Brunch Buffet" },
    { value: "sandwich_factory", label: "Sandwich Factory Buffet" },
    { value: "family_style", label: "Family Style" },
    { value: "plated_dinner", label: "Plated Dinner" },
    { value: "cocktail_party", label: "Cocktail - Appetizers Only" },
    { value: "food_truck", label: "Food Truck" },
  ];

  // Theme options
  const themeOptions = [
    { value: "taco_fiesta", label: "Taco Fiesta" },
    { value: "american_bbq", label: "American BBQ" },
    { value: "taste_of_greece", label: "A Taste of Greece" },
    { value: "kebab_party", label: "Kebab Party" },
    { value: "taste_of_italy", label: "A Taste of Italy" },
    { value: "sandwich_factory", label: "Sandwich Factory" },
    { value: "custom_menu", label: "Custom Menu" },
    { value: "hors_doeuvres", label: "Hor d'oeuvres only (Cocktail party)" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Event Details & Venue</h2>
        <p className="text-lg text-gray-600">
          Tell us more about your venue and event timing
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* Venue Information */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Venue Information</h3>

          <FormField
            control={control}
            name="venueSecured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Have you secured a venue?</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {venueSecured && (
            <div className="ml-4 border-l-2 border-primary/30 pl-4 py-2 space-y-4">
              <FormField
                control={control}
                name="venueName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter venue name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Venue Location */}
              <div className="space-y-4">
                <h4 className="text-md font-medium">Venue Location</h4>

                <FormField
                  control={control}
                  name="venueLocation.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="venueLocation.street2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address Line 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Apt, Suite, Unit, etc. (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField
                    control={control}
                    name="venueLocation.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="venueLocation.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="venueLocation.zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal/Zip Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Zip Code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Event Schedule */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Event Schedule</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormField
              control={control}
              name="eventStartTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Start Time</FormLabel>
                  <FormControl>
                    <Input placeholder="HH:MM AM/PM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="eventEndTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event End Time</FormLabel>
                  <FormControl>
                    <Input placeholder="HH:MM AM/PM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Wedding-specific timing fields */}
          {eventType === "Wedding" && (
            <div className="border rounded-md p-4 mb-4 bg-gray-50">
              <h4 className="text-md font-medium mb-3">Wedding Ceremony Details</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <FormField
                  control={control}
                  name="ceremonyStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ceremony Start Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="ceremonyEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ceremony End Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={control}
                name="setupBeforeCeremony"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 mb-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Set-up before Ceremony start time?</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Cocktail Hour */}
          <FormField
            control={control}
            name="hasCocktailHour"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Cocktail Hour</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {hasCocktailHour && (
            <div className="ml-4 border-l-2 border-primary/30 pl-4 py-2 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="cocktailStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cocktail/Appetizer Start Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="cocktailEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cocktail/Appetizer End Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Main Course Service */}
          <FormField
            control={control}
            name="hasMainCourse"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Main Course Service</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {hasMainCourse && (
            <div className="ml-4 border-l-2 border-primary/30 pl-4 py-2 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="foodServiceStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Food Service Start Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="foodServiceEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Food Service End Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>

        {/* Guest Count and Service Style */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Service Details</h3>

          <FormField
            control={control}
            name="guestCount"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Guest Count</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1"
                    placeholder="Number of guests" 
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="serviceStyle"
            render={({ field }) => (
              <FormItem className="mb-6">
                <FormLabel className="text-lg font-medium mb-3">Service Type</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {serviceTypeOptions.map((option) => (
                    <Card 
                      key={option.value}
                      className={`
                        transition-all duration-200 hover:shadow-md cursor-pointer
                        ${field.value === option.value ? 'border-2 border-primary shadow-md' : 'border border-gray-200'}
                      `}
                      onClick={() => field.onChange(option.value)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                          {option.value === 'food_truck' && <TruckIcon className="h-6 w-6 text-primary" />}
                          {option.value === 'catering_buffet' && <UtensilsIcon className="h-6 w-6 text-primary" />}
                          {option.value === 'breakfast_brunch' && <ClockIcon className="h-6 w-6 text-primary" />}
                          {option.value === 'sandwich_factory' && <UtensilsIcon className="h-6 w-6 text-primary" />}
                          {option.value === 'family_style' && <TableIcon className="h-6 w-6 text-primary" />}
                          {option.value === 'plated_dinner' && <UtensilsIcon className="h-6 w-6 text-primary" />}
                          {option.value === 'cocktail_party' && <GlassWaterIcon className="h-6 w-6 text-primary" />}
                        </div>
                        <div className={`font-medium ${field.value === option.value ? 'text-primary' : 'text-gray-700'}`}>
                          {option.label}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Service fee notes */}
          {serviceStyle === "buffet_full" && (
            <div className="p-4 mb-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 text-sm">
                <strong>Service Fee Note - Full Service:</strong> A 20% service fee will be applied for Buffet Full Service. This includes professional servers, complete setup and breakdown, and premium service throughout your event.
              </p>
            </div>
          )}

          {serviceStyle === "buffet_standard" && (
            <div className="p-4 mb-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 text-sm">
                <strong>Service Fee Note - Standard Service:</strong> A 15% service fee will be applied for Buffet Standard Service. This includes basic setup, food service assistance, and cleanup of service areas.
              </p>
            </div>
          )}

          {/* Service duration and labor hours fields removed as requested */}
        </div>

        {/* Service Style Section - Extra Guidance */}
        <div className="mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
            <h4 className="text-amber-800 font-medium mb-2 flex items-center">
              <InfoIcon className="h-5 w-5 mr-2" /> 
              Next Steps
            </h4>
            <p className="text-sm text-amber-700">
              After completing these details, you'll be able to select your menu options in the next step.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="flex items-center"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Button 
          type="button" 
          onClick={onNext}
          className="flex items-center"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
export default EventDetailsStep;