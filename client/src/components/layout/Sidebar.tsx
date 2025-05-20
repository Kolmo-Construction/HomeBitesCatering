import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Filter,
  Users,
  Utensils,
  ClipboardList,
  FileText,
  Calendar,
  BarChart2,
  Settings,
  ExternalLink,
  Inbox,
  FileQuestion,
  BookOpen,
  Code,
  ChevronDown,
  ChevronRight,
  Calculator
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Incoming Leads", href: "/raw-leads", icon: Inbox },
    { name: "Opportunities", href: "/opportunities", icon: Filter },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Menu Items", href: "/menu-items", icon: Utensils },
    { name: "Menus", href: "/menus", icon: ClipboardList },
    { name: "Quotes", href: "/estimates", icon: FileText },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { 
      name: "Form Builder", 
      href: "/admin/form-builder", 
      icon: FileQuestion,
      submenu: [
        { name: "Question Library", href: "/admin/form-builder/question-library", icon: BookOpen },
        { name: "Forms", href: "/admin/form-builder/forms", icon: ClipboardList },
        { name: "Calculator Test", href: "/calculator-test", icon: Calculator },
      ] 
    },
    { name: "Reports", href: "/reports", icon: BarChart2 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  // Toggle submenu expansion
  const toggleSubmenu = (name: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Check if a menu is active
  const isMenuActive = (item: any) => {
    if (item.href && (location === item.href || (item.href !== "/" && location.startsWith(item.href)))) {
      return true;
    }
    
    // Check if any submenu item is active
    if (item.submenu) {
      return item.submenu.some((subItem: any) => 
        location === subItem.href || (subItem.href !== "/" && location.startsWith(subItem.href))
      );
    }
    
    return false;
  };

  return (
    <aside className="w-16 md:w-64 bg-white shadow-md h-[calc(100vh-4rem)] flex flex-col">
      <nav className="p-4 flex-1">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = isMenuActive(item);
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isExpanded = expandedMenus[item.name] || isActive;
            
            return (
              <li key={item.name} className="relative">
                {hasSubmenu ? (
                  // Menu with submenu
                  <div>
                    <div
                      onClick={() => toggleSubmenu(item.name)}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg transition cursor-pointer",
                        isActive
                          ? "text-neutral-900 bg-neutral-200"
                          : "text-neutral-700 hover:bg-neutral-200"
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon className="w-5 h-5 md:mr-3 text-center" />
                        <span className="hidden md:inline">{item.name}</span>
                      </div>
                      <div className="hidden md:block">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-neutral-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-neutral-500" />
                        )}
                      </div>
                    </div>
                    
                    {/* Submenu */}
                    {isExpanded && (
                      <ul className="mt-1 pl-6 space-y-1">
                        {item.submenu.map((subItem: any) => {
                          const isSubActive = location === subItem.href || 
                            (subItem.href !== "/" && location.startsWith(subItem.href));
                            
                          return (
                            <li key={`${item.name}-${subItem.name}`}>
                              <Link to={subItem.href}>
                                <div
                                  className={cn(
                                    "flex items-center p-2 rounded-lg transition cursor-pointer",
                                    isSubActive
                                      ? "text-neutral-900 bg-neutral-200"
                                      : "text-neutral-700 hover:bg-neutral-200"
                                  )}
                                >
                                  <subItem.icon className="w-4 h-4 md:mr-3 text-center" />
                                  <span className="hidden md:inline text-sm">{subItem.name}</span>
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : (
                  // Regular menu item without submenu
                  <Link to={item.href}>
                    <div
                      className={cn(
                        "flex items-center p-2 rounded-lg transition cursor-pointer",
                        isActive
                          ? "text-neutral-900 bg-neutral-200"
                          : "text-neutral-700 hover:bg-neutral-200"
                      )}
                    >
                      <item.icon className="w-5 h-5 md:mr-3 text-center" />
                      <span className="hidden md:inline">{item.name}</span>
                    </div>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-neutral-200">
        <a
          href="https://www.homebites.net/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center p-2 text-neutral-700 hover:bg-neutral-200 rounded-lg transition"
        >
          <ExternalLink className="w-5 h-5 md:mr-3 text-center" />
          <span className="hidden md:inline">Visit Website</span>
        </a>
      </div>
    </aside>
  );
}
