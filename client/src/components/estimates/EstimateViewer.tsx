import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import BadgeStatus from "@/components/ui/badge-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckIcon, 
  XIcon, 
  PrinterIcon, 
  ArrowLeftIcon, 
  SendIcon, 
  DownloadIcon, 
  CalendarIcon, 
  MapPinIcon, 
  UsersIcon
} from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EstimateViewerProps {
  id: number;
  isClient?: boolean;
}

export default function EstimateViewer({ id, isClient = false }: EstimateViewerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  
  // Get estimate data
  const { data: estimate, isLoading, isError } = useQuery({
    queryKey: ["/api/estimates", id],
    refetchInterval: false,
    refetchOnMount: true,
    staleTime: 0,
    onSuccess: (data) => {
      console.log("EstimateViewer loaded data:", data);
    },
    onError: (error) => {
      console.error("EstimateViewer error:", error);
      toast({
        title: "Error",
        description: "Failed to load quote data. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Get client data
  const { data: client } = useQuery({
    queryKey: ["/api/clients", estimate?.clientId],
    enabled: !!estimate?.clientId,
  });
  
  // Get menu data
  const { data: menu } = useQuery({
    queryKey: ["/api/menus", estimate?.menuId],
    enabled: !!estimate?.menuId,
  });
  
  // Show loading or error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple"></div>
      </div>
    );
  }
  
  if (isError || !estimate) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Quote</h2>
        <p className="text-gray-600 mb-6">There was an error loading the quote data. Please try again.</p>
        <Link to="/estimates">
          <Button variant="outline">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Quotes
          </Button>
        </Link>
      </div>
    );
  }
  
  // Accept estimate mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/estimates/${id}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", id] });
      toast({
        title: "Estimate accepted",
        description: "The estimate has been accepted successfully."
      });
      setIsAcceptDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to accept estimate: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Decline estimate mutation
  const declineMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/estimates/${id}/decline`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", id] });
      toast({
        title: "Estimate declined",
        description: "The estimate has been declined."
      });
      setIsDeclineDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to decline estimate: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Send estimate mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/estimates/${id}`, {
        status: "sent",
        sentAt: new Date()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", id] });
      toast({
        title: "Estimate sent",
        description: "The estimate has been sent to the client."
      });
      setIsSendDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send estimate: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple mx-auto"></div>
          <p className="mt-2">Loading estimate...</p>
        </div>
      </div>
    );
  }
  
  if (!estimate) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Estimate Not Found</h2>
        <p className="text-gray-600 mb-4">The estimate you're looking for doesn't exist or has been deleted.</p>
        <Link href="/estimates">
          <Button>
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Estimates
          </Button>
        </Link>
      </div>
    );
  }
  
  // Parse custom items if any
  const customItems = estimate.items ? JSON.parse(estimate.items) : [];
  
  // Get menu items if available
  const menuItems = menu?.items || [];

  // Format status for display
  const getStatusInfo = (status: string) => {
    const statusInfo = {
      draft: { label: "Draft", message: "This estimate is in draft mode and has not been sent to the client." },
      sent: { label: "Sent", message: "This estimate has been sent to the client." },
      viewed: { label: "Viewed", message: "The client has viewed this estimate." },
      accepted: { label: "Accepted", message: "The client has accepted this estimate." },
      declined: { label: "Declined", message: "The client has declined this estimate." }
    };
    
    return statusInfo[status as keyof typeof statusInfo] || { label: status, message: "" };
  };
  
  const statusInfo = getStatusInfo(estimate.status);
  
  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Link href="/estimates">
          <Button variant="outline">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Estimates
          </Button>
        </Link>
        
        <div className="flex items-center gap-2">
          {!isClient && estimate.status === "draft" && (
            <Button 
              variant="outline" 
              className="text-green-600 border-green-600 hover:bg-green-50"
              onClick={() => setIsSendDialogOpen(true)}
            >
              <SendIcon className="mr-2 h-4 w-4" />
              Send to Client
            </Button>
          )}
          
          <Button 
            variant="outline"
            onClick={handlePrint}
          >
            <PrinterIcon className="mr-2 h-4 w-4" />
            Print
          </Button>
          
          <Button variant="outline">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>
      
      <Card className="mb-6 shadow-lg print:shadow-none">
        <CardHeader className="pb-4 border-b">
          <div className="flex justify-between items-start">
            <div>
              <div className="mb-2">
                <img 
                  src="https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100" 
                  alt="Home Bites Logo" 
                  className="h-12 rounded-full print:filter print:grayscale"
                />
              </div>
              <CardTitle className="text-2xl">Estimate #{estimate.id}</CardTitle>
            </div>
            
            <div className="text-right">
              <div className="flex items-center justify-end mb-2">
                <BadgeStatus status={estimate.status} />
              </div>
              <p className="text-sm text-gray-500">
                Created: {formatDate(new Date(estimate.createdAt))}
              </p>
              {estimate.sentAt && (
                <p className="text-sm text-gray-500">
                  Sent: {formatDate(new Date(estimate.sentAt))}
                </p>
              )}
              {estimate.viewedAt && (
                <p className="text-sm text-gray-500">
                  Viewed: {formatDate(new Date(estimate.viewedAt))}
                </p>
              )}
              {estimate.acceptedAt && (
                <p className="text-sm text-green-600">
                  Accepted: {formatDate(new Date(estimate.acceptedAt))}
                </p>
              )}
              {estimate.declinedAt && (
                <p className="text-sm text-red-600">
                  Declined: {formatDate(new Date(estimate.declinedAt))}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">FROM</h3>
              <p className="font-medium">Home Bites Catering</p>
              <p>123 Main Street</p>
              <p>Seattle, WA 98101</p>
              <p>info@homebites.net</p>
              <p>(206) 555-1234</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">TO</h3>
              {client ? (
                <>
                  <p className="font-medium">{client.firstName} {client.lastName}</p>
                  <p>{client.email}</p>
                  <p>{client.phone}</p>
                  {client.company && <p>{client.company}</p>}
                  {client.address && (
                    <p>
                      {client.address}, {client.city}, {client.state} {client.zip}
                    </p>
                  )}
                </>
              ) : (
                <p>Client information not available</p>
              )}
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Event Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">
                    {estimate.eventDate 
                      ? formatDate(new Date(estimate.eventDate)) 
                      : "To be determined"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <UsersIcon className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Guests</p>
                  <p className="font-medium">{estimate.guestCount || "—"}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{estimate.venue || "To be determined"}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Menu & Services</h3>
            
            {menu && (
              <div className="mb-6">
                <h4 className="text-md font-medium mb-2">{menu.name} Menu</h4>
                <p className="text-sm mb-3">{menu.description}</p>
                
                <div className="bg-gray-50 rounded-md p-4 mb-4">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 text-sm font-medium text-gray-500">Item</th>
                        <th className="text-right py-2 px-2 text-sm font-medium text-gray-500">Qty</th>
                        <th className="text-right py-2 px-2 text-sm font-medium text-gray-500">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menuItems.map((item: any, index: number) => {
                        const menuItem = item.menuItem || item;
                        const quantity = item.quantity || 1;
                        const price = menuItem.price || 0;
                        
                        return (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="py-2 px-2">
                              <div className="font-medium">{menuItem.name}</div>
                              {menuItem.description && (
                                <div className="text-sm text-gray-500">{menuItem.description}</div>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right">{quantity}</td>
                            <td className="py-2 px-2 text-right">
                              {formatCurrency(price / 100)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td colSpan={2} className="py-2 px-2 text-right font-medium">
                          Menu Total (per person):
                        </td>
                        <td className="py-2 px-2 text-right font-medium">
                          {formatCurrency(
                            menuItems.reduce((total: number, item: any) => {
                              const menuItem = item.menuItem || item;
                              const quantity = item.quantity || 1;
                              const price = menuItem.price || 0;
                              return total + (price * quantity);
                            }, 0) / 100
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {customItems.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-2">Additional Items & Services</h4>
                
                <div className="bg-gray-50 rounded-md p-4 mb-4">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 text-sm font-medium text-gray-500">Item</th>
                        <th className="text-right py-2 px-2 text-sm font-medium text-gray-500">Qty</th>
                        <th className="text-right py-2 px-2 text-sm font-medium text-gray-500">Price</th>
                        <th className="text-right py-2 px-2 text-sm font-medium text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customItems.map((item: any, index: number) => (
                        <tr key={index} className="border-b border-gray-200">
                          <td className="py-2 px-2">{item.name}</td>
                          <td className="py-2 px-2 text-right">{item.quantity}</td>
                          <td className="py-2 px-2 text-right">
                            {formatCurrency(item.price / 100)}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {formatCurrency((item.price * item.quantity) / 100)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="border-t border-gray-200 pt-4 mt-6">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Subtotal:</span>
                <span>{formatCurrency(estimate.subtotal / 100)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="font-medium">Tax (9.5%):</span>
                <span>{formatCurrency(estimate.tax / 100)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{formatCurrency(estimate.total / 100)}</span>
              </div>
            </div>
          </div>
          
          {estimate.notes && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Notes</h3>
              <div className="bg-gray-50 p-4 rounded-md whitespace-pre-wrap">
                {estimate.notes}
              </div>
            </div>
          )}
          
          <div className="border-t border-gray-200 pt-4 text-center text-sm text-gray-500">
            <p>This estimate is valid for 30 days from the date of creation.</p>
            <p>Questions? Contact us at info@homebites.net or (206) 555-1234</p>
          </div>
        </CardContent>
        
        {isClient && estimate.status === "sent" && (
          <CardFooter className="border-t">
            <div className="w-full flex justify-center space-x-4">
              <Button 
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-50"
                onClick={() => setIsDeclineDialogOpen(true)}
              >
                <XIcon className="mr-2 h-4 w-4" />
                Decline Estimate
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setIsAcceptDialogOpen(true)}
              >
                <CheckIcon className="mr-2 h-4 w-4" />
                Accept Estimate
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
      
      {/* Accept Dialog */}
      <AlertDialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Estimate</AlertDialogTitle>
            <AlertDialogDescription>
              By accepting this estimate, you agree to the services and prices listed. 
              We'll contact you to finalize the details and schedule your event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => acceptMutation.mutate()}
              className="bg-green-600 hover:bg-green-700"
            >
              {acceptMutation.isPending ? "Processing..." : "Accept Estimate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Decline Dialog */}
      <AlertDialog open={isDeclineDialogOpen} onOpenChange={setIsDeclineDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Estimate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to decline this estimate? 
              If you'd like to request changes instead, please contact us directly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => declineMutation.mutate()}
              className="bg-red-500 hover:bg-red-600"
            >
              {declineMutation.isPending ? "Processing..." : "Decline Estimate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Send Dialog */}
      <AlertDialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Estimate to Client</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the estimate to the client and mark it as "Sent". 
              The client will receive an email with a link to view the estimate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => sendMutation.mutate()}
              className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1]"
            >
              {sendMutation.isPending ? "Sending..." : "Send Estimate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
