import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin, useIsChef } from "@/hooks/usePermissions";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  LayoutDashboard,
  Filter,
  Users,
  ClipboardList,
  FileText,
  Calendar,
  CalendarCheck,
  BarChart2,
  Settings,
  ExternalLink,
  Inbox,
  Code,
  ChevronDown,
  ChevronRight,
  ShoppingBasket,
  ChefHat,
  UserCog,
  MessageSquareQuote,
  BookOpen,
  Columns3,
  GripVertical,
  RotateCcw,
} from "lucide-react";

// Full nav, with a `chef` flag on items kitchen staff should see. Items without
// the flag are sales/admin territory and get hidden for chef users.
type NavItem = {
  name: string;
  href: string;
  icon: any;
  chef?: boolean;
  adminOnly?: boolean;
  submenu?: { name: string; href: string }[];
};

const ALL_NAV: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, chef: true },
  { name: "Leads", href: "/raw-leads", icon: Inbox },
  { name: "Pipeline", href: "/pipeline", icon: Columns3 },
  { name: "Opportunities", href: "/opportunities", icon: Filter },
  { name: "Inquiries", href: "/quote-requests", icon: MessageSquareQuote },
  { name: "Quotes", href: "/estimates", icon: FileText },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Events", href: "/events", icon: CalendarCheck, chef: true },
  { name: "Calendar", href: "/calendar", icon: Calendar, chef: true },
  { name: "Menus", href: "/menus", icon: ClipboardList, chef: true },
  { name: "Recipes", href: "/recipes", icon: ChefHat, chef: true },
  { name: "Base Ingredients", href: "/base-ingredients", icon: ShoppingBasket, chef: true },
  { name: "Help", href: "/help", icon: BookOpen, chef: true },
  { name: "Reports", href: "/reports", icon: BarChart2 },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Users", href: "/users", icon: UserCog, adminOnly: true },
];

const STORAGE_KEY = "sidebar-nav-order";
const DEFAULT_ORDER = ALL_NAV.map((item) => item.name);

function getSavedOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x: unknown) => typeof x === "string")) {
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function saveOrder(order: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

// ── Sortable nav item ───────────────────────────────────────────────
function SortableNavItem({
  item,
  isActive,
  isExpanded,
  location,
  onToggleSubmenu,
}: {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
  location: string;
  onToggleSubmenu: (name: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  };

  const hasSubmenu = item.submenu && item.submenu.length > 0;

  return (
    <li ref={setNodeRef} style={style} className="relative group">
      {hasSubmenu ? (
        <div>
          <div
            onClick={() => onToggleSubmenu(item.name)}
            className={cn(
              "flex items-center justify-between p-2 rounded-lg transition cursor-pointer",
              isActive
                ? "text-neutral-900 bg-neutral-200"
                : "text-neutral-700 hover:bg-neutral-200"
            )}
          >
            <div className="flex items-center flex-1 min-w-0">
              {/* Drag handle */}
              <div
                {...attributes}
                {...listeners}
                className="hidden md:flex items-center mr-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-3.5 h-3.5 text-neutral-400" />
              </div>
              <item.icon className="w-5 h-5 md:mr-3 text-center shrink-0" />
              <span className="hidden md:inline truncate">{item.name}</span>
            </div>
            <div className="hidden md:block">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-neutral-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              )}
            </div>
          </div>

          {isExpanded && item.submenu && (
            <ul className="mt-1 pl-6 space-y-1">
              {item.submenu.map((subItem: any) => {
                const isSubActive =
                  location === subItem.href ||
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
                        <span className="hidden md:inline text-sm">
                          {subItem.name}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex items-center">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="hidden md:flex items-center mr-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity absolute left-0 top-1/2 -translate-y-1/2 z-10 pl-1"
          >
            <GripVertical className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <Link to={item.href} className="flex-1">
            <div
              className={cn(
                "flex items-center p-2 rounded-lg transition cursor-pointer md:pl-6",
                isActive
                  ? "text-neutral-900 bg-neutral-200"
                  : "text-neutral-700 hover:bg-neutral-200"
              )}
            >
              <item.icon className="w-5 h-5 md:mr-3 text-center shrink-0" />
              <span className="hidden md:inline truncate">{item.name}</span>
            </div>
          </Link>
        </div>
      )}
    </li>
  );
}

// ── Main Sidebar ────────────────────────────────────────────────────
export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isChef = useIsChef();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [navOrder, setNavOrder] = useState<string[]>(() => getSavedOrder() || DEFAULT_ORDER);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Build a lookup from name → NavItem
  const navLookup = new Map(ALL_NAV.map((item) => [item.name, item]));

  // Merge saved order with current items (handles additions/removals)
  const orderedNav = (() => {
    const visible = ALL_NAV.filter((item) => {
      if (item.adminOnly && !isAdmin) return false;
      if (isChef && !item.chef) return false;
      return true;
    });
    const visibleNames = new Set(visible.map((i) => i.name));

    // Start with saved order, keeping only visible items
    const ordered: NavItem[] = [];
    for (const name of navOrder) {
      if (visibleNames.has(name)) {
        ordered.push(navLookup.get(name)!);
        visibleNames.delete(name);
      }
    }
    // Append any new items not in saved order
    for (const item of visible) {
      if (visibleNames.has(item.name)) {
        ordered.push(item);
      }
    }
    return ordered;
  })();

  const isCustomOrder = navOrder.join(",") !== DEFAULT_ORDER.join(",");

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const names = orderedNav.map((i) => i.name);
      const oldIndex = names.indexOf(active.id as string);
      const newIndex = names.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(names, oldIndex, newIndex);
      setNavOrder(reordered);
      saveOrder(reordered);
    },
    [orderedNav]
  );

  const handleReset = () => {
    setNavOrder(DEFAULT_ORDER);
    localStorage.removeItem(STORAGE_KEY);
  };

  const toggleSubmenu = (name: string) => {
    setExpandedMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const isMenuActive = (item: NavItem) => {
    if (
      item.href &&
      (location === item.href ||
        (item.href !== "/" && location.startsWith(item.href)))
    ) {
      return true;
    }
    if (item.submenu) {
      return item.submenu.some(
        (subItem) =>
          location === subItem.href ||
          (subItem.href !== "/" && location.startsWith(subItem.href))
      );
    }
    return false;
  };

  return (
    <aside className="w-16 md:w-64 bg-white shadow-md h-[calc(100vh-4rem)] flex flex-col">
      <nav className="p-4 flex-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedNav.map((i) => i.name)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-1">
              {orderedNav.map((item) => {
                const isActive = isMenuActive(item);
                const isExpanded = expandedMenus[item.name] || isActive;

                return (
                  <SortableNavItem
                    key={item.name}
                    item={item}
                    isActive={isActive}
                    isExpanded={isExpanded}
                    location={location}
                    onToggleSubmenu={toggleSubmenu}
                  />
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      </nav>
      <div className="p-4 border-t border-neutral-200 space-y-2">
        {isCustomOrder && (
          <button
            onClick={handleReset}
            className="hidden md:flex items-center w-full p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition text-sm"
          >
            <RotateCcw className="w-4 h-4 mr-3" />
            Reset order
          </button>
        )}
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
