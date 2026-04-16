/**
 * Tier 4, Item 14: Duplicate Warning Component
 *
 * Checks for existing records when email/phone changes in a form.
 * Shows a warning with links to the matching records.
 */
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

interface DuplicateMatch {
  type: string;
  id: number;
  name: string;
  email: string;
  status?: string;
}

interface DuplicateWarningProps {
  email?: string;
  phone?: string;
  excludeType?: string;  // e.g. "opportunity" to not show opp matches when creating an opp
  excludeId?: number;    // exclude the current record when editing
}

export default function DuplicateWarning({ email, phone, excludeType, excludeId }: DuplicateWarningProps) {
  const shouldCheck = (email && email.length > 4 && email.includes("@")) || (phone && phone.length >= 7);

  const { data } = useQuery<{ hasDuplicates: boolean; matches: DuplicateMatch[] }>({
    queryKey: ["/api/duplicates/check", email, phone],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (email) params.append("email", email);
      if (phone) params.append("phone", phone);
      const res = await fetch(`/api/duplicates/check?${params}`);
      if (!res.ok) return { hasDuplicates: false, matches: [] };
      return res.json();
    },
    enabled: !!shouldCheck,
    staleTime: 10000,
  });

  if (!data?.hasDuplicates) return null;

  // Filter out self and optionally same-type matches
  const matches = data.matches.filter(m => {
    if (excludeId && m.id === excludeId && m.type === excludeType) return false;
    return true;
  });

  if (matches.length === 0) return null;

  return (
    <Alert variant="destructive" className="border-amber-300 bg-amber-50 text-amber-900">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Possible duplicate found</AlertTitle>
      <AlertDescription>
        <div className="text-sm space-y-1 mt-1">
          {matches.map(m => {
            const href = m.type === "opportunity" ? `/opportunities/${m.id}` : `/clients/${m.id}`;
            return (
              <div key={`${m.type}-${m.id}`}>
                <Link href={href}>
                  <span className="underline cursor-pointer font-medium">{m.name}</span>
                </Link>
                {" "}({m.type}{m.status ? ` · ${m.status}` : ""}) — {m.email}
              </div>
            );
          })}
        </div>
      </AlertDescription>
    </Alert>
  );
}
