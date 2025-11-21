import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Filter, Search } from "lucide-react";

import StatCard from "@/components/dashboard/StatCard";
import RecentOpportunitiesTable from "@/components/dashboard/RecentOpportunitiesTable";
import UpcomingEventsList from "@/components/dashboard/UpcomingEventsList";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentEstimatesTable from "@/components/dashboard/RecentEstimatesTable";

export default function Dashboard() {
  // Fetch data for stats
  const { data: opportunities = [] } = useQuery({
    queryKey: ["/api/opportunities"],
  });
  
  const { data: estimates = [] } = useQuery({
    queryKey: ["/api/estimates"],
  });
  
  const { data: events = [] } = useQuery({
    queryKey: ["/api/events/upcoming"],
  });
  
  // Calculate stats
  const activeOpportunities = opportunities.filter((opportunity: any) => 
    opportunity.status !== "archived" && opportunity.status !== "booked"
  ).length;
  
  const pendingEstimates = estimates.filter((estimate: any) => 
    estimate.status === "draft" || estimate.status === "sent"
  ).length;
  
  const upcomingEvents = events.length;
  
  // Calculate revenue (from accepted estimates in the current month)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyRevenue = estimates
    .filter((estimate: any) => {
      if (estimate.status !== "accepted") return false;
      const estimateDate = new Date(estimate.acceptedAt || estimate.createdAt);
      return estimateDate.getMonth() === currentMonth && 
             estimateDate.getFullYear() === currentYear;
    })
    .reduce((sum: number, estimate: any) => sum + estimate.total, 0);
  
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
            <Button className="bg-gradient-to-r from-[#0000EE] to-[#E28C0A] hover:opacity-90">
              <span className="hidden md:inline">New Opportunity</span>
              <Filter className="md:hidden h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Active Opportunities" 
          value={activeOpportunities} 
          icon={<Filter className="text-[#0000EE] h-5 w-5" />}
          iconBgColor="bg-[#0000EE]" 
          changePercent={12}
        />
        
        <StatCard 
          title="Pending Estimates" 
          value={pendingEstimates} 
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

      {/* Recent Activity & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <RecentOpportunitiesTable />
        <UpcomingEventsList />
      </div>

      {/* Quick Access & Recent Estimates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QuickActions />
        <RecentEstimatesTable />
      </div>
    </div>
  );
}
