import { useState } from "react";
import { BellIcon, CircleHelp, LogOutIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import EmailSyncToggle from "@/components/emailSync/EmailSyncToggle";

export default function Header() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Get initials for avatar
  const getInitials = () => {
    if (!user) return "U";
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  };

  return (
    <header className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img 
            src="https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&h=50" 
            alt="Home Bites Logo" 
            className="h-10 w-10 rounded-full"
          />
          <h1 className="font-poppins font-semibold text-lg md:text-xl">Home Bites CMS</h1>
        </div>
        <div className="flex items-center space-x-4">
          {/* Email Sync Toggle Switch - Temporarily disabled */}
          {/* <div className="mr-4 text-white">
            <EmailSyncToggle />
          </div> */}
          
          <button className="text-white hover:text-neutral-200 transition">
            <BellIcon className="h-5 w-5" />
          </button>
          <button className="text-white hover:text-neutral-200 transition">
            <CircleHelp className="h-5 w-5" />
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center">
              <span className="mr-2 hidden md:inline">
                {user?.firstName} {user?.lastName}
              </span>
              <Avatar className="h-8 w-8 border-2 border-white">
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer" disabled={isLoggingOut} onClick={handleLogout}>
                <LogOutIcon className="mr-2 h-4 w-4" />
                <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
