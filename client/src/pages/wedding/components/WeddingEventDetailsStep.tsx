// src/pages/wedding/components/WeddingEventDetailsStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
// Card and CardContent are removed if not used for other elements in this step
import {
  ChevronLeft,
  ChevronRight,
  Info as InfoIcon,
  // UtensilsIcon, TableIcon, GlassWaterIcon are removed as service style selection is moved
} from "lucide-react";

import { WeddingInquiryFormData } from "../types/weddingFormTypes";

interface WeddingEventDetailsStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

const WeddingEventDetailsStep: React.FC<WeddingEventDetailsStepProps> = ({
  onPrevious,
  onNext,
}) => {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<WeddingInquiryFormData>();

  const venueSecured = watch("venueSecured");
  const hasCocktailHour = watch("hasCocktailHour");
  const hasMainCourse = watch("hasMainCourse");
  // serviceStyle watch is removed as it's no longer handled here

  // weddingServiceTypeOptions array is REMOVED

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">
          Wedding Details & Venue
        </h2>
        <p className="text-lg text-gray-600">
          Tell us more about your venue and wedding day timeline. Guest count can also be provided here.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
        {/* Venue Information */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Venue Information</h3>
          <FormField
            control={control}
            name="venueSecured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Have you secured a venue for your wedding?
                  </FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Venue secured switch"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {venueSecured && (
            <div className="ml-4 border-l-2 border-pink-500/30 pl-4 py-2 space-y-4">
              <FormField
                control={control}
                name="venueName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter venue name" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-4">
                <h4 className="text-md font-medium">Venue Location</h4>
                <FormField
                  control={control}
                  name="venueLocation.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} value={field.value || ''} />
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
                        <Input placeholder="Apt, Suite, Unit, etc. (optional)" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField
                    control={control}
                    name="venueLocation.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} value={field.value || ''} />
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
                          <Input placeholder="State" {...field} value={field.value || ''} />
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
                          <Input placeholder="Zip Code" {...field} value={field.value || ''} />
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

        {/* Wedding Schedule */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Wedding Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormField
              control={control}
              name="eventStartTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reception Start Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} value={field.value || ''} />
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
                  <FormLabel>Reception End Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="border rounded-md p-4 mb-4 bg-gray-50 dark:bg-gray-800/30">
            <h4 className="text-md font-medium mb-3">Wedding Ceremony Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <FormField
                control={control}
                name="ceremonyStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ceremony Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} value={field.value || ''} />
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
                      <Input type="time" {...field} value={field.value || ''} />
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
                      aria-label="Setup before ceremony switch"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Set-up required before Ceremony start time?</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={control}
            name="hasCocktailHour"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Will there be a Cocktail Hour?</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Cocktail hour switch"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {hasCocktailHour && (
            <div className="ml-4 border-l-2 border-pink-500/30 pl-4 py-2 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="cocktailStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cocktail Hour Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} value={field.value || ''} />
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
                      <FormLabel>Cocktail Hour End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          <FormField
            control={control}
            name="hasMainCourse"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Will there be a Main Course Service?</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Main course service switch"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {hasMainCourse && (
            <div className="ml-4 border-l-2 border-pink-500/30 pl-4 py-2 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="foodServiceStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Course Service Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} value={field.value || ''} />
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
                      <FormLabel>Main Course Service End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>

        {/* Guest Count - Remains here */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Guest Count</h3>
          <FormField
            control={control}
            name="guestCount"
            rules={{
              required: "Guest count is required.",
              min: { value: 1, message: "Guest count must be at least 1." },
            }}
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Estimated Guest Count*</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Number of guests"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Service Style FormField and related notes are REMOVED from here */}

        <div className="mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-md p-4">
            <h4 className="text-blue-800 dark:text-blue-300 font-medium mb-2 flex items-center">
              <InfoIcon className="h-5 w-5 mr-2" />
              Next Steps
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              After completing these event details, you'll select your preferred service style for the wedding.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-10">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          className="flex items-center px-6 py-3 text-lg"
        >
          <ChevronLeft className="mr-2 h-5 w-5" /> Back
        </Button>
        <Button
          type="button"
          onClick={onNext}
          className="flex items-center bg-pink-600 hover:bg-pink-700 px-6 py-3 text-lg text-white"
        >
          Select Service Style <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default WeddingEventDetailsStep;