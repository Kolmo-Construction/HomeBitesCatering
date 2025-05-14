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
  ExternalLink
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Leads", href: "/leads", icon: Filter },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Menu Items", href: "/menu-items", icon: Utensils },
    { name: "Menus", href: "/menus", icon: ClipboardList },
    { name: "Estimates", href: "/estimates", icon: FileText },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Reports", href: "/reports", icon: BarChart2 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-16 md:w-64 bg-white shadow-md h-[calc(100vh-4rem)] flex flex-col">
      <nav className="p-4 flex-1">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href || 
              (item.href !== "/" && location.startsWith(item.href));
              
            return (
              <li key={item.name}>
                <Link href={item.href}>
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
