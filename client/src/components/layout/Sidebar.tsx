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
  DollarSign,
  BookOpen,
  Columns3,
  GripVertical,
  RotateCcw,
  MessageCircleQuestion,
  TrendingUp,
  Inbox as InboxIcon,
  Share2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Full nav, with a `chef` flag on items kitchen staff should see. Items without
// the flag are sales/admin territory and get hidden for chef users.
type NavSubItem = {
  name: string;
  href: string;
  icon: any;
  chef?: boolean;
  adminOnly?: boolean;
};

type NavItem = {
  name: string;
  href: string;
  icon: any;
  chef?: boolean;
  adminOnly?: boolean;
  submenu?: NavSubItem[];
};

// Top-level nav is grouped by workflow so the sidebar reflects sections
// rather than a flat list of every page. Clicking a parent toggles
// expansion; each child navigates. Auto-expands when the current
// location matches any child. Visibility flags (chef/adminOnly) on
// submenu items filter individual children; the group hides entirely
// when no children are visible.
const ALL_NAV: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, chef: true },
  {
    name: "Sales",
    href: "/sales",
    icon: TrendingUp,
    submenu: [
      { name: "Follow-ups", href: "/follow-ups", icon: InboxIcon },
      { name: "Leads", href: "/raw-leads", icon: Inbox },
      { name: "Pipeline", href: "/pipeline", icon: Columns3 },
      { name: "Quote Requests", href: "/inquiries", icon: MessageSquareQuote },
      { name: "Quotes", href: "/quotes", icon: FileText },
      { name: "Clients", href: "/clients", icon: Users },
      { name: "Unmatched", href: "/unmatched", icon: MessageCircleQuestion },
    ],
  },
  {
    name: "Operations",
    href: "/operations",
    icon: CalendarCheck,
    chef: true,
    submenu: [
      { name: "Events", href: "/events", icon: CalendarCheck, chef: true },
      { name: "Calendar", href: "/calendar", icon: Calendar, chef: true },
    ],
  },
  {
    name: "Kitchen",
    href: "/kitchen",
    icon: ChefHat,
    chef: true,
    submenu: [
      { name: "Menus", href: "/menus", icon: ClipboardList, chef: true },
      { name: "Recipes", href: "/recipes", icon: ChefHat, chef: true },
      { name: "Base Ingredients", href: "/base-ingredients", icon: ShoppingBasket, chef: true },
      { name: "Catalog & Pricing", href: "/catalog", icon: DollarSign, adminOnly: true },
    ],
  },
  {
    name: "Marketing",
    href: "/marketing",
    icon: Share2,
    adminOnly: true,
    submenu: [
      { name: "Social", href: "/social", icon: Share2, adminOnly: true },
    ],
  },
  {
    name: "Admin",
    href: "/admin",
    icon: Settings,
    submenu: [
      { name: "Reports", href: "/reports", icon: BarChart2 },
      { name: "Users", href: "/users", icon: UserCog, adminOnly: true },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
  { name: "Help", href: "/help", icon: BookOpen, chef: true },
];

// v3 — bust any saved flat/v2 order so existing users pick up the new
// grouped layout on first load. They can still reorder after.
const STORAGE_KEY = "sidebar-nav-order.v3";
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
  badges,
  forceExpanded = false,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
  location: string;
  onToggleSubmenu: (name: string, currentlyExpanded: boolean) => void;
  /** Map of href → badge count. Used to flag the Follow-ups submenu item. */
  badges?: Record<string, number>;
  /** When rendered inside the mobile drawer, labels are always visible and
   * drag handles are hidden. */
  forceExpanded?: boolean;
  /** Called after a nav link is clicked — lets the mobile drawer close itself. */
  onNavigate?: () => void;
}) {
  const labelCls = forceExpanded ? "inline" : "hidden md:inline";
  const mdBlockCls = forceExpanded ? "block" : "hidden md:block";
  const iconMarginCls = forceExpanded ? "mr-3" : "md:mr-3";
  const pillPadCls = forceExpanded ? "pl-6" : "md:pl-6";
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
            onClick={() => onToggleSubmenu(item.name, isExpanded)}
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
              <item.icon className={cn("w-5 h-5 text-center shrink-0", iconMarginCls)} />
              <span className={cn("truncate", labelCls)}>{item.name}</span>
              {(() => {
                const groupBadge = (item.submenu || []).reduce(
                  (sum, sub) => sum + (badges?.[sub.href] || 0),
                  0,
                );
                return groupBadge > 0 ? (
                  <span className={cn("ml-2 text-[10px] font-semibold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none", labelCls)}>
                    {groupBadge}
                  </span>
                ) : null;
              })()}
            </div>
            <div className={mdBlockCls}>
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
                    <Link to={subItem.href} onClick={onNavigate}>
                      <div
                        className={cn(
                          "flex items-center p-2 rounded-lg transition cursor-pointer",
                          isSubActive
                            ? "text-neutral-900 bg-neutral-200"
                            : "text-neutral-700 hover:bg-neutral-200"
                        )}
                      >
                        <subItem.icon className={cn("w-4 h-4 text-center", iconMarginCls)} />
                        <span className={cn("text-sm", labelCls)}>
                          {subItem.name}
                        </span>
                        {badges?.[subItem.href] ? (
                          <span className={cn("ml-auto text-[10px] font-semibold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none", labelCls)}>
                            {badges[subItem.href]}
                          </span>
                        ) : null}
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
          <Link to={item.href} className="flex-1" onClick={onNavigate}>
            <div
              className={cn(
                "flex items-center p-2 rounded-lg transition cursor-pointer",
                pillPadCls,
                isActive
                  ? "text-neutral-900 bg-neutral-200"
                  : "text-neutral-700 hover:bg-neutral-200"
              )}
            >
              <item.icon className={cn("w-5 h-5 text-center shrink-0", iconMarginCls)} />
              <span className={cn("truncate", labelCls)}>{item.name}</span>
            </div>
          </Link>
        </div>
      )}
    </li>
  );
}

