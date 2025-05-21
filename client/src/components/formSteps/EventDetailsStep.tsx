// client/src/components/formSteps/EventDetailsStep.tsx
import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { EventType } from "../../data/eventOptions";
import { EventInquiryFormData } from "../../types";

interface EventDetailsStepProps {
  eventType: EventType;
  onPrevious: () => void;
  onNext: () => void;
}

const EventDetailsStep: React.FC<EventDetailsStepProps> = ({ 
  eventType,
  onPrevious,
  onNext 
}) => {
  const { control, watch, formState: { errors, isValid } } = useFormContext<EventInquiryFormData>();
  
  // Watch values to conditionally show fields
  const venueSecured = watch("venueSecured");
  const hasCocktailHour = watch("hasCocktailHour");
  const hasMainCourse = watch("hasMainCourse");
  const serviceStyle = watch("serviceStyle");
  
  // Service style options
  const serviceStyleOptions = [
    { value: "drop_off", label: "Drop-off" },
    { value: "buffet_standard", label: "Buffet Standard" },
    { value: "buffet_full", label: "Buffet Full Service" },
    { value: "family_style", label: "Family Style" },
    { value: "plated_dinner", label: "Plated Dinner" },
    { value: "cocktail_party", label: "Cocktail Party" },
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
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Event Details</h2>
        <p className="text-lg text-gray-600">
          Tell us more about your {eventType.toLowerCase()} event
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* Venue Information */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Venue Information</h3>
          
          <div className="mb-4">
            <FormField
              control={control}
              name="venueSecured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Switch 
                      checked={field.value} 
                      onCheckedChange={field.onChange} 
                    />
                  </FormControl>
                  <FormLabel className="font-medium">I have secured a venue</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {venueSecured && (
            <div className="space-y-4">
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
              
              <div className="p-4 bg-gray-50 rounded-md">
                <h4 className="font-medium mb-3">Venue Location</h4>
                
                <div className="space-y-4">
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
                          <FormLabel>State</FormLabel>
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
                          <FormLabel>Zip Code</FormLabel>
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
            </div>
          )}
        </div>
        
        {/* Event Timeline */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Event Timeline</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="eventStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
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
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* If it's a Wedding, show ceremony times */}
            {eventType === "Wedding" && (
              <div className="p-4 bg-gray-50 rounded-md space-y-4">
                <h4 className="font-medium">Ceremony Times</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name="ceremonyStartTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ceremony Start</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
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
                        <FormLabel>Ceremony End</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
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
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange} 
                        />
                      </FormControl>
                      <FormLabel className="font-medium">Setup before ceremony</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <div className="mb-2">
              <FormField
                control={control}
                name="hasCocktailHour"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                      />
                    </FormControl>
                    <FormLabel className="font-medium">Include cocktail hour</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {hasCocktailHour && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                <FormField
                  control={control}
                  name="cocktailStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cocktail Hour Start</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
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
                      <FormLabel>Cocktail Hour End</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <div className="mb-2">
              <FormField
                control={control}
                name="hasMainCourse"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                      />
                    </FormControl>
                    <FormLabel className="font-medium">Include main course service</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {hasMainCourse && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                <FormField
                  control={control}
                  name="foodServiceStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Food Service Start</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
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
                      <FormLabel>Food Service End</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Event Details */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Event Details</h3>
          
          <div className="space-y-4">
            <FormField
              control={control}
              name="guestCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest Count*</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      min={1}
                      placeholder="Number of guests"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value) || 50)}
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
                <FormItem>
                  <FormLabel>Service Style*</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service style" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {serviceStyleOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {serviceStyle && serviceStyle !== "drop_off" && (
              <>
                <FormField
                  control={control}
                  name="serviceDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Duration (hours)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min={1}
                          max={24}
                          placeholder="Duration in hours"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="laborHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Labor Hours</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min={1}
                          max={24}
                          placeholder="Labor hours"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            <FormField
              control={control}
              name="requestedTheme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requested Menu Theme*</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a menu theme" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {themeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        
        <Button 
          type="button" 
          onClick={onNext}
          className="flex items-center gap-2"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default EventDetailsStep;