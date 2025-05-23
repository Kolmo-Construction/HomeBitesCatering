// client/src/components/form-steps/BasicInformationStep.tsx
import React, { useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Form, FormControl, FormItem, FormLabel, FormMessage, FormField, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock as ClockIcon, AlertCircle } from "lucide-react";
import { EventType, EventInquiryFormData } from "@/types/form-types";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as z from "zod";

// Make sure EventInquiryFormData is imported if BasicInformationStep relies on it for useFormContext
// If FormProvider or Controller are used directly in this component's JSX, keep them.
// If they were only part of the outer form setup, they might not be needed here.
// Based on the original file, useFormContext and FormField/FormItem etc. are key.

// Define validation schemas for form fields
const phoneRegex = /^(\+\d{1,3})?\s?(\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const zipCodeRegex = /^\d{5}(-\d{4})?$/;

const BasicInformationStep = ({
  eventType,
  onPrevious,
  onNext
}: {
  eventType: EventType;
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch, setValue, trigger, formState: { errors, isValid } } = useFormContext<EventInquiryFormData>();
  
  // State for date and time selection
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeOptions, setTimeOptions] = useState<string[]>([]);
  
  // Track validation errors
  const [validationError, setValidationError] = useState("");
  
  // Generate time options based on event type
  useEffect(() => {
    let options: string[] = [];
    
    // Different default times based on event type
    if (eventType === "Wedding") {
      // Weddings typically afternoon to evening
      for (let hour = 13; hour <= 20; hour++) {
        options.push(`${hour}:00`);
        options.push(`${hour}:30`);
      }
    } else if (eventType === "Corporate") {
      // Corporate events typically during business hours
      for (let hour = 8; hour <= 18; hour++) {
        options.push(`${hour}:00`);
        options.push(`${hour}:30`);
      }
    } else if (eventType === "Birthday") {
      // Birthday events typically afternoon to evening
      for (let hour = 12; hour <= 21; hour++) {
        options.push(`${hour}:00`);
        options.push(`${hour}:30`);
      }
    } else {
      // Default time range for other event types
      for (let hour = 8; hour <= 22; hour++) {
        options.push(`${hour}:00`);
        options.push(`${hour}:30`);
      }
    }
    
    setTimeOptions(options);
  }, [eventType]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Basic Information</h2>
        <p className="text-lg text-gray-600">
          Let's get to know you and your {eventType.toLowerCase()} event
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-6 flex items-center justify-center bg-gray-100 py-3 rounded-md">
          <div className={`inline-flex items-center px-4 py-2 rounded-md bg-primary/10 border border-primary/20`}>
            <span className="text-primary font-medium">{eventType}</span>
          </div>
        </div>

        {/* Company Name - Only show for Corporate events */}
        {eventType === "Corporate" && (
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

        {/* Contact Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormField
            control={control}
            name="contactName.firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name*</FormLabel>
                <FormControl>
                  <Input placeholder="Enter first name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="contactName.lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name*</FormLabel>
                <FormControl>
                  <Input placeholder="Enter last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Email and Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormField
            control={control}
            name="email"
            rules={{
              required: "Email address is required",
              pattern: {
                value: emailRegex,
                message: "Please enter a valid email address"
              }
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address*</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="email@example.com" 
                    type="email"
                    autoComplete="email"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="phone"
            rules={{
              pattern: {
                value: phoneRegex,
                message: "Please enter a valid phone number: (123) 456-7890"
              }
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="(123) 456-7890" 
                    {...field} 
                    onChange={(e) => {
                      // Format phone number as user types
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length > 0) {
                        // Auto-format to (XXX) XXX-XXXX
                        if (value.length <= 3) {
                          value = `(${value}`;
                        } else if (value.length <= 6) {
                          value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                        } else {
                          value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
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
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Billing Address
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={control}
                name="billingAddress.street"
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
                      <Input placeholder="Apt, Suite, Unit, etc. (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <FormField
                control={control}
                name="billingAddress.city"
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
                    message: "Enter a valid ZIP code (5 digits or ZIP+4 format)"
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal/Zip Code*</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="12345" 
                        {...field} 
                        onChange={(e) => {
                          // Only allow digits and hyphen for ZIP+4
                          const value = e.target.value.replace(/[^\d-]/g, '');
                          field.onChange(value);
                        }}
                        maxLength={10} // Maximum for ZIP+4 (12345-6789)
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

        {/* Event Date and Time - Enhanced with DatePicker and Time selection */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2 text-primary" />
            Event Details
          </h3>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                control={control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center">
                      <CalendarIcon className="mr-2 h-4 w-4" /> Event Date*
                    </FormLabel>
                    <div className="relative">
                      <DatePicker
                        selected={field.value ? new Date(field.value) : null}
                        onChange={(date) => {
                          field.onChange(date ? date.toISOString().split('T')[0] : '');
                          setSelectedDate(date);
                        }}
                        dateFormat="MMMM d, yyyy"
                        minDate={new Date()}
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none"
                        placeholderText="Select event date"
                        wrapperClassName="w-full"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={control}
                name="eventStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <ClockIcon className="mr-2 h-4 w-4" /> Start Time*
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value || ""}
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
            
            {eventType === "Wedding" && (
              <div className="mt-3 bg-blue-50 text-blue-700 text-sm p-2 rounded-md flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Note: For weddings, you'll be able to add ceremony and reception times in the next step.
              </div>
            )}
            
            {eventType === "Corporate" && (
              <div className="mt-3 bg-blue-50 text-blue-700 text-sm p-2 rounded-md flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Tip: Business hours (8am-6pm) are shown by default for corporate events.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Display validation error message if present */}
      {validationError && (
        <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <div>{validationError}</div>
        </div>
      )}
      
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
          onClick={async () => {
            // Trigger validation on all fields
            const isFormValid = await trigger(["email", "phone", "billingAddress.zipCode", "eventDate", "eventStartTime"]);
            
            if (!isFormValid) {
              setValidationError("Please correct the highlighted fields before continuing.");
              // Scroll to the top of the form to show the error message
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              setValidationError("");
              onNext();
            }
          }}
          className="flex items-center"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default BasicInformationStep;