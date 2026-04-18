import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CheckIcon, XIcon, CalendarIcon, MapPinIcon, UsersIcon, FileTextIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Helmet } from "react-helmet";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BadgeStatus from "@/components/ui/badge-status";

export default function ClientPortal() {
  const { token } = useParams();
  const { toast } = useToast();
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  
  // Decode token to get client and quote info
  // For demo purposes, we'll just extract the quote ID from the token
  // In a real app, this would involve JWT verification
  const quoteId = parseInt(token || "0", 10);
  
  // Fetch quote data
  const { data: quote, isLoading } = useQuery({
    queryKey: ["/api/quotes", quoteId],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(`/api/quotes/${queryKey[1]}?client=true`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch quote');
      return res.json();
    },
  });
  
  // Fetch client data
  const { data: client } = useQuery({
    queryKey: ["/api/clients", quote?.clientId],
    enabled: !!quote?.clientId,
  });
  
  // Fetch menu data
  const { data: menu } = useQuery<any>({
    queryKey: ["/api/menus", quote?.menuId],
    enabled: !!quote?.menuId,
  });
  
  // Accept quote mutation
  const acceptQuote = async () => {
    try {
      await apiRequest("POST", `/api/quotes/${quoteId}/accept`);
      toast({
        title: "Quote Accepted",
        description: "Thank you for accepting our quote. We'll be in touch soon to finalize details.",
      });
      setIsAcceptDialogOpen(false);
      // Refetch quote to update UI
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to accept quote. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Decline quote mutation
  const declineQuote = async () => {
    try {
      await apiRequest("POST", `/api/quotes/${quoteId}/decline`);
      toast({
        title: "Quote Declined",
        description: "We're sorry to hear you've declined our quote. Please contact us if you have any questions.",
      });
      setIsDeclineDialogOpen(false);
      // Refetch quote to update UI
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to decline quote. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your quote...</p>
        </div>
      </div>
    );
  }
  
  if (!quote || !quoteId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <XIcon className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Quote Not Found</h2>
          <p className="text-gray-600 mb-4">
            The quote you're looking for doesn't exist or has expired. Please contact Home Bites for assistance.
          </p>
          <a 
            href="https://www.homebites.net/contact"
            className="inline-block px-4 py-2 rounded-md bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] text-white"
          >
            Contact Us
          </a>
        </div>
      </div>
    );
  }
  
  // Parse custom items if any
  const customItems = quote.items ? JSON.parse(quote.items) : [];
  
  // Get menu items if available
  const menuItems = menu?.items || [];
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Home Bites Catering - Your Quote</title>
        <meta name="description" content="View and respond to your catering quote from Home Bites" />
      </Helmet>
      
      <header className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <img 
            src="https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&h=50" 
            alt="Home Bites Logo" 
            className="h-10 w-10 rounded-full mr-3"
          />
          <div>
            <h1 className="font-poppins font-semibold text-lg md:text-xl">Home Bites Catering</h1>
            <p className="text-xs md:text-sm">Client Portal</p>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Your Quote</h2>
              <p className="text-sm text-gray-500">Created on {formatDate(new Date(quote.createdAt))}</p>
            </div>
            <BadgeStatus status={quote.status} />
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Event Date</p>
                  <p className="font-medium">
                    {quote.eventDate 
                      ? formatDate(new Date(quote.eventDate)) 
                      : "To be determined"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <UsersIcon className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Guest Count</p>
                  <p className="font-medium">{quote.guestCount || "—"}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{quote.venue || "To be determined"}</p>
                </div>
              </div>
            </div>
            
            <Tabs defaultValue="menu" className="mt-6">
              <TabsList className="mb-4">
                <TabsTrigger value="menu">
                  <FileTextIcon className="h-4 w-4 mr-2" />
                  Menu & Pricing
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="menu" className="space-y-6">
                {menu && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">{menu.name} Menu</h3>
                    <p className="text-sm text-gray-600 mb-4">{menu.description}</p>
                    
                    <div className="bg-gray-50 rounded-md p-4 mb-6">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {menuItems.map((item: any, index: number) => {
                            const menuItem = item.menuItem || item;
                            const quantity = item.quantity || 1;
                            const price = menuItem.price || 0;
                            
                            return (
                              <tr key={index} className="border-b border-gray-200">
                                <td className="py-3 px-3">
                                  <div className="font-medium">{menuItem.name}</div>
                                  {menuItem.description && (
                                    <div className="text-sm text-gray-500">{menuItem.description}</div>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">{quantity}</td>
                                <td className="py-3 px-3 text-right">
                                  {formatCurrency(price / 100)}
                                </td>
                              </tr>
                            );
                          })}
                          <tr>
                            <td colSpan={2} className="py-3 px-3 text-right font-medium">
                              Menu Total (per person):
                            </td>
                            <td className="py-3 px-3 text-right font-medium">
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
                    <h3 className="text-lg font-medium mb-2">Additional Items & Services</h3>
                    
                    <div className="bg-gray-50 rounded-md p-4 mb-4">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customItems.map((item: any, index: number) => (
                            <tr key={index} className="border-b border-gray-200">
                              <td className="py-3 px-3">{item.name}</td>
                              <td className="py-3 px-3 text-right">{item.quantity}</td>
                              <td className="py-3 px-3 text-right">
                                {formatCurrency(item.price / 100)}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {formatCurrency((item.price * item.quantity) / 100)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Subtotal:</span>
                    <span>{formatCurrency(quote.subtotal / 100)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Tax (9.5%):</span>
                    <span>{formatCurrency(quote.tax / 100)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(quote.total / 100)}</span>
                  </div>
                </div>
                
                {quote.notes && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-2">Notes</h3>
                    <div className="bg-gray-50 p-4 rounded-md text-gray-700 whitespace-pre-wrap">
                      {quote.notes}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {quote.status === "sent" && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Your Response</h3>
              <p className="text-gray-600 mb-6">
                Please review this quote and let us know if you would like to proceed. If you have any questions or would like to discuss modifications, please contact us directly.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="outline"
                  className="border-red-500 text-red-500 hover:bg-red-50"
                  onClick={() => setIsDeclineDialogOpen(true)}
                >
                  <XIcon className="mr-2 h-4 w-4" />
                  Decline Quote
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setIsAcceptDialogOpen(true)}
                >
                  <CheckIcon className="mr-2 h-4 w-4" />
                  Accept Quote
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {quote.status === "accepted" && (
          <div className="bg-green-50 border border-green-200 rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="bg-green-100 rounded-full p-2">
                  <CheckIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-green-800 mb-2">Quote Accepted</h3>
                  <p className="text-green-700">
                    Thank you for accepting our quote! Our team will be in touch with you shortly to discuss next steps and finalize the details for your event.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {quote.status === "declined" && (
          <div className="bg-red-50 border border-red-200 rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="bg-red-100 rounded-full p-2">
                  <XIcon className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-red-800 mb-2">Quote Declined</h3>
                  <p className="text-red-700">
                    You have declined this quote. If you'd like to request changes or discuss other options, please contact us.
                  </p>
                  <a 
                    href="mailto:info@homebites.net"
                    className="inline-block mt-3 text-red-700 hover:text-red-800 underline"
                  >
                    Contact Us
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <footer className="bg-gray-100 border-t">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>
            Thank you for considering Home Bites Catering for your event.
          </p>
          <p className="mt-2">
            Questions? Contact us at <a href="mailto:info@homebites.net" className="text-primary-purple hover:underline">info@homebites.net</a> or call (206) 555-1234
          </p>
          <p className="mt-4">
            <a href="https://www.homebites.net" className="text-primary-purple hover:underline">www.homebites.net</a>
          </p>
        </div>
      </footer>
      
      {/* Accept Dialog */}
      <AlertDialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Quote</AlertDialogTitle>
            <AlertDialogDescription>
              By accepting this quote, you agree to the services and prices listed. 
              We'll contact you to finalize the details and schedule your event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={acceptQuote}
              className="bg-green-600 hover:bg-green-700"
            >
              Accept Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Decline Dialog */}
      <AlertDialog open={isDeclineDialogOpen} onOpenChange={setIsDeclineDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to decline this quote? 
              If you'd like to request changes instead, please contact us directly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={declineQuote}
              className="bg-red-500 hover:bg-red-600"
            >
              Decline Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
