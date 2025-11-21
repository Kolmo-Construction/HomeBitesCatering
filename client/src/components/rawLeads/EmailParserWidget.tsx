import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface ParsedLead {
  id: number;
  prospectName: string;
  prospectEmail: string;
  prospectPhone: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  venue: string;
  summary: string;
  quality: string;
  receivedAt: string;
}

export function EmailParserWidget() {
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['/api/email-parser/available-leads'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: selectedLeadData } = useQuery({
    queryKey: ['/api/email-parser/lead-form-data', selectedLeadId],
    enabled: !!selectedLeadId
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/email-parser/sync-now'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-parser/available-leads'] });
    }
  });

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'hot':
        return <Badge className="bg-red-500">Hot Lead</Badge>;
      case 'warm':
        return <Badge className="bg-orange-500">Warm Lead</Badge>;
      case 'cold':
        return <Badge className="bg-blue-500">Cold Lead</Badge>;
      default:
        return <Badge>Nurture</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-[#8B7355]" />
              <div>
                <CardTitle>Email Lead Parser</CardTitle>
                <CardDescription>
                  Parse emails from interface@eathomebites.com
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              size="sm"
              className="bg-[#8B7355] hover:bg-[#6B5345]"
            >
              {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <p className="text-sm text-neutral-500">Loading parsed emails...</p>
          ) : leads.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No new emails to parse</p>
              <Button
                onClick={() => syncMutation.mutate()}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Check Now
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {leads.map((lead: ParsedLead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={`p-3 border rounded-lg cursor-pointer transition ${
                    selectedLeadId === lead.id
                      ? 'border-[#8B7355] bg-[#8B7355]/5'
                      : 'border-neutral-200 hover:border-[#8B7355]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{lead.prospectName}</p>
                      <p className="text-xs text-neutral-500">{lead.prospectEmail}</p>
                    </div>
                    {getQualityBadge(lead.quality)}
                  </div>
                  <p className="text-xs text-neutral-600 line-clamp-2">{lead.summary}</p>
                  <div className="flex items-center space-x-3 mt-2 text-xs text-neutral-500">
                    <span>{lead.eventType}</span>
                    <span>•</span>
                    <span>{lead.guestCount} guests</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLeadData && (
        <Card className="border-[#8B7355]">
          <CardHeader className="bg-[#8B7355]/5">
            <CardTitle className="text-lg">Lead Details & Pre-Fill Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-neutral-600">Name</label>
                <p className="text-sm font-medium">{selectedLeadData.prospectName}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-600">Email</label>
                <p className="text-sm font-medium">{selectedLeadData.prospectEmail}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-600">Phone</label>
                <p className="text-sm">{selectedLeadData.prospectPhone || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-600">Event Type</label>
                <p className="text-sm">{selectedLeadData.eventType}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-600">Date</label>
                <p className="text-sm">{selectedLeadData.eventDate}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-600">Guests</label>
                <p className="text-sm">{selectedLeadData.guestCount}</p>
              </div>
            </div>

            {selectedLeadData.keyRequirements?.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-neutral-600 flex items-center space-x-1 mb-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span>Key Requirements</span>
                </label>
                <div className="space-y-1">
                  {selectedLeadData.keyRequirements.map((req: string, i: number) => (
                    <p key={i} className="text-sm text-neutral-700">• {req}</p>
                  ))}
                </div>
              </div>
            )}

            {selectedLeadData.potentialRedFlags?.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-neutral-600 flex items-center space-x-1 mb-2">
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  <span>Potential Concerns</span>
                </label>
                <div className="space-y-1">
                  {selectedLeadData.potentialRedFlags.map((flag: string, i: number) => (
                    <p key={i} className="text-sm text-neutral-700">• {flag}</p>
                  ))}
                </div>
              </div>
            )}

            {selectedLeadData.budget && (
              <div>
                <label className="text-xs font-semibold text-neutral-600">Budget</label>
                <p className="text-sm font-medium">${selectedLeadData.budget.toLocaleString()}</p>
              </div>
            )}

            {selectedLeadData.suggestedNextStep && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <label className="text-xs font-semibold text-blue-900 block mb-1">
                  <Zap className="h-3 w-3 inline mr-1" />
                  Suggested Next Step
                </label>
                <p className="text-sm text-blue-900">{selectedLeadData.suggestedNextStep}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
