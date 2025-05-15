import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Mail, MailX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export default function EmailSyncToggle() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user has admin rights
  useEffect(() => {
    if (user) {
      setIsAdmin(user.role === "admin");
    }
  }, [user]);

  // Fetch the current email sync status
  const { data: syncStatus, isLoading } = useQuery({
    queryKey: ['/api/email-sync/status'],
    queryFn: async () => {
      console.log("Fetching email sync status");
      try {
        const res = await fetch('/api/email-sync/status', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // credentials: 'include', // Temporarily removed for debugging
        });
        
        // Always read the response body for debugging regardless of status code
        const responseText = await res.text();
        console.log("Status response:", responseText);
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse status response as JSON:", e);
          return { enabled: false, configured: false, error: "Invalid JSON response" };
        }
        
        if (!res.ok) {
          if (res.status === 404) {
            return { enabled: false, configured: false };
          }
          if (res.status === 401 || res.status === 403) {
            console.warn('User not authenticated or not authorized to check email sync status');
            return { enabled: false, configured: false, unauthorized: true };
          }
          return { enabled: false, configured: false, error: responseData.message || "Unknown error" };
        }
        
        return responseData;
      } catch (error) {
        console.error('Error fetching email sync status:', error);
        return { enabled: false, configured: false, error: error.message };
      }
    },
    enabled: isAdmin, // Only fetch if user is admin
    refetchInterval: 3000000, // Refresh every 30 seconds
  });

  // Update local state when API data loads
  useEffect(() => {
    if (syncStatus) {
      setSyncEnabled(syncStatus.enabled);
    }
  }, [syncStatus]);

  // Toggle email sync
  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      console.log("Toggling email sync to:", enabled ? "ON" : "OFF");
      
      const res = await fetch('/api/email-sync/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // credentials: 'include', // Temporarily removed for debugging
        body: JSON.stringify({ enabled }),
      });

      // Always read the response body regardless of status code
      const responseText = await res.text();
      console.log("Toggle response:", responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response as JSON:", e);
        responseData = { message: responseText || 'Invalid response from server' };
      }

      if (!res.ok) {
        throw new Error(responseData.message || 'Failed to toggle email sync');
      }

      return responseData;
    },
    onSuccess: (data) => {
      setSyncEnabled(data.enabled);
      queryClient.invalidateQueries({ queryKey: ['/api/email-sync/status'] });
      toast({
        title: data.enabled ? 'Email Sync Enabled' : 'Email Sync Disabled',
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to toggle email sync: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  const handleToggle = () => {
    toggleMutation.mutate(!syncEnabled);
  };

  // Only show to admins
  if (!isAdmin) return null;

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center">
        <div className="w-10 h-5 bg-gray-300 rounded-full animate-pulse mr-2"></div>
        <span className="text-sm text-gray-300">Loading...</span>
      </div>
    );
  }

  // If sync is not configured, don't show the toggle
  if (syncStatus && !syncStatus.configured) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              <span className="mr-2 text-xs md:text-sm">Email Sync</span>
              <Switch
                checked={syncEnabled}
                onCheckedChange={handleToggle}
                disabled={toggleMutation.isPending}
                className="data-[state=checked]:bg-green-500"
              />
              {syncEnabled ? (
                <Mail className="ml-2 h-4 w-4 text-green-300" />
              ) : (
                <MailX className="ml-2 h-4 w-4 text-gray-300" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{syncEnabled ? 'Email sync is active' : 'Email sync is paused'}</p>
            {syncStatus?.targetEmail && (
              <p className="text-xs text-gray-400">Syncing: {syncStatus.targetEmail}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}