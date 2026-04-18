import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Filter, Search } from "lucide-react";

import StatCard from "@/components/dashboard/StatCard";
import RecentOpportunitiesTable from "@/components/dashboard/RecentOpportunitiesTable";
import UpcomingEventsList from "@/components/dashboard/UpcomingEventsList";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentQuotesTable from "@/components/dashboard/RecentQuotesTable";
import MenuMarginsCard from "@/components/dashboard/MenuMarginsCard";
import PendingFollowUps from "@/components/dashboard/PendingFollowUps";
import FunnelChart from "@/components/dashboard/FunnelChart";
import StaleDealsAlert from "@/components/dashboard/StaleDealsAlert";

export default function Dashboard() {
  // Fetch data for stats
  const { data: opportunities = [] } = useQuery<any[]>({
    queryKey: ["/api/opportunities"],
  });

  const { data: quotes = [] } = useQuery<any[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events/upcoming"],
  });
  
  // Calculate stats
  const activeOpportunities = opportunities.filter((opportunity: any) => 
    opportunity.status !== "archived" && opportunity.status !== "booked"
  ).length;
  
  const pendingQuotes = quotes.filter((quote: any) => 
    quote.status === "draft" || quote.status === "sent"
  ).length;
  
  const upcomingEvents = events.length;
  
  // Calculate revenue (from accepted quotes in the current month)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyRevenue = quotes
    .filter((quote: any) => {
      if (quote.status !== "accepted") return false;
      const quoteDate = new Date(quote.acceptedAt || quote.createdAt);
      return quoteDate.getMonth() === currentMonth && 
             quoteDate.getFullYear() === currentYear;
    })
    .reduce((sum: number, quote: any) => sum + quote.total, 0);
  
  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="font-poppins text-2xl font-bold text-neutral-900">Dashboard</h1>
        <div className="mt-2 md:mt-0 flex space-x-2">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search..." 
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-purple pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
          </div>
          <Link href="/opportunities/new">
            <Button className="bg-[#8B7355] hover:bg-[#6B5345]">
              <span className="hidden md:inline">New Opportunity</span>
              <Filter className="md:hidden h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <FollowUpsWidget />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Active Opportunities" 
          value={activeOpportunities} 
          icon={<Filter className="text-[#8B7355] h-5 w-5" />}
          iconBgColor="bg-[#8B7355]" 
          changePercent={12}
        />
        
        <StatCard 
          title="Pending Quotes" 
          value={pendingQuotes} 
          icon={<svg className="text-accent h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>}
          iconBgColor="bg-accent"
          changePercent={-3}
        />
        
        <StatCard 
          title="Upcoming Events" 
          value={upcomingEvents} 
          icon={<svg className="text-[#E28C0A] h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>}
          iconBgColor="bg-[#E28C0A]"
          changePercent={25}
        />
        
        <StatCard 
          title="This Month's Revenue" 
          value={`$${(monthlyRevenue / 100).toFixed(1)}k`}
          icon={<svg className="text-green-500 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>}
          iconBgColor="bg-green-500"
          changePercent={18}
        />
      </div>

      {/* Pending Follow-Ups (only renders if there are drafts) */}
      <div className="mb-6">
        <PendingFollowUps />
      </div>

      {/* Recent Activity & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <RecentOpportunitiesTable />
        <UpcomingEventsList />
      </div>

      {/* Funnel + Stale Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <FunnelChart />
        <StaleDealsAlert />
      </div>

      {/* Quick Access & Recent Quotes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <QuickActions />
        <RecentQuotesTable />
      </div>

      {/* Menu Margins */}
      <div className="mb-6">
        <MenuMarginsCard />
      </div>
    </div>
  );
}

// Small banner at the top of the dashboard that shows the current count of
// urgent follow-ups (P0 + P1) and links to the inbox. Hidden when empty.
function FollowUpsWidget() {
  const { data } = useQuery<{
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
    refetchInterval: 60_000,
  });
  const urgent = (data?.p0 ?? 0) + (data?.p1 ?? 0);
  if (urgent === 0) return null;
  return (
    <Link href="/follow-ups">
      <div className="mb-6 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 via-orange-50 to-white px-4 py-3 flex items-center justify-between hover:shadow-sm transition cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-500 text-white flex items-center justify-center text-lg font-bold">
            {urgent}
          </div>
          <div>
            <div className="font-semibold text-red-900">
              {urgent === 1
                ? "1 follow-up needs you"
                : `${urgent} follow-ups need you`}
            </div>
            <div className="text-xs text-red-700/80">
              {(data?.p0 ?? 0)} urgent today · {(data?.p1 ?? 0)} this week
            </div>
          </div>
        </div>
        <div className="text-sm text-red-700 hover:text-red-900">
          Open inbox →
        </div>
      </div>
    </Link>
  );
}
