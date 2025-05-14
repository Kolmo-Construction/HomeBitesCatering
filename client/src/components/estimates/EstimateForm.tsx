import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { insertEstimateSchema } from "@shared/schema";
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
import { CalendarIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatDate, formatCurrency, calculateTax, calculateTotal } from "@/lib/utils";

// Extend the estimate schema with validation
const formSchema = insertEstimateSchema.extend({
  clientId: z.number().min(1, "Client is required"),
  eventType: z.string().min(1, "Event type is required"),
  guestCount: z.coerce.number().int().positive("Guest count must be positive").optional().nullable(),
  venue: z.string().optional(),
  eventDate: z.date().optional().nullable(),
  subtotal: z.coerce.number().int().min(0, "Subtotal must be positive"),
  tax: z.coerce.number().int().min(0, "Tax must be positive"),
  total: z.coerce.number().int().min(0, "Total must be positive"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EstimateFormProps {
  estimate?: any;
  isEditing?: boolean;
}

interface CustomItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export default function EstimateForm({ estimate, isEditing = false }: EstimateFormProps) {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for menu items and client portal URL
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(estimate?.menuId || null);
  const [customItems, setCustomItems] = useState<CustomItem[]>(
    estimate?.items ? JSON.parse(estimate.items) : []
  );
  const [clientPortalUrl, setClientPortalUrl] = useState<string>("");
  const [showPortalLink, setShowPortalLink] = useState<boolean>(false);
  
  // Get clients for dropdown
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/clients"],
  });
  
  // Get menus for dropdown
  const { data: menus = [], isLoading: isLoadingMenus } = useQuery({
    queryKey: ["/api/menus"],
  });
  
  // Get menu details if a menu is selected
  const { data: selectedMenu, isLoading: isLoadingSelectedMenu } = useQuery({
    queryKey: ["/api/menus", selectedMenuId],
    enabled: !!selectedMenuId,
  });
  
  // State for price calculations
  const [subtotal, setSubtotal] = useState(estimate?.subtotal || 0);
  const [tax, setTax] = useState(estimate?.tax || 0);
  const [total, setTotal] = useState(estimate?.total || 0);
  
  // Set up form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: estimate || {
      clientId: undefined,
      eventType: "",
      guestCount: null,
      venue: "",
      eventDate: null,
      menuId: null,
      items: null,
      additionalServices: null,
      subtotal: 0,
      tax: 0,
      total: 0,
      notes: "",
      status: "draft",
    },
  });
  
  // Set up field array for custom items
  const { append, remove } = useFieldArray({
    control: form.control,
    name: "items" as never, // TypeScript hack due to complex model
  });
  
  // Handle price calculations
  useEffect(() => {
    // Calculate subtotal based on menu and custom items
    let estimateSubtotal = 0;
    
    // Add menu price if selected
    if (selectedMenu) {
      const menuPrice = Array.isArray(selectedMenu.items) 
        ? selectedMenu.items.reduce((acc: number, item: any) => {
            if (!item) return acc;
            const menuItem = item.menuItem || item;
            const price = menuItem?.price || 0;
            const quantity = item.quantity || 1;
            return acc + (price * quantity);
          }, 0)
        : 0;
      
      const guestCount = form.getValues("guestCount") || 1;
      estimateSubtotal = menuPrice * guestCount;
    }
    
    // Add custom items
    customItems.forEach(item => {
      estimateSubtotal += item.price * item.quantity;
    });
    
    // Calculate tax and total
    const estimateTax = calculateTax(estimateSubtotal);
    const estimateTotal = calculateTotal(estimateSubtotal, estimateTax);
    
    setSubtotal(estimateSubtotal);
    setTax(Math.round(estimateTax));
    setTotal(Math.round(estimateTotal));
    
    // Update form values
    form.setValue("subtotal", estimateSubtotal);
    form.setValue("tax", Math.round(estimateTax));
    form.setValue("total", Math.round(estimateTotal));
  }, [selectedMenu, customItems, form.watch("guestCount")]);
  
  // Mutation for creating/updating estimate
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Prepare items JSON
      const itemsJson = JSON.stringify(customItems);
      
      const payload = {
        ...values,
        items: itemsJson,
        menuId: selectedMenuId === null ? null : selectedMenuId,
        createdBy: 1, // In production, this would be the current user ID
        status: isEditing ? values.status : "draft",
      };
      
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
      
      // Check if estimate is sent and a client portal URL was generated
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
        navigate("/estimates");
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} estimate: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Handle custom item management
  const handleAddCustomItem = () => {
    const newItem: CustomItem = {
      id: Date.now().toString(),
      name: "",
      quantity: 1,
      price: 0
    };
    setCustomItems([...customItems, newItem]);
  };
  
  const handleRemoveCustomItem = (id: string) => {
    setCustomItems(customItems.filter(item => item.id !== id));
  };
  
  const handleCustomItemChange = (id: string, field: keyof CustomItem, value: any) => {
    setCustomItems(customItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };
  
  // Handle form submission
  const onSubmit = (values: FormValues) => {
    // Make sure financial values are included
    const estimateSubtotal = subtotal || 0;
    const estimateTax = tax || 0;
    const estimateTotal = total || 0;
    
    mutation.mutate({
      ...values,
      subtotal: estimateSubtotal,
      tax: estimateTax,
      total: estimateTotal
    });
  };
  
  // Handle sending estimate
  const handleSendEstimate = () => {
    const values = form.getValues();
    
    // Make sure we have the required financial values
    const estimateSubtotal = subtotal || 0;
    const estimateTax = tax || 0;
    const estimateTotal = total || 0;
    
    // Update status to 'sent'
    form.setValue("status", "sent");
    form.setValue("sentAt", new Date());
    form.setValue("subtotal", estimateSubtotal);
    form.setValue("tax", estimateTax);
    form.setValue("total", estimateTotal);
    
    // Submit the form with all required fields
    mutation.mutate({
      ...values,
      status: "sent",
      sentAt: new Date(),
      subtotal: estimateSubtotal,
      tax: estimateTax, 
      total: estimateTotal
    });
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Quote" : "Create New Quote"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value, 10))} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                      defaultValue={field.value}
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
                        value={field.value === null ? "" : field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location/Venue</FormLabel>
                  <FormControl>
                    <Input placeholder="Event location or venue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Menu Selection</FormLabel>
              <Select 
                onValueChange={(value) => {
                  if (value === "none") {
                    setSelectedMenuId(null);
                  } else {
                    setSelectedMenuId(parseInt(value, 10));
                  }
                }} 
                defaultValue={selectedMenuId?.toString() || "none"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a menu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Menu (Custom Items Only)</SelectItem>
                  {menus.map((menu: any) => (
                    <SelectItem key={menu.id} value={menu.id.toString()}>
                      {menu.name} - {formatCurrency(
                        Array.isArray(menu.items) 
                          ? menu.items.reduce((acc: number, item: any) => acc + (item?.price || 0), 0) / 100
                          : 0
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
                    {Array.isArray(selectedMenu.items) && selectedMenu.items.map((item: any, index: number) => (
                      <li key={index} className="text-sm">
                        {item.quantity || 1}x {item.name || item.menuItem?.name || 'Menu Item'} - {formatCurrency(((item.price || item.menuItem?.price) || 0) / 100)}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 text-sm font-medium">
                    Per Person: {formatCurrency(
                      Array.isArray(selectedMenu.items) 
                        ? selectedMenu.items.reduce((acc: number, item: any) => {
                            const price = item?.price || item?.menuItem?.price || 0;
                            const quantity = item?.quantity || 1;
                            return acc + (price * quantity);
                          }, 0) / 100
                        : 0
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <FormLabel>Custom Items</FormLabel>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddCustomItem}
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              
              {customItems.length === 0 ? (
                <div className="border border-dashed rounded-md p-4 text-center text-gray-500">
                  No custom items added yet. Click "Add Item" to add custom items.
                </div>
              ) : (
                <div className="space-y-2">
                  {customItems.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 border rounded-md p-3">
                      <div className="flex-1">
                        <Input
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => handleCustomItemChange(item.id, "name", e.target.value)}
                          className="mb-1"
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          min={1}
                          onChange={(e) => handleCustomItemChange(item.id, "quantity", parseInt(e.target.value, 10))}
                        />
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          placeholder="Price"
                          value={item.price / 100}
                          step="0.01"
                          min={0}
                          onChange={(e) => handleCustomItemChange(item.id, "price", parseFloat(e.target.value) * 100)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCustomItem(item.id)}
                      >
                        <Trash2Icon className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
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
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes for the estimate"
                      className="resize-none" 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
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

            <CardFooter className="px-0 pt-4 flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/estimates")}
              >
                Cancel
              </Button>
              
              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  variant="outline"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Saving..." : (isEditing ? "Update Draft" : "Save as Draft")}
                </Button>
                
                {isEditing && form.watch("status") === "draft" && (
                  <Button 
                    type="button" 
                    className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90"
                    onClick={handleSendEstimate}
                    disabled={mutation.isPending}
                  >
                    Send to Client
                  </Button>
                )}
                
                {!isEditing && (
                  <Button 
                    type="button" 
                    className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90"
                    onClick={handleSendEstimate}
                    disabled={mutation.isPending}
                  >
                    Save & Send
                  </Button>
                )}
              </div>
            </CardFooter>
          </form>
          
          {/* Client Portal Link Section - Shown when quote is sent */}
          {showPortalLink && clientPortalUrl && (
            <div className="mt-8 p-4 border border-green-200 bg-green-50 rounded-md">
              <h3 className="text-lg font-semibold text-green-700 mb-2">
                Client Portal Created
              </h3>
              <p className="text-sm text-green-600 mb-4">
                A client portal has been created for this quote. Share this link with your client:
              </p>
              
              <div className="flex items-center space-x-2 mb-4">
                <input 
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
                    toast({
                      title: "Copied!",
                      description: "Client portal link copied to clipboard",
                    });
                  }}
                >
                  Copy Link
                </Button>
              </div>
              
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(clientPortalUrl, '_blank');
                  }}
                >
                  Preview Portal
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    navigate("/estimates");
                  }}
                >
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