// ── Main Sidebar ────────────────────────────────────────────────────
export default function Sidebar({
  forceExpanded = false,
  onNavigate,
}: {
  /** Render as fully-expanded (used inside the mobile drawer). */
  forceExpanded?: boolean;
  /** Called after clicking a nav link — used by the mobile drawer to close. */
  onNavigate?: () => void;
} = {}) {
  const [location] = useLocation();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isChef = useIsChef();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [navOrder, setNavOrder] = useState<string[]>(() => getSavedOrder() || DEFAULT_ORDER);

  // Follow-ups count — drives the badge on the Sales parent + the Follow-ups
  // submenu entry. Chefs don't see Sales at all, but the query is cheap and
  // runs for everyone; the backend returns 0s if nothing matches.
  const { data: followUpCounts } = useQuery<{
    p0: number;
    p1: number;
    p2: number;
    p3: number;
    total: number;
  }>({
    queryKey: ["/api/follow-ups/count"],
    queryFn: async () => {
      const res = await fetch("/api/follow-ups/count", { credentials: "include" });
      if (!res.ok) return { p0: 0, p1: 0, p2: 0, p3: 0, total: 0 };
      return res.json();
    },
    refetchInterval: 120_000,
    enabled: !isChef,
  });
  const followUpUrgent = (followUpCounts?.p0 ?? 0) + (followUpCounts?.p1 ?? 0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Filter a submenu by role, dropping entries the user can't see.
  const filterSubmenu = (submenu?: NavSubItem[]) => {
    if (!submenu) return undefined;
    return submenu.filter((sub) => {
      if (sub.adminOnly && !isAdmin) return false;
      if (isChef && !sub.chef) return false;
      return true;
    });
  };

  // Build a lookup from name → NavItem, with submenus pre-filtered so the
  // render path and badge counts both use the role-appropriate list.
  const navLookup = new Map(
    ALL_NAV.map((item) => [
      item.name,
      item.submenu ? { ...item, submenu: filterSubmenu(item.submenu) } : item,
    ]),
  );

  // Merge saved order with current items (handles additions/removals).
  // A group is visible if the group itself passes role checks AND at
  // least one of its (filtered) children remains — no point showing an
  // empty collapsible.
  const orderedNav = (() => {
    const visible = Array.from(navLookup.values()).filter((item) => {
      if (item.adminOnly && !isAdmin) return false;
      if (isChef && !item.chef) return false;
      if (item.submenu && item.submenu.length === 0) return false;
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

  // Flip the effective state of the submenu — not just prev[name], because
  // the effective state may be auto-derived from `isActive`. Passing in the
  // currently-visible state from the render means one click always toggles.
  const toggleSubmenu = (name: string, currentlyExpanded: boolean) => {
    setExpandedMenus((prev) => ({ ...prev, [name]: !currentlyExpanded }));
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
    <aside className={cn(
      "bg-white shadow-md h-[calc(100vh-4rem)] flex flex-col",
      forceExpanded ? "w-64" : "w-16 md:w-64",
    )}>
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
                // `expandedMenus[name]` is a user override — when they click
                // the parent we store their intent. If unset, fall back to
                // auto-expanding when a sub-route is currently active.
                // Using `??` (not `||`) so that `false` wins over `isActive`,
                // letting the user collapse a group even while on one of
                // its sub-routes.
                const userIntent = expandedMenus[item.name];
                const isExpanded = userIntent ?? isActive;

                return (
                  <SortableNavItem
                    key={item.name}
                    item={item}
                    isActive={isActive}
                    isExpanded={isExpanded}
                    location={location}
                    onToggleSubmenu={toggleSubmenu}
                    badges={{ "/follow-ups": followUpUrgent }}
                    forceExpanded={forceExpanded}
                    onNavigate={onNavigate}
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
            className={cn(
              "items-center w-full p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition text-sm",
              forceExpanded ? "flex" : "hidden md:flex",
            )}
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
          <ExternalLink className={cn("w-5 h-5 text-center", forceExpanded ? "mr-3" : "md:mr-3")} />
          <span className={forceExpanded ? "inline" : "hidden md:inline"}>Visit Website</span>
        </a>
      </div>
    </aside>
  );
}
