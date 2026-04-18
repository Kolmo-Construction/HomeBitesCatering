/**
 * Tier 3, Item 9: Quote Version History
 *
 * Shows all past versions of a proposal with timestamps, who changed it,
 * and pricing diffs between versions.
 */
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { History, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { useState } from "react";

interface QuoteVersion {
  id: number;
  quoteId: number;
  version: number;
  proposal: any;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  changeNote: string | null;
  changedBy: number | null;
  createdAt: string;
}

interface VersionHistoryData {
  currentVersion: number;
  versions: QuoteVersion[];
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PriceDiff({ label, oldCents, newCents }: { label: string; oldCents: number; newCents: number }) {
  if (oldCents === newCents) return null;
  const diff = newCents - oldCents;
  const isUp = diff > 0;
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-gray-500">{label}:</span>
      <span className="text-gray-400 line-through">{formatCents(oldCents)}</span>
      <ArrowRight className="h-3 w-3 text-gray-400" />
      <span className={cn("font-medium", isUp ? "text-red-500" : "text-green-600")}>
        {formatCents(newCents)}
      </span>
      <span className={cn("text-[10px]", isUp ? "text-red-400" : "text-green-500")}>
        ({isUp ? "+" : ""}{formatCents(diff)})
      </span>
    </div>
  );
}

export default function VersionHistory({ quoteId, currentTotal }: { quoteId: number; currentTotal?: number }) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery<VersionHistoryData>({
    queryKey: ["/api/quotes", quoteId, "versions"],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/${quoteId}/versions`);
      if (!res.ok) throw new Error("Failed to fetch versions");
      return res.json();
    },
    enabled: !!quoteId,
  });

  if (isLoading || !data || data.versions.length === 0) return null;

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <History className="h-4 w-4 text-gray-500" />
            Version History
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              v{data.currentVersion}
            </Badge>
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            {data.versions.length} revision{data.versions.length !== 1 ? "s" : ""}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </span>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {/* Current version (live) */}
            <div className="flex items-start gap-3 p-2 rounded bg-green-50 border border-green-200">
              <Badge className="bg-green-600 text-white shrink-0 mt-0.5">v{data.currentVersion}</Badge>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Current version (live)</div>
                {currentTotal !== undefined && (
                  <div className="text-xs text-gray-600">Total: {formatCents(currentTotal)}</div>
                )}
              </div>
            </div>

            {/* Past versions */}
            {data.versions.map((ver, i) => {
              const nextVer = i > 0 ? data.versions[i - 1] : null;
              const nextTotal = nextVer ? nextVer.totalCents : (currentTotal ?? ver.totalCents);

              return (
                <div key={ver.id} className="flex items-start gap-3 p-2 rounded border border-gray-100">
                  <Badge variant="outline" className="shrink-0 mt-0.5">v{ver.version}</Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        {format(new Date(ver.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    </div>
                    {ver.changeNote && (
                      <div className="text-xs text-gray-600 italic mt-0.5">"{ver.changeNote}"</div>
                    )}
                    <div className="mt-1">
                      <PriceDiff label="Total" oldCents={ver.totalCents} newCents={nextTotal} />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Total at this version: {formatCents(ver.totalCents)}
                    </div>

                    {/* Guest count / menu changes */}
                    {ver.proposal && nextVer?.proposal && (
                      <div className="mt-1 space-y-0.5">
                        {ver.proposal.guestCount !== nextVer.proposal.guestCount && (
                          <div className="text-xs text-gray-500">
                            Guests: {ver.proposal.guestCount} → {nextVer.proposal.guestCount}
                          </div>
                        )}
                        {ver.proposal.menuTier !== nextVer.proposal.menuTier && (
                          <div className="text-xs text-gray-500">
                            Tier: {ver.proposal.menuTier} → {nextVer.proposal.menuTier}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
