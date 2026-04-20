/**
 * Address autocomplete powered by Google Places (when `VITE_GOOGLE_MAPS_API_KEY`
 * is set). Falls back to a plain Input when the key is missing so the form
 * keeps working in dev without the API wired up.
 *
 * Emits parsed address parts via `onSelect` in addition to the raw string, so
 * the caller can fill city/state/zip fields from one pick.
 */
/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Input } from "@/components/ui/input";

export type AddressParts = {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
};

type Props = {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  onSelect?: (parts: AddressParts) => void;
  placeholder?: string;
  className?: string;
};

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

// One-shot configuration — setOptions must run before the first importLibrary.
let optionsSet = false;
function configureLoader() {
  if (optionsSet || !API_KEY) return;
  setOptions({ key: API_KEY, libraries: ["places"] });
  optionsSet = true;
}

function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined,
): Omit<AddressParts, "placeId" | "lat" | "lng"> {
  const byType = (type: string) =>
    components?.find((c) => c.types.includes(type))?.long_name ?? "";
  const streetNumber = byType("street_number");
  const route = byType("route");
  const street = [streetNumber, route].filter(Boolean).join(" ");
  return {
    street,
    city: byType("locality") || byType("postal_town") || byType("sublocality"),
    state: byType("administrative_area_level_1"),
    zip: byType("postal_code"),
    country: byType("country"),
  };
}

export function AddressAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  placeholder,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!API_KEY || !inputRef.current) return;
    configureLoader();

    let autocomplete: google.maps.places.Autocomplete | null = null;
    let disposed = false;

    importLibrary("places")
      .then((places) => {
        if (disposed || !inputRef.current) return;
        autocomplete = new places.Autocomplete(inputRef.current, {
          types: ["address"],
          fields: ["address_components", "formatted_address", "place_id", "geometry"],
        });
        setReady(true);
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete?.getPlace();
          if (!place) return;
          const parts = parseAddressComponents(place.address_components);
          const formatted = place.formatted_address || parts.street;
          onChange(formatted);
          onSelect?.({
            ...parts,
            placeId: place.place_id ?? null,
            lat: place.geometry?.location?.lat() ?? null,
            lng: place.geometry?.location?.lng() ?? null,
          });
        });
      })
      .catch((err: unknown) => {
        console.warn("[AddressAutocomplete] Google Places failed to load", err);
      });

    return () => {
      disposed = true;
      if (autocomplete) google.maps.event.clearInstanceListeners(autocomplete);
    };
    // Setup is one-shot; `onChange`/`onSelect` captured by closures in the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Input
      id={id}
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete={API_KEY ? "off" : "street-address"}
      data-places-ready={ready || undefined}
    />
  );
}
