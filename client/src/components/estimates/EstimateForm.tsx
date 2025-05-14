import { useState, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { insertEstimateSchema, type Estimate as EstimateType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { CalendarIcon, PlusIcon, Trash2Icon, DollarSignIcon } from "lucide-react"; // Added DollarSignIcon
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatDate, formatCurrency, calculateTax, calculateTotal } from "@/lib/utils";

// Define the structure for custom items managed in the form's state
interface CustomItem {
  id: string; // Client-side unique ID
  name: string;
  quantity: number;
  price: number; // Stored in cents
}

// Extend the estimate schema for form validation.
// Note: 'items' and 'additionalServices' are jsonb in the DB.
// For this form, 'items' will be managed by the `customItems` state and stringified before API submission.
// `insertEstimateSchema` already defines fields like `subtotal`, `tax`, `total` as numbers (cents).
const formSchema = insertEstimateSchema.extend({
  clientId: z.number({ required_error: "Client is required." }).min(1, "Client is required"),
  eventType: z.string({ required_error: "Event type is required." }).min(1, "Event type is required"),
  guestCount: z.coerce.number().int().positive("Guest count must be positive").optional().nullable(),
  venue: z.string().optional().nullable(),
  eventDate: z.date().optional().nullable(),
  // subtotal, tax, total are part of insertEstimateSchema, ensure they are numbers (cents)
  notes: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  // `items` and `additionalServices` from insertEstimateSchema are z.any() or similar for jsonb.
  // We don't need them directly in the form's Zod schema if managed by separate state.
  // However, if they are part of the Zod schema for validation (e.g. as z.string() for JSON),
  // ensure they are handled correctly. For this implementation, we'll omit them from direct
  // form control via react-hook-form and handle `customItems` separately.
}).omit({ 
  items: true, // Omit if managed by customItems state and not directly a form field
  additionalServices: true // Omit if managed separately or not directly in this form
});

type FormValues = z.infer<typeof formSchema>;

interface EstimateFormProps {
  estimate?: EstimateType; // This is the raw estimate data from the API
  isEditing?: boolean;
}

export default function EstimateForm({ estimate, isEditing = false }: EstimateFormProps) {
  console.log("EstimateForm received props:", { estimate, isEditing });
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [clientPortalUrl, setClientPortalUrl] = useState<string>("");
  const [showPortalLink, setShowPortalLink] = useState<boolean>(false);
  
  // Venue address fields for tax calculation
  const [venueAddress, setVenueAddress] = useState<string>("");
  const [venueCity, setVenueCity] = useState<string>("");
  const [venueZip, setVenueZip] = useState<string>("");
  const [taxRate, setTaxRate] = useState<number>(0.095); // Default 9.5%

  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);

  // Fetch clients for dropdown
  const { data: clients = [], isLoading: isLoadingClients } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch menus for dropdown
  const { data: menus = [], isLoading: isLoadingMenus } = useQuery<any[]>({
    queryKey: ["/api/menus"],
  });

  // Fetch details of the selected menu
  const { data: selectedMenu, isLoading: isLoadingSelectedMenu } = useQuery<any>({
    queryKey: ["/api/menus", selectedMenuId],
    enabled: !!selectedMenuId,
  });

  // Function to safely parse items from the estimate prop
  const parseEstimateItems = useCallback((itemsData: any): CustomItem[] => {
    if (!itemsData) return [];
    if (typeof itemsData === 'string') {
      try {
        if (itemsData.trim() === "") return [];
        const parsed = JSON.parse(itemsData);
        return Array.isArray(parsed) ? parsed.map(item => ({...item, price: Number(item.price) || 0, quantity: Number(item.quantity) || 1 })) : [];
      } catch (e) {
        console.error("Error parsing estimate.items JSON string:", e, "Value was:", itemsData);
        return [];
      }
    } else if (Array.isArray(itemsData)) {
      return itemsData.map(item => ({...item, price: Number(item.price) || 0, quantity: Number(item.quantity) || 1 }));
    }
    console.warn("estimate.items was neither a string nor an array:", itemsData);
    return [];
  }, []);


  // Memoized default values function
  const getFormDefaultValues = useCallback((): FormValues => {
    if (isEditing && estimate) {
      console.log("EstimateForm - getFormDefaultValues - Populating for editing:", estimate);
      return {
        clientId: Number(estimate.clientId) || undefined,
        eventType: estimate.eventType || "",
        guestCount: estimate.guestCount != null ? Number(estimate.guestCount) : null,
        venue: estimate.venue || "",
        eventDate: estimate.eventDate ? new Date(estimate.eventDate) : null,
        menuId: estimate.menuId != null ? Number(estimate.menuId) : null,
        subtotal: Number(estimate.subtotal) || 0,
        tax: Number(estimate.tax) || 0,
        total: Number(estimate.total) || 0,
        notes: estimate.notes || "",
        status: estimate.status || "draft",
        zipCode: estimate.zipCode || "",
        createdBy: estimate.createdBy != null ? Number(estimate.createdBy) : undefined,
        // Dates from schema
        sentAt: estimate.sentAt ? new Date(estimate.sentAt) : null,
        expiresAt: estimate.expiresAt ? new Date(estimate.expiresAt) : null,
        viewedAt: estimate.viewedAt ? new Date(estimate.viewedAt) : null,
        acceptedAt: estimate.acceptedAt ? new Date(estimate.acceptedAt) : null,
        declinedAt: estimate.declinedAt ? new Date(estimate.declinedAt) : null,
      };
    }
    return { // Defaults for a new form
      clientId: undefined,
      eventType: "",
      guestCount: null,
      venue: "",
      eventDate: null,
      menuId: null,
      subtotal: 0,
      tax: 0,
      total: 0,
      notes: "",
      status: "draft",
      zipCode: "",
      createdBy: undefined, // This should be set by the backend or auth context
      sentAt: null,
      expiresAt: null,
      viewedAt: null,
      acceptedAt: null,
      declinedAt: null,
    };
  }, [estimate, isEditing]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getFormDefaultValues(),
    mode: "onChange",
  });

  // Effect to initialize/reset form and local states when in edit mode and estimate data is available
  useEffect(() => {
    if (isEditing && estimate) {
      console.log("EstimateForm: useEffect resetting form with estimate:", estimate);
      form.reset(getFormDefaultValues());

      setCustomItems(parseEstimateItems(estimate.items));
      setSelectedMenuId(estimate.menuId != null ? Number(estimate.menuId) : null);
      setZipCode(estimate.zipCode || "");
      // Financials are set by the calculation useEffect
    } else if (!isEditing) {
      // Reset for new form if needed (e.g., navigating from edit to new)
      form.reset(getFormDefaultValues());
      setCustomItems([]);
      setSelectedMenuId(null);
      setZipCode("");
    }
  }, [estimate, isEditing, form.reset, getFormDefaultValues, parseEstimateItems]);


  // Price calculation effect
  useEffect(() => {
    let newSubtotal = 0;
    const guestCountValue = form.getValues("guestCount");
    const currentGuestCount = guestCountValue != null && guestCountValue > 0 ? guestCountValue : 1;

    if (selectedMenuId && selectedMenu && Array.isArray(selectedMenu.items)) {
      const menuPricePerGuest = selectedMenu.items.reduce((acc: number, itemDetail: any) => {
        // Assuming itemDetail could be { menuItem: {...}, quantity: X } or just the item itself
        const actualItem = itemDetail.menuItem || itemDetail;
        const price = Number(actualItem?.price) || 0; // Price in cents
        const quantity = Number(itemDetail.quantity) || 1;
        return acc + (price * quantity);
      }, 0);
      newSubtotal += menuPricePerGuest * currentGuestCount;
    }

    customItems.forEach(item => {
      newSubtotal += (Number(item.price) || 0) * (Number(item.quantity) || 0); // item.price is in cents
    });

    const currentZipCode = form.getValues("zipCode"); // Get zipCode from form state
    const newTax = calculateTax(newSubtotal, currentZipCode); // calculateTax expects amount in base units (cents)
    const newTotal = calculateTotal(newSubtotal, newTax);

    setSubtotal(Math.round(newSubtotal));
    setTax(Math.round(newTax));
    setTotal(Math.round(newTotal));

    // Update form values for subtotal, tax, total so they are part of the submission
    form.setValue("subtotal", Math.round(newSubtotal), { shouldValidate: true });
    form.setValue("tax", Math.round(newTax), { shouldValidate: true });
    form.setValue("total", Math.round(newTotal), { shouldValidate: true });

  }, [selectedMenu, customItems, form, selectedMenuId]); // Added form to dependencies for getValues


  // Mutation for creating/updating estimate
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const itemsJson = JSON.stringify(customItems.map(item => ({
        id: item.id, // For custom items, ID might be client-generated or from DB if these were pre-defined custom options
        name: item.name,
        quantity: Number(item.quantity),
        price: Number(item.price), // Ensure price is number (cents)
      })));

      const payload = {
        ...values,
        // Ensure dates are ISO strings or null
        eventDate: values.eventDate ? values.eventDate.toISOString() : null,
        sentAt: values.sentAt ? (values.sentAt as Date).toISOString() : null,
        expiresAt: values.expiresAt ? (values.expiresAt as Date).toISOString() : null,
        viewedAt: values.viewedAt ? (values.viewedAt as Date).toISOString() : null,
        acceptedAt: values.acceptedAt ? (values.acceptedAt as Date).toISOString() : null,
        declinedAt: values.declinedAt ? (values.declinedAt as Date).toISOString() : null,
        items: itemsJson,
        additionalServices: values.additionalServices ? JSON.stringify(values.additionalServices) : null, // Assuming similar handling
        menuId: selectedMenuId, // Already a number or null
        // Use calculated financials from state for submission
        subtotal: subtotal,
        tax: tax,
        total: total,
        // createdBy: should be handled by backend or auth context
      };

      console.log('Submitting payload for estimate:', payload);
      if (isEditing && estimate) {
        const res = await apiRequest("PATCH", `/api/estimates/${estimate.id}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/estimates", payload);
        return res.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      if (data.clientPortalUrl) {
        setClientPortalUrl(data.clientPortalUrl);
        setShowPortalLink(true);
        toast({
          title: "Quote sent",
          description: "The quote has been sent successfully. A client portal link has been generated."
        });
      } else {
        toast({
          title: isEditing ? "Quote updated" : "Quote created",
          description: isEditing 
            ? "The quote has been updated successfully." 
            : "The new quote has been created successfully."
        });
        if (!data.clientPortalUrl) { // Only navigate if not showing portal link
            navigate("/estimates");
        }
      }
    },
    onError: (error: any) => {
      console.error("Form submission error:", error);
      let readableError = `Failed to ${isEditing ? "update" : "create"} quote.`;
      if (error?.message) {
          try {
              // Attempt to parse if error.message contains JSON string from apiRequest's throwIfResNotOk
              const errorDetails = JSON.parse(error.message.substring(error.message.indexOf("{")));
              if (errorDetails.message) {
                  readableError = errorDetails.message;
                  if (errorDetails.errors) {
                      readableError += ` Details: ${errorDetails.errors.map((e:any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
                  }
              }
          } catch (e) {
              // If parsing fails, use the original error message string
              readableError = error.message;
          }
      }
      toast({ title: "Error", description: readableError, variant: "destructive" });
    }
  });

  // Handlers for custom items
  const handleAddCustomItem = () => {
    setCustomItems([...customItems, { id: `temp-${Date.now()}`, name: "", quantity: 1, price: 0 }]);
  };

  const handleRemoveCustomItem = (id: string) => {
    setCustomItems(customItems.filter(item => item.id !== id));
  };

  const handleCustomItemChange = (id: string, field: keyof CustomItem, value: string | number) => {
    setCustomItems(customItems.map(item => 
      item.id === id 
        ? { ...item, [field]: field === 'price' ? Math.round(Number(value) * 100) : (field === 'quantity' ? Number(value) : value) } 
        : item
    ));
  };

  // Form submission handler
  const onSubmit = (values: FormValues) => {
    console.log("Form values at onSubmit:", values);
    // The mutation function now handles date stringification and inclusion of calculated financials
    // Ensure status is correctly passed, especially for new estimates
    const submissionValues = {
        ...values,
        status: form.getValues("status") || "draft" // Ensure status is always set
    };
    mutation.mutate(submissionValues);
  };

  // Handler for "Save & Send"
  const handleSendEstimate = () => {
    form.setValue("status", "sent");
    form.setValue("sentAt", new Date()); // Set sentAt when sending
    form.handleSubmit(onSubmit)(); // Trigger the main submit handler
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Quote" : "Create New Quote"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Client and Event Type Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value, 10))} 
                      value={field.value?.toString()} // Use value for controlled component
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingClients && <SelectItem value="loading" disabled>Loading clients...</SelectItem>}
                        {clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.firstName} {client.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      value={field.value} // Use value for controlled component
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
            </div>

            {/* Event Date and Guest Count */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        value={field.value == null ? "" : field.value} // Handle null/undefined for empty display
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Venue and Zip Code */}
            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location/Venue</FormLabel>
                  <FormControl>
                    <Input placeholder="Event location or venue" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Address fields for WA Tax calculation */}
            <div className="space-y-4">
              <h3 className="text-md font-medium">Venue Address (for Tax Calculation)</h3>
              
              <FormField
                control={form.control}
                name="venueAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="123 Main St" 
                        {...field} 
                        value={field.value || ""}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          setVenueAddress(e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="venueCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Seattle" 
                          {...field} 
                          value={field.value || ""}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            setVenueCity(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="venueZip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="98101" 
                          {...field} 
                          value={field.value || ""}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            setVenueZip(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Menu Selection */}
            <div>
              <FormLabel>Menu Selection</FormLabel>
              <Select 
                onValueChange={(value) => {
                  const menuIdValue = value === "none" ? null : parseInt(value, 10);
                  setSelectedMenuId(menuIdValue);
                  form.setValue("menuId", menuIdValue); // Update form state
                }} 
                value={selectedMenuId?.toString() || "none"} // Controlled component
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a menu" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingMenus && <SelectItem value="loading" disabled>Loading menus...</SelectItem>}
                  <SelectItem value="none">No Menu (Custom Items Only)</SelectItem>
                  {menus.map((menu: any) => (
                    <SelectItem key={menu.id} value={menu.id.toString()}>
                      {menu.name} - {formatCurrency(
                        (Array.isArray(menu.items) 
                          ? menu.items.reduce((acc: number, item: any) => {
                              const menuItem = item.menuItem || item;
                              return acc + (Number(menuItem?.price) || 0);
                            }, 0)
                          : 0) / 100 // Assuming price is in cents
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMenuId && selectedMenu && (
                <div className="mt-4 border rounded-md p-4">
                  <h4 className="font-medium">{selectedMenu.name || 'Selected Menu'}</h4>
                  <p className="text-sm text-gray-500">{selectedMenu.description || ''}</p>
                  <ul className="mt-2 space-y-1">
                    {Array.isArray(selectedMenu.items) && selectedMenu.items.map((itemDetail: any, index: number) => {
                      const actualItem = itemDetail.menuItem || itemDetail;
                      return (
                        <li key={index} className="text-sm">
                          {itemDetail.quantity || 1}x {actualItem.name || 'Menu Item'} - {formatCurrency((Number(actualItem.price) || 0) / 100)}
                        </li>
                      );
                    })}
                  </ul>
                   <div className="mt-2 text-sm font-medium">
                      Per Person: {formatCurrency(
                      (Array.isArray(selectedMenu.items) 
                        ? selectedMenu.items.reduce((acc: number, itemDetail: any) => {
                            const actualItem = itemDetail.menuItem || itemDetail;
                            const price = Number(actualItem?.price) || 0;
                            const quantity = Number(itemDetail.quantity) || 1;
                            return acc + (price * quantity);
                          }, 0)
                        : 0) / 100
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <FormLabel>Custom Items / Additional Services</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={handleAddCustomItem}>
                  <PlusIcon className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              {customItems.length === 0 ? (
                <div className="border border-dashed rounded-md p-4 text-center text-gray-500">
                  No custom items added.
                </div>
              ) : (
                <div className="space-y-2">
                  {customItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 border rounded-md p-3">
                      <Input
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) => handleCustomItemChange(item.id, "name", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        min={1}
                        onChange={(e) => handleCustomItemChange(item.id, "quantity", parseInt(e.target.value, 10) || 1)}
                        className="w-20"
                      />
                      <div className="relative w-32">
                        <DollarSignIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={item.price / 100} // Display in dollars
                          step="0.01"
                          min={0}
                          onChange={(e) => handleCustomItemChange(item.id, "price", e.target.value)} // handleCustomItemChange will convert to cents
                          className="pl-7" // Make space for dollar sign
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveCustomItem(item.id)}>
                        <Trash2Icon className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal / 100)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Tax:</span>
                <span>{formatCurrency(tax / 100)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>{formatCurrency(total / 100)}</span>
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes for the estimate (e.g., dietary restrictions, special requests)"
                      className="resize-none" 
                      rows={3}
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status (only in edit mode) */}
            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value} // Controlled component
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="viewed">Viewed</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Action Buttons */}
            <CardFooter className="px-0 pt-4 flex justify-between">
              <Button type="button" variant="outline" onClick={() => navigate("/estimates")}>
                Cancel
              </Button>
              <div className="flex space-x-2">
                <Button type="submit" variant="outline" disabled={mutation.isPending || (mutation.isSuccess && showPortalLink)}>
                  {mutation.isPending ? "Saving..." : (isEditing ? "Update Draft" : "Save as Draft")}
                </Button>
                {(!isEditing || (isEditing && form.getValues("status") === "draft")) && (
                  <Button 
                    type="button" 
                    className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90"
                    onClick={handleSendEstimate}
                    disabled={mutation.isPending || (mutation.isSuccess && showPortalLink)}
                  >
                    {mutation.isPending && form.getValues("status") === "sent" ? "Sending..." : (isEditing ? "Update & Send" : "Save & Send")}
                  </Button>
                )}
              </div>
            </CardFooter>
          </form>

          {showPortalLink && clientPortalUrl && (
            <div className="mt-8 p-4 border border-green-200 bg-green-50 rounded-md">
              <h3 className="text-lg font-semibold text-green-700 mb-2">Client Portal Created</h3>
              <p className="text-sm text-green-600 mb-4">
                A client portal has been created for this quote. Share this link with your client:
              </p>
              <div className="flex items-center space-x-2 mb-4">
                <Input 
                  type="text" 
                  value={clientPortalUrl} 
                  readOnly 
                  className="flex-1 p-2 text-sm border rounded-md bg-white" 
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(clientPortalUrl);
                    toast({ title: "Copied!", description: "Client portal link copied to clipboard" });
                  }}
                >
                  Copy Link
                </Button>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => window.open(clientPortalUrl, '_blank')}>
                  Preview Portal
                </Button>
                <Button size="sm" onClick={() => navigate("/estimates")}>
                  Back to Quotes
                </Button>
              </div>
            </div>
          )}
        </Form>
      </CardContent>
    </Card>
  );
}
