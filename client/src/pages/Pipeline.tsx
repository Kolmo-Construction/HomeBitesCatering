/**
 * Tier 2, Item 5: Pipeline Kanban Board
 *
 * Visual board showing opportunities moving through stages.
 * Drag-and-drop to change status. Cards show key info at a glance.
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, MapPin, DollarSign, Clock, GripVertical } from "lucide-react";
import type { Opportunity } from "@/types/opportunity";

const PIPELINE_COLUMNS = [
  { id: "new", label: "New", color: "bg-blue-500" },
  { id: "contacted", label: "Contacted", color: "bg-yellow-500" },
  { id: "qualified", label: "Qualified", color: "bg-purple-500" },
  { id: "proposal", label: "Proposal", color: "bg-orange-500" },
  { id: "booked", label: "Booked", color: "bg-green-500" },
];

const PRIORITY_COLORS: Record<string, string> = {
  hot: "border-l-red-500",
  high: "border-l-orange-400",
  medium: "border-l-yellow-400",
  low: "border-l-blue-400",
};

function daysInStage(opp: Opportunity): number {
  const ref = opp.statusChangedAt || opp.updatedAt;
  return Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Draggable card ──────────────────────────────────────────────────────────

function PipelineCard({ opp, isDragging }: { opp: Opportunity; isDragging?: boolean }) {
  const days = daysInStage(opp);
  const priorityBorder = PRIORITY_COLORS[opp.priority || "medium"];

  return (
    <Link href={`/opportunities/${opp.id}`}>
      <Card
        className={cn(
          "p-3 border-l-4 cursor-pointer hover:shadow-md transition bg-white",
          priorityBorder,
          isDragging && "opacity-50 shadow-lg ring-2 ring-[#8B7355]"
        )}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="font-medium text-sm truncate flex-1">
            {opp.firstName} {opp.lastName}
          </div>
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] px-1 py-0 ml-1 shrink-0",
              opp.priority === "hot" && "bg-red-100 text-red-700",
              opp.priority === "high" && "bg-orange-100 text-orange-700",
              opp.priority === "medium" && "bg-yellow-100 text-yellow-700",
              opp.priority === "low" && "bg-blue-100 text-blue-700"
            )}
          >
            {opp.priority || "medium"}
          </Badge>
        </div>
        <div className="text-xs text-gray-500 space-y-0.5">
          <div className="capitalize">{opp.eventType.replace(/_/g, " ")}</div>
          {opp.eventDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(new Date(opp.eventDate))}
            </div>
          )}
          {opp.guestCount && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {opp.guestCount} guests
            </div>
          )}
        </div>
        {days > 3 && (
          <div className={cn(
            "mt-1.5 text-[10px] font-medium flex items-center gap-1",
            days > 7 ? "text-red-500" : "text-amber-500"
          )}>
            <Clock className="h-3 w-3" />
            {days}d in stage
          </div>
        )}
      </Card>
    </Link>
  );
}

function DraggableCard({ opp }: { opp: Opportunity }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `opp-${opp.id}`,
    data: { opp },
  });

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className="mb-2">
      <PipelineCard opp={opp} isDragging={isDragging} />
    </div>
  );
}

// ─── Droppable column ────────────────────────────────────────────────────────

function PipelineColumn({
  column,
  opps,
}: {
  column: (typeof PIPELINE_COLUMNS)[number];
  opps: Opportunity[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[220px] max-w-[300px] rounded-lg p-2 transition",
        isOver ? "bg-amber-50 ring-2 ring-[#8B7355]" : "bg-gray-50"
      )}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn("w-2.5 h-2.5 rounded-full", column.color)} />
        <span className="text-sm font-semibold">{column.label}</span>
        <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">
          {opps.length}
        </Badge>
      </div>
      <div className="space-y-0 min-h-[100px]">
        {opps.map((opp) => (
          <DraggableCard key={opp.id} opp={opp} />
        ))}
        {opps.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-8">No opportunities</div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Pipeline() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [activeOpp, setActiveOpp] = useState<Opportunity | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data: allOpportunities = [] } = useQuery<Opportunity[]>({
    queryKey: ["/api/opportunities"],
    queryFn: async () => {
      const res = await fetch("/api/opportunities");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
    },
    onError: () => {
      toast({ title: "Failed to move opportunity", variant: "destructive" });
    },
  });

  // Filter
  const filtered = useMemo(() => {
    let result = allOpportunities.filter((o) => o.status !== "archived");
    if (priorityFilter !== "all") result = result.filter((o) => o.priority === priorityFilter);
    if (eventTypeFilter !== "all") result = result.filter((o) => o.eventType === eventTypeFilter);
    return result;
  }, [allOpportunities, priorityFilter, eventTypeFilter]);

  // Group by column
  const columnData = useMemo(() => {
    const groups: Record<string, Opportunity[]> = {};
    PIPELINE_COLUMNS.forEach((c) => { groups[c.id] = []; });
    filtered.forEach((opp) => {
      if (groups[opp.status]) groups[opp.status].push(opp);
    });
    return groups;
  }, [filtered]);

  // Unique event types for filter
  const eventTypes = useMemo(() => {
    const types = new Set(allOpportunities.map((o) => o.eventType));
    return Array.from(types).sort();
  }, [allOpportunities]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveOpp((event.active.data.current as any)?.opp || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveOpp(null);
    const { active, over } = event;
    if (!over) return;

    const opp = (active.data.current as any)?.opp as Opportunity;
    const newStatus = over.id as string;

    if (opp && newStatus && opp.status !== newStatus) {
      // Optimistic update
      queryClient.setQueryData<Opportunity[]>(["/api/opportunities"], (old) =>
        old?.map((o) => (o.id === opp.id ? { ...o, status: newStatus } : o)) || []
      );
      updateMutation.mutate({ id: opp.id, status: newStatus });
      toast({ title: `Moved to ${newStatus}`, description: `${opp.firstName} ${opp.lastName}` });
    }
  };

  // Summary stats
  const totalValue = filtered.length;
  const hotCount = filtered.filter((o) => o.priority === "hot").length;

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h1 className="font-poppins text-2xl font-bold text-neutral-900">Pipeline</h1>
          <p className="text-sm text-gray-500">
            {totalValue} opportunities{hotCount > 0 && ` · ${hotCount} hot`}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {eventTypes.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 min-w-[1100px] pb-4">
            {PIPELINE_COLUMNS.map((col) => (
              <PipelineColumn key={col.id} column={col} opps={columnData[col.id] || []} />
            ))}
          </div>
          <DragOverlay>
            {activeOpp && <PipelineCard opp={activeOpp} />}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
