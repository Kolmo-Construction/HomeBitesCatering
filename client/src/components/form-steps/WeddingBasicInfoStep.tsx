import React, { useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { FormControl, FormItem, FormLabel, FormMessage, FormField, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EventType, EventInquiryFormData } from "@/types/form-types";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Import wedding-themed components
import WeddingHeader from "../wedding-theme/WeddingHeader";
import WeddingInput from "../wedding-theme/WeddingInput";
import WeddingCard from "../wedding-theme/WeddingCard";

// Validation patterns
const phoneRegex = /^(\+\d{1,3})?\s?(\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const zipCodeRegex = /^\d{5}(-\d{4})?$/;

const WeddingBasicInfoStep = ({
  onPrevious,
  onNext
}: {
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch, setValue, trigger, formState: { errors, isValid } } = useFormContext<EventInquiryFormData>();
  
  // State for date and time selection
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeOptions, setTimeOptions] = useState<string[]>([]);
  
  // Track validation error
  const [validationError, setValidationError] = useState("");
  
  // Animation state for micro-interactions
  const [activeField, setActiveField] = useState<string | null>(null);
  
  // Sparkle effect states
  const [showSparkles, setShowSparkles] = useState(false);
  
  // Generate wedding-appropriate time options
  useEffect(() => {
    let options: string[] = [];
    
    // Wedding events typically afternoon to evening
    for (let hour = 10; hour <= 20; hour++) {
      options.push(`${hour}:00`);
      options.push(`${hour}:30`);
    }
    
    setTimeOptions(options);
  }, []);

  // Show sparkle animation when form fields are completed
  useEffect(() => {
    const firstName = watch("contactName.firstName");
    const lastName = watch("contactName.lastName");
    const email = watch("email");
    const date = watch("eventDate");
    
    if (firstName && lastName && email && date) {
      setShowSparkles(true);
      
      // Hide sparkles after animation completes
      const timer = setTimeout(() => {
        setShowSparkles(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [watch("contactName.firstName"), watch("contactName.lastName"), watch("email"), watch("eventDate")]);

  // Container animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  // Item animation variants
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Premium Wedding Header */}
      <WeddingHeader 
        title="Your Special Day" 
        subtitle="Let's begin planning your perfect wedding celebration"
      />
      
      {/* Sparkle animation */}
      <AnimatePresence>
        {showSparkles && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          >
            <div className="relative w-full h-full">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: Math.random() * 500 - 250,
                    y: Math.random() * 500 - 250,
                  }}
                  transition={{
                    duration: 1.5,
                    delay: Math.random() * 0.5,
                    ease: "easeInOut"
                  }}
                  className="absolute top-1/2 left-1/2 w-3 h-3 bg-rose-300 rounded-full"
                  style={{
                    boxShadow: "0 0 10px 2px rgba(244, 114, 182, 0.3)",
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Main form card with elegant styling */}
        <WeddingCard className="mb-8">
          <motion.div variants={itemVariants} className="mb-6 flex items-center justify-center">
            <div className="flex items-center gap-2 px-6 py-2 bg-rose-50 rounded-full text-rose-700 border border-rose-200">
              <Heart className="w-5 h-5 text-rose-500" />
              <span className="font-serif">Wedding</span>
            </div>
          </motion.div>
          
          {/* Contact Names - 2 column layout */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <FormField
              control={control}
              name="contactName.firstName"
              rules={{ required: "First name is required" }}
              render={({ field }) => (
                <WeddingInput
                  label="First Name"
                  field={field}
                  placeholder="Enter first name"
                  required={true}
                />
              )}
            />
            
            <FormField
              control={control}
              name="contactName.lastName"
              rules={{ required: "Last name is required" }}
              render={({ field }) => (
                <WeddingInput
                  label="Last Name"
                  field={field}
                  placeholder="Enter last name"
                  required={true}
                />
              )}
            />
          </motion.div>
          
          {/* Contact Information - 2 column layout */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                <WeddingInput
                  label="Email Address"
                  field={field}
                  placeholder="email@example.com"
                  type="email"
                  autoComplete="email"
                  required={true}
                />
              )}
            />
            
            <FormField
              control={control}
              name="phone"
              rules={{
                pattern: {
                  value: phoneRegex,
                  message: "Please enter a valid phone number"
                }
              }}
              render={({ field }) => (
                <WeddingInput
                  label="Phone Number"
                  field={field}
                  placeholder="(123) 456-7890"
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
              )}
            />
          </motion.div>
          
          {/* Billing Address section */}
          <motion.div variants={itemVariants} className="mb-8">
            <h3 className="font-serif text-xl text-rose-700 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              Billing Address
            </h3>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={control}
                  name="billingAddress.street"
                  rules={{ required: "Street address is required" }}
                  render={({ field }) => (
                    <WeddingInput
                      label="Street Address"
                      field={field}
                      placeholder="123 Main St"
                      required={true}
                    />
                  )}
                />

                <FormField
                  control={control}
                  name="billingAddress.street2"
                  render={({ field }) => (
                    <WeddingInput
                      label="Street Address Line 2"
                      field={field}
                      placeholder="Apt, Suite, Unit, etc. (optional)"
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <FormField
                  control={control}
                  name="billingAddress.city"
                  rules={{ required: "City is required" }}
                  render={({ field }) => (
                    <WeddingInput
                      label="City"
                      field={field}
                      placeholder="City"
                      required={true}
                    />
                  )}
                />

                <FormField
                  control={control}
                  name="billingAddress.state"
                  rules={{ required: "State is required" }}
                  render={({ field }) => (
                    <WeddingInput
                      label="State/Province"
                      field={field}
                      placeholder="State"
                      required={true}
                    />
                  )}
                />

                <FormField
                  control={control}
                  name="billingAddress.zipCode"
                  rules={{
                    required: "ZIP code is required",
                    pattern: {
                      value: zipCodeRegex,
                      message: "Enter a valid ZIP code"
                    }
                  }}
                  render={({ field }) => (
                    <WeddingInput
                      label="Postal/Zip Code"
                      field={field}
                      placeholder="12345"
                      required={true}
                      onChange={(e) => {
                        // Only allow digits and hyphen for ZIP+4
                        const value = e.target.value.replace(/[^\d-]/g, '');
                        field.onChange(value);
                      }}
                      maxLength={10}
                    />
                  )}
                />
              </div>
            </div>
          </motion.div>
          
          {/* Wedding Date and Time - Enhanced with DatePicker and Time selection */}
          <motion.div variants={itemVariants} className="mb-6">
            <h3 className="font-serif text-xl text-rose-700 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-rose-500" />
              Wedding Details
            </h3>
            
            <div className="p-4 bg-rose-50/50 rounded-lg border border-rose-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Controller
                  control={control}
                  name="eventDate"
                  rules={{ required: "Wedding date is required" }}
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="font-serif text-rose-700 flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-rose-500" /> Wedding Date*
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
                          className="w-full rounded-md border border-rose-200 px-3 py-2 text-sm placeholder:text-rose-300 
                                    focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                          placeholderText="Select your wedding date"
                          wrapperClassName="w-full"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-rose-300">
                          <Calendar className="h-4 w-4" />
                        </div>
                      </div>
                      <FormMessage className="text-rose-500" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="eventStartTime"
                  rules={{ required: "Start time is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-serif text-rose-700 flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-rose-500" /> Ceremony Time*
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="border-rose-200 focus:ring-rose-200 focus:border-rose-300 bg-white">
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
                      <FormMessage className="text-rose-500" />
                      <FormDescription className="text-rose-400 text-xs mt-1">
                        You can add reception times in the next section
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="mt-4 bg-white/70 text-rose-700 text-sm p-3 rounded-md border border-rose-100 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>You'll be able to add more detailed ceremony and reception timing in the next step.</span>
              </div>
            </div>
          </motion.div>
        </WeddingCard>
      </motion.div>

      {/* Display validation error message if present */}
      {validationError && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-md flex items-center border border-red-200">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-red-500" />
          <div>{validationError}</div>
        </div>
      )}
      
      {/* Navigation Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="flex justify-between mt-8"
      >
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          className="flex items-center border-rose-200 text-rose-700 hover:bg-rose-50"
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
          className="flex items-center bg-rose-500 hover:bg-rose-600 text-white"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
};

export default WeddingBasicInfoStep;