// src/pages/wedding/components/WeddingBasicInformationStepClean.tsx
import React, { useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  FormField,
  FormDescription,
} from "@/components/ui/form";
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
  ChevronRight,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Heart,
  Mail,
  Phone,
  MapPin,
  Gift,
  Users,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { EventType, WeddingInquiryFormData } from "../types/weddingFormTypes";

const phoneRegex = /^(\+\d{1,3})?\s?(\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const zipCodeRegex = /^\d{5}(-\d{4})?$/;

interface WeddingBasicInformationStepProps {
  eventType: "Wedding";
  onPrevious: () => void;
  onNext: () => void;
}

const WeddingBasicInformationStepClean: React.FC<WeddingBasicInformationStepProps> = ({
  eventType,
  onPrevious,
  onNext,
}) => {
  const {
    control,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<WeddingInquiryFormData>();

  const [timeOptions, setTimeOptions] = useState<string[]>([]);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    let options: string[] = [];
    for (let hour = 12; hour <= 22; hour++) {
      options.push(`${String(hour).padStart(2, '0')}:00`);
      options.push(`${String(hour).padStart(2, '0')}:30`);
    }
    setTimeOptions(options);
  }, []);

  const handleNextClick = async () => {
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
      "eventStartTime",
    ]);

    if (!result) {
      setValidationError("Please correct the highlighted fields before continuing.");
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

        {/* Contact Name Section */}
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

        {/* Validation Error */}
        {validationError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
            {validationError}
          </div>
        )}

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

export default WeddingBasicInformationStepClean;