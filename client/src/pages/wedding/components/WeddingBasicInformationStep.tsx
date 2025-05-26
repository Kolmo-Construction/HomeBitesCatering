// src/pages/wedding/components/WeddingBasicInformationStep.tsx
import React, { useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  FormField,
  FormDescription,
} from "@/components/ui/form"; // Assuming Form is not directly used
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  Info as InfoIcon,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  AlertCircle,
  Users, // Icon for couple's names
  Gift,  // Icon for wedding related fields
  Heart, // For romantic touches
  Mail, // For email
  Phone, // For phone
  MapPin, // For address
  Home, // For venue
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// Types for Wedding form
import { EventType, WeddingInquiryFormData } from "../types/weddingFormTypes";

// Validation schemas (can be kept or moved to a shared utils/validation file)
const phoneRegex = /^(\+\d{1,3})?\s?(\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const zipCodeRegex = /^\d{5}(-\d{4})?$/;

interface WeddingBasicInformationStepProps {
  eventType: "Wedding"; // Fixed for this component
  onPrevious: () => void;
  onNext: () => void;
}

const WeddingBasicInformationStep: React.FC<WeddingBasicInformationStepProps> = ({
  eventType, // Will always be "Wedding"
  onPrevious,
  onNext,
}) => {
  const {
    control,
    watch,
    setValue,
    trigger,
    formState: { errors }, // isValid was not used in original snippet
  } = useFormContext<WeddingInquiryFormData>();

  const [timeOptions, setTimeOptions] = useState<string[]>([]);
  const [validationError, setValidationError] = useState("");

  // Generate time options - weddings typically afternoon to evening
  useEffect(() => {
    let options: string[] = [];
    for (let hour = 12; hour <= 22; hour++) { // 12 PM to 10 PM
      options.push(`${String(hour).padStart(2, '0')}:00`);
      options.push(`${String(hour).padStart(2, '0')}:30`);
    }
    setTimeOptions(options);
  }, []);

  const handleNextClick = async () => {
    // Trigger validation on all relevant fields for this step
    const result = await trigger([
      "contactName.firstName",
      "contactName.lastName",
      "email",
      "phone",
      "billingAddress.street",
      "billingAddress.city",
      "billingAddress.state",
      "billingAddress.zipCode",
      "eventDate",
      "eventStartTime", // Assuming eventStartTime here refers to reception start time
    ]);

    if (!result) {
      setValidationError(
        "Please correct the highlighted fields before continuing."
      );
      // Scroll to the top of the form to show the error message
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setValidationError("");
    onNext();
  };


  return (
    <div className="relative container mx-auto px-4 py-8 max-w-3xl">
      {/* Romantic background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f472b6' fill-opacity='0.05'%3E%3Cpath d='M20 20c0-8.837-7.163-16-16-16S-12 11.163-12 20s7.163 16 16 16 16-7.163 16-16zm12 0c0-8.837-7.163-16-16-16s-16 7.163-16 16 7.163 16 16 16 16-7.163 16-16z'/%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      {/* Header with romantic styling */}
      <div className="relative text-center mb-10">
        <div className="inline-block">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
            Your Love Story
          </h2>
          <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-rose-300 to-transparent mx-auto mb-4"></div>
        </div>
        <p className="text-xl text-gray-600 font-light leading-relaxed max-w-2xl mx-auto">
          Let's capture the beautiful details of your special day
        </p>
        <div className="mt-6 flex justify-center items-center gap-3 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-rose-300 rounded-full animate-pulse"></div>
            <span>Step 1 of your journey</span>
          </div>
        </div>
      </div>

      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-rose-100 p-8 md:p-10 mb-6">
        {/* Subtle decorative elements */}
        <div className="absolute top-4 right-4 w-8 h-8 bg-rose-100 rounded-full opacity-30"></div>
        <div className="absolute bottom-4 left-4 w-6 h-6 bg-pink-100 rounded-full opacity-40"></div>
        {/* Elegant event type badge */}
        <div className="mb-8 flex items-center justify-center">
          <div className="relative inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200/50 shadow-sm">
            <Gift className="h-5 w-5 mr-3 text-rose-500" />
            <span className="text-rose-700 font-medium text-lg">{eventType} Celebration</span>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-300 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Contact Name Section with romantic styling */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-serif italic text-gray-800 mb-2">
              Tell us about yourselves
            </h3>
            <div className="flex items-center justify-center gap-2 text-rose-500">
              <Users className="h-5 w-5" />
              <span className="text-sm font-medium">Primary Contact Information</span>
            </div>
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-rose-300 to-transparent mx-auto mt-3"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={control}
                name="contactName.firstName"
                rules={{ required: "First name is required." }}
                render={({ field }) => (
                <FormItem className="group">
                    <FormLabel className="flex items-center gap-2 text-gray-700 font-medium transition-colors group-focus-within:text-rose-600">
                        <Heart className="h-4 w-4 text-rose-400" />
                        First Name*
                    </FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Input 
                                placeholder="Your first name" 
                                {...field} 
                                className="pl-4 pr-4 py-3 border-gray-200 rounded-xl transition-all duration-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 hover:border-rose-300 bg-white/70 backdrop-blur-sm shadow-sm"
                            />
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-rose-50/0 via-rose-50/20 to-pink-50/0 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 pointer-events-none"></div>
                        </div>
                    </FormControl>
                    <FormMessage className="text-rose-500" />
                </FormItem>
                )}
            />
            <FormField
                control={control}
                name="contactName.lastName"
                rules={{ required: "Last name is required." }}
                render={({ field }) => (
                <FormItem className="group">
                    <FormLabel className="flex items-center gap-2 text-gray-700 font-medium transition-colors group-focus-within:text-rose-600">
                        <Heart className="h-4 w-4 text-rose-400" />
                        Last Name*
                    </FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Input 
                                placeholder="Your last name" 
                                {...field} 
                                className="pl-4 pr-4 py-3 border-gray-200 rounded-xl transition-all duration-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 hover:border-rose-300 bg-white/70 backdrop-blur-sm shadow-sm"
                            />
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-rose-50/0 via-rose-50/20 to-pink-50/0 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 pointer-events-none"></div>
                        </div>
                    </FormControl>
                    <FormMessage className="text-rose-500" />
                </FormItem>
                )}
            />
            </div>
        </div>


        {/* Contact Information Section */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-serif italic text-gray-800 mb-2">
              How can we reach you?
            </h3>
            <div className="flex items-center justify-center gap-2 text-rose-500">
              <Mail className="h-5 w-5" />
              <span className="text-sm font-medium">Contact Details</span>
            </div>
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-rose-300 to-transparent mx-auto mt-3"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={control}
              name="email"
              rules={{
                required: "Email address is required",
                pattern: {
                  value: emailRegex,
                  message: "Please enter a valid email address",
                },
              }}
              render={({ field }) => (
                <FormItem className="group">
                  <FormLabel className="flex items-center gap-2 text-gray-700 font-medium transition-colors group-focus-within:text-rose-600">
                    <Mail className="h-4 w-4 text-rose-400" />
                    Email Address*
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="email"
                        placeholder="your.email@example.com" 
                        {...field} 
                        className="pl-4 pr-4 py-3 border-gray-200 rounded-xl transition-all duration-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 hover:border-rose-300 bg-white/70 backdrop-blur-sm shadow-sm"
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-rose-50/0 via-rose-50/20 to-pink-50/0 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 pointer-events-none"></div>
                    </div>
                  </FormControl>
                  <FormMessage className="text-rose-500" />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="phone"
              rules={{
                required: "Phone number is required",
                pattern: {
                  value: phoneRegex,
                  message: "Please enter a valid phone number",
                },
              }}
              render={({ field }) => (
                <FormItem className="group">
                  <FormLabel className="flex items-center gap-2 text-gray-700 font-medium transition-colors group-focus-within:text-rose-600">
                    <Phone className="h-4 w-4 text-rose-400" />
                    Phone Number*
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="tel"
                        placeholder="(555) 123-4567" 
                        {...field} 
                        className="pl-4 pr-4 py-3 border-gray-200 rounded-xl transition-all duration-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 hover:border-rose-300 bg-white/70 backdrop-blur-sm shadow-sm"
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-rose-50/0 via-rose-50/20 to-pink-50/0 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 pointer-events-none"></div>
                    </div>
                  </FormControl>
                  <FormMessage className="text-rose-500" />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Address Section */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-serif italic text-gray-800 mb-2">
              Where should we send details?
            </h3>
            <div className="flex items-center justify-center gap-2 text-rose-500">
              <MapPin className="h-5 w-5" />
              <span className="text-sm font-medium">Mailing Address</span>
            </div>
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-rose-300 to-transparent mx-auto mt-3"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={control}
              name="email"
              rules={{
                required: "Email address is required",
                pattern: {
                  value: emailRegex,
                  message: "Please enter a valid email address",
                },
              }}
              render={({ field }) => (
                <FormItem className="group">
                  <FormLabel className="flex items-center gap-2 text-gray-700 font-medium transition-colors group-focus-within:text-rose-600">
                    <Mail className="h-4 w-4 text-rose-400" />
                    Email Address*
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="email"
                        placeholder="your.email@example.com" 
                        {...field} 
                        className="pl-4 pr-4 py-3 border-gray-200 rounded-xl transition-all duration-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 hover:border-rose-300 bg-white/70 backdrop-blur-sm shadow-sm"
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-rose-50/0 via-rose-50/20 to-pink-50/0 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 pointer-events-none"></div>
                    </div>
                  </FormControl>
                  <FormMessage className="text-rose-500" />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-10">
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            className="flex items-center px-6 py-3 text-lg border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all duration-300"
          >
            <ChevronLeft className="mr-2 h-5 w-5" /> Back
          </Button>
          <Button
            type="button"
            onClick={handleNextClick}
            className="flex items-center bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 px-8 py-3 text-lg text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Continue Your Journey <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WeddingBasicInformationStep;
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="(123) 456-7890"
                    {...field}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, "");
                      if (value.length > 0) {
                        if (value.length <= 3) {
                          value = `(${value}`;
                        } else if (value.length <= 6) {
                          value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                        } else {
                          value = `(${value.slice(0, 3)}) ${value.slice(3,6)}-${value.slice(6, 10)}`;
                        }
                      }
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormDescription className="text-xs text-gray-500">
                  Format: (123) 456-7890
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Billing Address */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 flex items-center text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-pink-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
            </svg>
            Billing Address
          </h3>
          <div className="space-y-4">
            <FormField
              control={control}
              name="billingAddress.street"
              rules={{ required: "Street address is required." }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address*</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="billingAddress.street2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address Line 2</FormLabel>
                  <FormControl>
                    <Input placeholder="Apt, Suite, Unit, etc. (optional)" {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <FormField
                control={control}
                name="billingAddress.city"
                rules={{ required: "City is required." }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City*</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="billingAddress.state"
                rules={{ required: "State is required." }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province*</FormLabel>
                    <FormControl>
                      <Input placeholder="State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="billingAddress.zipCode"
                rules={{
                  required: "ZIP code is required",
                  pattern: {
                    value: zipCodeRegex,
                    message: "Enter a valid ZIP (5 or 9 digits)",
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal/Zip Code*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="12345 or 12345-6789"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d-]/g, "");
                          field.onChange(value);
                        }}
                        maxLength={10}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-gray-500">
                      Format: 12345 or 12345-6789
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* Event Date and Time */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 flex items-center text-gray-800">
            <CalendarIcon className="h-5 w-5 mr-2 text-pink-600" />
            Wedding Date & Reception Start Time
          </h3>
          <div className="p-4 bg-gray-50 dark:bg-gray-800/30 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                control={control}
                name="eventDate"
                rules={{ required: "Wedding date is required."}}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center">
                      <CalendarIcon className="mr-2 h-4 w-4" /> Wedding Date*
                    </FormLabel>
                    <div className="relative">
                      <DatePicker
                        selected={field.value ? new Date(field.value) : null}
                        onChange={(date) => {
                          field.onChange(date ? date.toISOString().split("T")[0] : "");
                        }}
                        dateFormat="MMMM d, yyyy"
                        minDate={new Date()} // Prevent selecting past dates
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        placeholderText="Select wedding date"
                        wrapperClassName="w-full"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="eventStartTime" // This refers to Reception Start Time in wedding context
                rules={{ required: "Reception start time is required."}}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <ClockIcon className="mr-2 h-4 w-4" /> Reception Start Time*
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="mt-3 bg-pink-50 dark:bg-pink-900/10 text-pink-700 dark:text-pink-300 text-sm p-3 rounded-md flex items-center">
                <InfoIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                <div>Note: You'll be able to specify ceremony times and other schedule details in the next step.</div>
            </div>
          </div>
        </div>
         {/* Company Name - Hidden by default for weddings, can be un-commented if needed for specific cases */}
        {/*
        {eventType === "Corporate" && ( // This condition will always be false here
          <div className="mb-6">
            <FormField
              control={control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
        */}
      </div>

      {validationError && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative flex items-center" role="alert">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span className="block sm:inline">{validationError}</span>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-10">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          className="flex items-center px-6 py-3 text-lg"
          disabled={true} // First step, so previous is disabled
        >
          <ChevronLeft className="mr-2 h-5 w-5" /> Back
        </Button>
        <Button
          type="button"
          onClick={handleNextClick}
          className="flex items-center bg-pink-600 hover:bg-pink-700 px-6 py-3 text-lg text-white"
        >
          Next <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default WeddingBasicInformationStep;