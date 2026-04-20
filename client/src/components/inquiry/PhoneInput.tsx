/**
 * Phone input with as-you-type formatting via libphonenumber-js.
 *
 * Formats US/CA numbers to "(415) 555-2671" live as the user types. Shows a
 * red hint when the current value isn't parseable as a valid phone number,
 * but never blocks input — the server still normalizes via `normalizePhoneNumber`.
 */
import { useMemo } from "react";
import { AsYouType, isValidPhoneNumber } from "libphonenumber-js";
import { Input } from "@/components/ui/input";

type Props = {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  defaultCountry?: "US" | "CA" | "GB";
};

export function PhoneInput({
  id,
  value,
  onChange,
  placeholder,
  className,
  defaultCountry = "US",
}: Props) {
  // Format the displayed value as the user types. AsYouType keeps partial
  // input readable: "41" → "41", "415" → "415", "4155" → "(415) 5…".
  const displayValue = useMemo(() => {
    if (!value) return "";
    return new AsYouType(defaultCountry).input(value);
  }, [value, defaultCountry]);

  const isInvalid =
    value.replace(/\D/g, "").length >= 7 &&
    !isValidPhoneNumber(value, defaultCountry);

  return (
    <div className="space-y-1">
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        aria-invalid={isInvalid || undefined}
      />
      {isInvalid && (
        <p className="text-xs text-red-600">
          That doesn't look like a valid phone number yet.
        </p>
      )}
    </div>
  );
}
