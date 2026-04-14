import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import BadgeStatus from "@/components/ui/badge-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCanViewFinancials } from "@/hooks/usePermissions";
import homebitesLogo from "@assets/homebites-logo.avif";
import {
  CheckIcon,
  XIcon,
  PrinterIcon,
  ArrowLeftIcon,
  SendIcon,
  DownloadIcon,
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  FileTextIcon,
  CopyIcon,
  MailIcon,
  LinkIcon,
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
import { Helmet } from "react-helmet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Estimate as EstimateType } from "@shared/schema";

interface EstimateViewerProps {
  id: number;
  isClient?: boolean;
}

interface CustomItem {
  id: string;
  name: string;
  quantity: number;
  price: number; 
}

// Define a simple client type for clarity, adjust if you have a more specific one
interface ClientType {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  // Add other client properties as needed
}


export default function EstimateViewer({ id, isClient = false }: EstimateViewerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canViewFinancials = useCanViewFinancials();
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [sentPublicUrl, setSentPublicUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [sentEmailAuto, setSentEmailAuto] = useState<boolean>(false);
  const [sentEmailRecipient, setSentEmailRecipient] = useState<string | null>(null);

  const { data: estimate, isLoading, isError, error } = useQuery<EstimateType, Error>({
    queryKey: ["/api/estimates", id, isClient], // Added isClient to queryKey to differentiate cache if needed
    queryFn: async ({ queryKey }) => {
      const currentId = queryKey[1];
      const clientViewing = queryKey[2];
      const url = `/api/estimates/${currentId}${clientViewing ? '?client=true' : ''}`;
      console.log(`EstimateViewer: Fetching estimate from ${url}`);
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `HTTP error! status: ${res.status}` }));
        console.error("EstimateViewer: API error response:", errorData);
        throw new Error(errorData.message || `Failed to fetch estimate ${currentId}`);
      }
      const jsonData = await res.json();
      console.log(`EstimateViewer: Successfully fetched estimate ${currentId}:`, jsonData);
      return jsonData;
    },
    enabled: !!id,
    refetchInterval: false,
    refetchOnMount: true,
    staleTime: 0,
  });

  const { data: client } = useQuery<ClientType>({
    queryKey: ["/api/clients", estimate?.clientId],
    queryFn: async ({ queryKey }) => {
        if (!queryKey[1]) return null;
        const res = await fetch(`/api/clients/${queryKey[1]}`, {credentials: 'include'});
        if (!res.ok) throw new Error('Failed to fetch client details');
        return res.json();
    },
    enabled: !!estimate?.clientId,
  });

  const { data: menu } = useQuery<any>({ 
    queryKey: ["/api/menus", estimate?.menuId],
     queryFn: async ({ queryKey }) => {
        if (!queryKey[1]) return null;
        const res = await fetch(`/api/menus/${queryKey[1]}`, {credentials: 'include'});
        if (!res.ok) throw new Error('Failed to fetch menu details');
        return res.json();
    },
    enabled: !!estimate?.menuId,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/estimates/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", id, isClient] });
      toast({ title: "Estimate accepted", description: "The estimate has been accepted successfully." });
      setIsAcceptDialogOpen(false);
    },
    onError: (err: Error) => toast({ title: "Error", description: `Failed to accept estimate: ${err.message}`, variant: "destructive" }),
  });

  const declineMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/estimates/${id}/decline`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", id, isClient] });
      toast({ title: "Estimate declined", description: "The estimate has been declined." });
      setIsDeclineDialogOpen(false);
    },
    onError: (err: Error) => toast({ title: "Error", description: `Failed to decline estimate: ${err.message}`, variant: "destructive" }),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/estimates/${id}/send`);
      return res.json() as Promise<{
        estimate: EstimateType;
        publicUrl: string;
        emailSent: boolean;
        emailSkipped: boolean;
        emailRecipient: string | null;
      }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", id, isClient] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      setSentPublicUrl(data.publicUrl);
      setSentEmailAuto(data.emailSent === true);
      setSentEmailRecipient(data.emailRecipient ?? null);
      setLinkCopied(false);
      if (data.emailSent) {
        toast({
          title: "Email sent",
          description: `Quote sent to ${data.emailRecipient}.`,
        });
      } else {
        toast({
          title: "Quote ready to send",
          description:
            "Copy the link or open an email draft to send it to the customer.",
        });
      }
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: `Failed to send estimate: ${err.message}`, variant: "destructive" }),
  });

  const handleCopyLink = async () => {
    if (!sentPublicUrl) return;
    try {
      await navigator.clipboard.writeText(sentPublicUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy", description: "Select and copy manually.", variant: "destructive" });
    }
  };

  const handleOpenEmailDraft = () => {
    if (!sentPublicUrl || !client?.email) return;
    const subject = encodeURIComponent(`Your Homebites catering quote`);
    const body = encodeURIComponent(
      `Hi ${client.firstName || ""},\n\n` +
        `Thanks for reaching out to Homebites! Your quote is ready. You can review it and accept or decline here:\n\n` +
        `${sentPublicUrl}\n\n` +
        `Let us know if you have any questions.\n\n` +
        `— Homebites Catering`
    );
    window.location.href = `mailto:${client.email}?subject=${subject}&body=${body}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your estimate...</p>
        </div>
      </div>
    );
  }

  if (isError || !estimate) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <Helmet>
          <title>Error Loading Estimate</title>
        </Helmet>
        <div className="text-center max-w-md">
           <div className="text-red-500 mb-4">
            <XIcon className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Quote</h2>
          <p className="text-gray-600 mb-4">
            {error?.message || "There was an error loading the quote data. Please try again or contact support."}
          </p>
          <Link href={isClient ? "/" : "/estimates"}>
            <Button variant="outline">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              {isClient ? "Back to Home" : "Back to Quotes"}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  let customItems: CustomItem[] = [];
  if (estimate.items) {
    if (typeof estimate.items === 'string') {
      try {
        if (estimate.items.trim() === "") {
          customItems = [];
        } else {
          const parsed = JSON.parse(estimate.items);
          customItems = Array.isArray(parsed) ? parsed.map((item: any) => ({...item, price: Number(item.price) || 0, quantity: Number(item.quantity) || 1 })) : [];
        }
      } catch (e) {
        console.error("EstimateViewer: Error parsing estimate.items JSON string:", e, "Value was:", estimate.items);
        customItems = [];
      }
    } else if (Array.isArray(estimate.items)) {
      console.log("EstimateViewer: estimate.items is already an array:", estimate.items);
      customItems = estimate.items.map((item: any) => ({...item, price: Number(item.price) || 0, quantity: Number(item.quantity) || 1 }));
    } else {
      console.warn("EstimateViewer: estimate.items was neither a string nor an array:", estimate.items);
    }
  }

  const menuItemsToDisplay = menu?.items?.map((itemDetail: any) => {
      const actualItem = itemDetail.menuItem || itemDetail;
      return {
          ...actualItem,
          quantity: itemDetail.quantity || 1,
          price: Number(actualItem.price) || 0,
      };
  }) || [];

  const handlePrint = () => {
    window.print();
  };

  // Construct title string safely
  const pageTitle = `Estimate #${estimate.id} - ${client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() : "Home Bites Catering"}`;

  return (
    <div className={`max-w-4xl mx-auto ${isClient ? 'py-8' : ''}`}>
      <Helmet>
        {/* Corrected: Ensure title content is a single string expression */}
        <title>{pageTitle}</title>
        <meta name="description" content={`Details for estimate #${estimate.id}`} />
      </Helmet>

      {!isClient && (
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Link href="/estimates">
            <Button variant="outline">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Quotes
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            {estimate.status !== "accepted" && estimate.status !== "declined" && (
              <Button
                variant="outline"
                className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                onClick={() => setIsSendDialogOpen(true)}
                disabled={sendMutation.isPending}
              >
                <SendIcon className="mr-2 h-4 w-4" />
                {sendMutation.isPending
                  ? "Preparing..."
                  : estimate.status === "draft"
                  ? "Send Quote"
                  : "Resend / Copy Link"}
              </Button>
            )}
            {estimate.status !== "accepted" && estimate.status !== "declined" && (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setIsAcceptDialogOpen(true)}
                disabled={acceptMutation.isPending}
              >
                <CheckIcon className="mr-2 h-4 w-4" />
                Mark Accepted
              </Button>
            )}
            <Button variant="outline" onClick={handlePrint}>
              <PrinterIcon className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline">
              <DownloadIcon className="mr-2 h-4 w-4" /> Download PDF
            </Button>
          </div>
        </div>
      )}

      <Card className="mb-6 shadow-lg print:shadow-none print:border-none">
        <CardHeader className="pb-4 border-b print:border-gray-300">
          <div className="flex flex-col sm:flex-row justify-between items-start">
            <div className="mb-4 sm:mb-0">
              <div className="mb-2">
                <img
                  src={homebitesLogo}
                  alt="Home Bites Catering"
                  className="h-16 w-auto print:h-14"
                />
              </div>
              <CardTitle className="text-2xl print:text-xl">Estimate #{estimate.id}</CardTitle>
              <p className="text-sm text-gray-500 print:text-xs">
                Created: {formatDate(new Date(estimate.createdAt))}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="flex items-center justify-start sm:justify-end mb-2">
                <BadgeStatus status={estimate.status} />
              </div>
              {estimate.sentAt && <p className="text-sm text-gray-500 print:text-xs">Sent: {formatDate(new Date(estimate.sentAt))}</p>}
              {estimate.viewedAt && <p className="text-sm text-gray-500 print:text-xs">Viewed: {formatDate(new Date(estimate.viewedAt))}</p>}
              {estimate.expiresAt && <p className="text-sm text-gray-500 print:text-xs">Expires: {formatDate(new Date(estimate.expiresAt))}</p>}
              {estimate.acceptedAt && <p className="text-sm text-green-600 font-medium print:text-xs">Accepted: {formatDate(new Date(estimate.acceptedAt))}</p>}
              {estimate.declinedAt && <p className="text-sm text-red-600 font-medium print:text-xs">Declined: {formatDate(new Date(estimate.declinedAt))}</p>}
            </div>
          </div>
        </CardHeader>

        <CardContent className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider print:text-xs">From</h3>
              <p className="font-semibold">Home Bites Catering</p>
              <p className="text-sm">123 Main Street</p>
              <p className="text-sm">Seattle, WA 98101</p>
              <p className="text-sm">info@homebites.net</p>
              <p className="text-sm">(206) 555-1234</p>
            </div>

            <div className="md:text-right">
              <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider print:text-xs">To</h3>
              {client ? (
                <>
                  <p className="font-semibold">{client.firstName} {client.lastName}</p>
                  {client.company && <p className="text-sm">{client.company}</p>}
                  <p className="text-sm">{client.email}</p>
                  {client.phone && <p className="text-sm">{client.phone}</p>}
                  {client.address && <p className="text-sm">{client.address}</p>}
                  {(client.city || client.state || client.zip) && (
                    <p className="text-sm">
                      {client.city}{client.city && client.state ? ", " : ""}{client.state} {client.zip}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Client information loading or not available.</p>
              )}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 border-b pb-2 print:text-base">Event Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start">
                <CalendarIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Event Date</p>
                  <p className="font-medium">
                    {estimate.eventDate ? formatDate(new Date(estimate.eventDate)) : "To be determined"}
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <UsersIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Guest Count</p>
                  <p className="font-medium">{estimate.guestCount || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPinIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Location / Venue</p>
                  <p className="font-medium">{estimate.venue || "To be determined"}</p>
                  {estimate.zipCode && <p className="text-xs text-gray-500">Zip: {estimate.zipCode}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 border-b pb-2 print:text-base">Menu & Services</h3>

            {menu && menuItemsToDisplay.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-medium mb-1">{menu.name}</h4>
                {menu.description && <p className="text-sm text-gray-600 mb-3">{menu.description}</p>}

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 print:bg-gray-100">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-gray-600 uppercase tracking-wider">Item</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-600 uppercase tracking-wider">Qty</th>
                        {canViewFinancials && (
                          <>
                            <th className="text-right py-2 px-3 font-medium text-gray-600 uppercase tracking-wider">Price/Unit</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-600 uppercase tracking-wider">Line Total</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {menuItemsToDisplay.map((item: any, index: number) => (
                        <tr key={`menu-${index}`} className="border-b print:border-gray-300">
                          <td className="py-2 px-3">
                            <div className="font-medium">{item.name}</div>
                            {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                          </td>
                          <td className="py-2 px-3 text-center">{item.quantity}</td>
                          {canViewFinancials && (
                            <>
                              <td className="py-2 px-3 text-right">{formatCurrency(item.price / 100)}</td>
                              <td className="py-2 px-3 text-right">{formatCurrency((item.price * item.quantity) / 100)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {customItems.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-medium mb-2 mt-4">Additional Items & Services</h4>
                <div className="overflow-x-auto">
                   <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 print:bg-gray-100">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-gray-600 uppercase tracking-wider">Item</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-600 uppercase tracking-wider">Qty</th>
                        {canViewFinancials && (
                          <>
                            <th className="text-right py-2 px-3 font-medium text-gray-600 uppercase tracking-wider">Price/Unit</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-600 uppercase tracking-wider">Line Total</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {customItems.map((item: CustomItem, index: number) => (
                        <tr key={`custom-${item.id || index}`} className="border-b print:border-gray-300">
                          <td className="py-2 px-3">{item.name}</td>
                          <td className="py-2 px-3 text-center">{item.quantity}</td>
                          {canViewFinancials && (
                            <>
                              <td className="py-2 px-3 text-right">{formatCurrency(item.price / 100)}</td>
                              <td className="py-2 px-3 text-right">{formatCurrency((item.price * item.quantity) / 100)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(!menu || menuItemsToDisplay.length === 0) && customItems.length === 0 && (
                <p className="text-sm text-gray-500">No menu items or custom services listed for this estimate.</p>
            )}

            <div className="border-t border-gray-200 pt-4 mt-6 print:border-gray-300">
              {canViewFinancials ? (
                <div className="max-w-xs ml-auto text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Subtotal:</span>
                    <span>{formatCurrency(estimate.subtotal / 100)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Tax:</span>
                    <span>{formatCurrency(estimate.tax / 100)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-1 mt-1">
                    <span>Total:</span>
                    <span>{formatCurrency(estimate.total / 100)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500 py-4">
                  <p>Pricing information is only visible to administrators.</p>
                </div>
              )}
            </div>
          </div>

          {estimate.notes && (
            <div className="mb-6 px-6 pb-6">
              <h3 className="text-lg font-semibold mb-2 print:text-base">Notes</h3>
              <div className="bg-gray-50 p-4 rounded-md whitespace-pre-wrap text-sm print:bg-white print:border print:border-gray-200">
                {estimate.notes}
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4 px-6 pb-6 text-center text-xs text-gray-500 print:border-gray-300">
            <p>This estimate is valid for 30 days from the date of creation, unless otherwise stated.</p>
            <p>Questions? Contact us at info@homebites.net or (206) 555-1234</p>
          </div>
        </CardContent>

        {isClient && estimate.status === "sent" && (
          <CardFooter className="border-t p-6 print:hidden">
            <div className="w-full flex flex-col sm:flex-row justify-center items-center gap-4">
               <p className="text-sm text-gray-700 text-center sm:text-left mb-4 sm:mb-0 flex-grow">
                Please review this estimate. If you have questions or wish to modify, contact us directly.
              </p>
              <div className="flex gap-4">
                <Button 
                  variant="outline"
                  className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 w-full sm:w-auto"
                  onClick={() => setIsDeclineDialogOpen(true)}
                  disabled={declineMutation.isPending || acceptMutation.isPending}
                >
                  <XIcon className="mr-2 h-4 w-4" />
                  Decline Estimate
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                  onClick={() => setIsAcceptDialogOpen(true)}
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                >
                  <CheckIcon className="mr-2 h-4 w-4" />
                  Accept Estimate
                </Button>
              </div>
            </div>
          </CardFooter>
        )}
         {isClient && (estimate.status === "accepted" || estimate.status === "declined") && (
          <CardFooter className="border-t p-6 print:hidden">
            <div className="w-full text-center">
              {estimate.status === "accepted" && estimate.acceptedAt && (
                <p className="text-green-600 font-medium">You accepted this estimate on {formatDate(new Date(estimate.acceptedAt))}. We will be in touch shortly!</p>
              )}
              {estimate.status === "declined" && estimate.declinedAt && (
                <p className="text-red-600 font-medium">You declined this estimate on {formatDate(new Date(estimate.declinedAt))}. Please contact us if you have any questions.</p>
              )}
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Dialogs */}
      <AlertDialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Estimate?</AlertDialogTitle>
            <AlertDialogDescription>
              By accepting this estimate, you agree to the services and prices listed. 
              We'll contact you to finalize the details and schedule your event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acceptMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => acceptMutation.mutate()}
              className="bg-green-600 hover:bg-green-700"
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? "Processing..." : "Yes, Accept Estimate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeclineDialogOpen} onOpenChange={setIsDeclineDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Estimate?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to decline this estimate? 
              If you'd like to request changes instead, please contact us directly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={declineMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => declineMutation.mutate()}
              className="bg-red-500 hover:bg-red-600"
              disabled={declineMutation.isPending}
            >
              {declineMutation.isPending ? "Processing..." : "Yes, Decline Estimate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!isClient && (
        <AlertDialog
          open={isSendDialogOpen}
          onOpenChange={(open) => {
            setIsSendDialogOpen(open);
            if (!open) {
              setSentPublicUrl(null);
              setLinkCopied(false);
              setSentEmailAuto(false);
              setSentEmailRecipient(null);
            }
          }}
        >
          <AlertDialogContent>
            {!sentPublicUrl ? (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Send Quote to {client?.firstName ?? "customer"}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This generates a private link to a customer-facing page where{" "}
                    {client?.firstName ?? "they"} can review the quote and click{" "}
                    <span className="font-semibold">Accept</span> or{" "}
                    <span className="font-semibold">Decline</span>. Accepting auto-creates a
                    confirmed event and graduates them to a customer.
                    <br />
                    <br />
                    You'll paste the link into an email (or open a prefilled draft) — nothing
                    goes out automatically yet.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={sendMutation.isPending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      sendMutation.mutate();
                    }}
                    className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1]"
                    disabled={sendMutation.isPending}
                  >
                    {sendMutation.isPending ? "Preparing..." : "Generate Link"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            ) : (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {sentEmailAuto ? "Quote sent ✨" : "Your customer link is ready"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {sentEmailAuto ? (
                      <>
                        We emailed the quote to{" "}
                        <strong>{sentEmailRecipient}</strong>. You'll get a
                        notification when they view it. The link below is the same one
                        they received — copy it if you want to text it too.
                      </>
                    ) : (
                      <>
                        Copy this link and send it to{" "}
                        {client?.firstName ?? "the customer"}. They don't need to log
                        in — they just click, review, and accept or decline.
                      </>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-4 space-y-3">
                  {sentEmailAuto && (
                    <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                      <CheckIcon className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="text-sm text-emerald-900">
                        Sent automatically via email to {sentEmailRecipient}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border">
                    <LinkIcon className="h-4 w-4 text-gray-500 shrink-0" />
                    <code className="flex-1 text-xs text-gray-800 break-all select-all">
                      {sentPublicUrl}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleCopyLink}
                    >
                      <CopyIcon className="h-4 w-4 mr-2" />
                      {linkCopied ? "Copied!" : "Copy Link"}
                    </Button>
                    {client?.email && !sentEmailAuto && (
                      <Button
                        className="flex-1 bg-gradient-to-r from-[#8A2BE2] to-[#4169E1]"
                        onClick={handleOpenEmailDraft}
                      >
                        <MailIcon className="h-4 w-4 mr-2" />
                        Open Email Draft
                      </Button>
                    )}
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogAction
                    onClick={() => {
                      setIsSendDialogOpen(false);
                      setSentPublicUrl(null);
                      setLinkCopied(false);
                      setSentEmailAuto(false);
                      setSentEmailRecipient(null);
                    }}
                  >
                    Done
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            )}
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
