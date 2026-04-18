import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle2, 
  UserCog, 
  Key, 
  Building, 
  Users, 
  LayoutGrid,
  Database,
  Download,
  Palette,
  Sun,
  Moon
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

// Password change form schema
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

// Profile form schema
const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Theme preset colors
const themePresets = [
  { name: "Home Bites", primary: "28 33% 52%", accent: "30 100% 50%", description: "Rose taupe and orange" },
  { name: "Ocean Blue", primary: "210 70% 50%", accent: "190 80% 45%", description: "Professional blue tones" },
  { name: "Forest Green", primary: "150 40% 40%", accent: "80 60% 45%", description: "Natural earth tones" },
  { name: "Sunset", primary: "350 65% 55%", accent: "25 90% 55%", description: "Warm coral and gold" },
  { name: "Lavender", primary: "270 50% 60%", accent: "280 60% 70%", description: "Soft purple tones" },
  { name: "Slate", primary: "220 15% 45%", accent: "200 20% 55%", description: "Modern neutral gray" },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });
  const [selectedTheme, setSelectedTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('themePreset') || 'Home Bites';
    }
    return 'Home Bites';
  });

  // Apply theme changes
  const applyTheme = (themeName: string, dark: boolean) => {
    const preset = themePresets.find(t => t.name === themeName) || themePresets[0];
    const root = document.documentElement;
    
    // Apply dark mode
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Apply color theme
    root.style.setProperty('--primary', preset.primary);
    root.style.setProperty('--ring', preset.primary);
    root.style.setProperty('--accent', preset.accent);
    root.style.setProperty('--secondary', preset.accent);
    
    // Save to localStorage
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    localStorage.setItem('themePreset', themeName);
  };

  // Handle theme toggle
  const handleDarkModeToggle = (enabled: boolean) => {
    setIsDarkMode(enabled);
    applyTheme(selectedTheme, enabled);
  };

  // Handle theme preset change
  const handleThemeChange = (themeName: string) => {
    setSelectedTheme(themeName);
    applyTheme(themeName, isDarkMode);
    toast({
      title: "Theme updated",
      description: `Applied ${themeName} theme`,
    });
  };

  // Apply saved theme on mount
  useEffect(() => {
    applyTheme(selectedTheme, isDarkMode);
  }, []);
  
  // Get user data
  const { data: userData, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  // Get user list for admin tab
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "admin" && activeTab === "users",
  });
  
  // Profile form setup
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      email: userData?.email || "",
      phone: "",
    },
    values: {
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      email: userData?.email || "",
      phone: "",
    },
  });
  
  // Password form setup
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const res = await apiRequest("PATCH", `/api/users/${userData.id}`, values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update profile: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Password update mutation
  const passwordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      const res = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      passwordForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to change password: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Database export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/export-database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // This ensures cookies are included for authentication
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Export failed:', errorText);
        throw new Error('Failed to export database');
      }
      return res.blob();
    },
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-backup-${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Database exported",
        description: "Database backup has been downloaded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Export failed",
        description: `Failed to export database: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle profile form submission
  const onProfileSubmit = (values: ProfileFormValues) => {
    profileMutation.mutate(values);
  };
  
  // Handle password form submission
  const onPasswordSubmit = (values: PasswordFormValues) => {
    passwordMutation.mutate(values);
  };
  
  // User list columns for admin tab
  const userColumns: ColumnDef<any>[] = [
    {
      accessorKey: "username",
      header: "Username",
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span>{row.original.firstName} {row.original.lastName}</span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <span className="capitalize">{row.original.role}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: () => (
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      ),
    },
  ];
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-poppins text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center">
            <UserCog className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center">
            <Key className="mr-2 h-4 w-4" />
            Password
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center">
            <Building className="mr-2 h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center">
            <Palette className="mr-2 h-4 w-4" />
            Theme
          </TabsTrigger>
          {user?.role === "admin" && (
            <TabsTrigger value="users" className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              Users
            </TabsTrigger>
          )}
          {user?.role === "admin" && (
            <TabsTrigger value="integrations" className="flex items-center">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Integrations
            </TabsTrigger>
          )}
          {user?.role === "admin" && (
            <TabsTrigger value="admin" className="flex items-center">
              <Database className="mr-2 h-4 w-4" />
              System Admin
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Manage your personal information and contact details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <div className="font-semibold">Username</div>
                      <div className="text-sm text-muted-foreground">(cannot be changed)</div>
                    </div>
                    <div className="mt-1 p-2 border rounded-md bg-gray-50">
                      {userData?.username}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <div className="font-semibold">Role</div>
                    </div>
                    <div className="mt-1 p-2 border rounded-md bg-gray-50 capitalize">
                      {userData?.role}
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90"
                    disabled={profileMutation.isPending}
                  >
                    {profileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="password" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Change your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          Password must be at least 6 characters long.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90"
                    disabled={passwordMutation.isPending}
                  >
                    {passwordMutation.isPending ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Update your company details that appear on quotes and client communications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <Input defaultValue="Home Bites Catering" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <Input defaultValue="(206) 555-1234" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input defaultValue="info@homebites.net" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <Input defaultValue="https://www.homebites.net" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <Input defaultValue="123 Main Street" className="mb-2" />
                  <div className="grid grid-cols-3 gap-4">
                    <Input defaultValue="Seattle" placeholder="City" />
                    <Input defaultValue="WA" placeholder="State" />
                    <Input defaultValue="98101" placeholder="ZIP" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Information
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input defaultValue="9.5%" placeholder="Sales Tax Rate %" />
                    <Input defaultValue="12-3456789" placeholder="Tax ID" />
                  </div>
                </div>
                
                <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90">
                  Save Company Information
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="theme" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of your application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode" className="text-base font-medium">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark themes
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    id="dark-mode"
                    checked={isDarkMode}
                    onCheckedChange={handleDarkModeToggle}
                    data-testid="switch-dark-mode"
                  />
                  <Moon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-medium mb-1">Color Theme</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose a color palette for the application
                  </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {themePresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleThemeChange(preset.name)}
                      className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                        selectedTheme === preset.name
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                      data-testid={`theme-preset-${preset.name.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      <div className="flex gap-2 mb-3">
                        <div
                          className="w-8 h-8 rounded-full"
                          style={{ backgroundColor: `hsl(${preset.primary})` }}
                        />
                        <div
                          className="w-8 h-8 rounded-full"
                          style={{ backgroundColor: `hsl(${preset.accent})` }}
                        />
                      </div>
                      <div className="font-medium text-sm">{preset.name}</div>
                      <div className="text-xs text-muted-foreground">{preset.description}</div>
                      {selectedTheme === preset.name && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Preview</h4>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm">Primary Button</Button>
                  <Button size="sm" variant="secondary">Secondary</Button>
                  <Button size="sm" variant="outline">Outline</Button>
                  <Badge>Badge</Badge>
                  <Badge variant="secondary">Secondary Badge</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {user?.role === "admin" && (
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage user accounts and permissions.
                  </CardDescription>
                </div>
                <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90">
                  Add User
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={userColumns}
                  data={users}
                  searchKey="username"
                  loading={isLoadingUsers}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        {user?.role === "admin" && (
          <TabsContent value="integrations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Integrations</CardTitle>
                <CardDescription>
                  Configure integrations with external services and APIs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Lead Sources Integration</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connect with external lead sources to automatically import leads.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="border rounded-md p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <CheckCircle2 className="text-green-500 h-5 w-5" />
                            <h4 className="font-medium">Website Form Integration</h4>
                          </div>
                          <div>
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Automatically create leads from website contact form submissions.
                        </p>
                        <div className="flex justify-end mt-4">
                          <Button variant="outline" size="sm">Configure</Button>
                        </div>
                      </div>
                      
                      <div className="border rounded-md p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">Third-Party Lead Providers</h4>
                          </div>
                          <div>
                            <Badge variant="outline">Not Connected</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Connect with external lead providers like The Knot, WeddingWire, etc.
                        </p>
                        <div className="flex justify-end mt-4">
                          <Button variant="outline" size="sm">Connect</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Calendar Integration</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Sync events with external calendar services.
                    </p>
                    
                    <div className="border rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">Google Calendar</h4>
                        </div>
                        <div>
                          <Badge variant="outline">Not Connected</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Sync events with Google Calendar to manage your schedule in one place.
                      </p>
                      <div className="flex justify-end mt-4">
                        <Button variant="outline" size="sm">Connect</Button>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">API Access</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Manage API keys for external integrations.
                    </p>
                    
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h4 className="font-medium mb-2">API Webhook URL</h4>
                      <div className="flex">
                        <Input 
                          value="https://api.homebites.net/webhooks/leads" 
                          readOnly 
                          className="rounded-r-none"
                        />
                        <Button 
                          variant="outline" 
                          className="rounded-l-none"
                          onClick={() => {
                            navigator.clipboard.writeText("https://api.homebites.net/webhooks/leads");
                            toast({
                              title: "Copied!",
                              description: "API webhook URL copied to clipboard",
                            });
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90">
                  Save Integration Settings
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        )}
        
        {user?.role === "admin" && (
          <TabsContent value="admin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Database Management</CardTitle>
                <CardDescription>
                  Export and manage your database for backup and migration purposes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Database Export</h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="flex items-start space-x-4">
                        <Database className="h-8 w-8 text-blue-500 mt-1" />
                        <div className="flex-1">
                          <h4 className="font-medium mb-2">Export Database</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Download a complete backup of your database including all tables, data, and structure. 
                            This creates a SQL file that can be used to restore your data.
                          </p>
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => exportMutation.mutate()}
                              disabled={exportMutation.isPending}
                              className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90"
                            >
                              {exportMutation.isPending ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Exporting...
                                </>
                              ) : (
                                <>
                                  <Download className="mr-2 h-4 w-4" />
                                  Export Database
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">System Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="font-medium mb-2">Database Status</h4>
                        <div className="text-sm text-green-600">✓ Connected</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="font-medium mb-2">Last Backup</h4>
                        <div className="text-sm text-muted-foreground">Manual export only</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
