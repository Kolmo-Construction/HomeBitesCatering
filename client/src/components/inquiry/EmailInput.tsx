/**
 * Email input with typo suggestion via mailcheck.
 *
 * As the user types, we debounce a mailcheck run. When it spots a likely
 * typo ("gmial" → "gmail"), we surface a "Did you mean …?" hint under the
 * field with a one-click accept. The library catches ~80% of common domain
 * fat-fingers and is ~4KB.
 */
import { useEffect, useState } from "react";
import Mailcheck from "mailcheck";
import { Input } from "@/components/ui/input";

type Props = {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
};

export function EmailInput({ id, value, onChange, placeholder, className }: Props) {
  const [suggestion, setSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (!value || !value.includes("@")) {
      setSuggestion(null);
      return;
    }
    const handle = setTimeout(() => {
      Mailcheck.run({
        email: value,
        suggested: (s: { full: string }) => setSuggestion(s.full),
        empty: () => setSuggestion(null),
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [value]);

  return (
    <div className="space-y-1">
      <Input
        id={id}
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
      {suggestion && suggestion !== value && (
        <p className="text-xs text-amber-700">
          Did you mean{" "}
          <button
            type="button"
            onClick={() => {
              onChange(suggestion);
              setSuggestion(null);
            }}
            className="underline font-semibold hover:text-amber-900"
          >
            {suggestion}
          </button>
          ?
        </p>
      )}
    </div>
  );
}
