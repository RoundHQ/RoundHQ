"use client";

import { useEffect, useRef } from "react";

type AddressParts = {
  formattedAddress: string;
  postcode: string;
  town: string;
  latitude: number | null;
  longitude: number | null;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelectAddress: (parts: AddressParts) => void;
  placeholder?: string;
  dataTour?: string;
};

declare global {
  interface Window {
    google?: any;
  }
}

export default function AddressAutocompleteInput({
                                                   value,
                                                   onChange,
                                                   onSelectAddress,
                                                   placeholder = "Start typing an address...",
                                                   dataTour,
                                                 }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (!window.google?.maps?.places || !inputRef.current) return;
    if (autocompleteRef.current) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["address"],
          componentRestrictions: { country: "gb" },
          fields: ["formatted_address", "address_components", "geometry"],
        }
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();

      const components: any[] = place?.address_components ?? [];

      const getComponent = (type: string) =>
          components.find((c) => c.types?.includes(type))?.long_name ?? "";

      const postcode = getComponent("postal_code");
      const town =
          getComponent("postal_town") ||
          getComponent("locality") ||
          getComponent("administrative_area_level_2");

      const formattedAddress =
          place?.formatted_address ?? inputRef.current?.value ?? "";

      const latitude =
          typeof place?.geometry?.location?.lat === "function"
              ? place.geometry.location.lat()
              : null;

      const longitude =
          typeof place?.geometry?.location?.lng === "function"
              ? place.geometry.location.lng()
              : null;

      onChange(formattedAddress);
      onSelectAddress({
        formattedAddress,
        postcode,
        town,
        latitude,
        longitude,
      });
    });
  }, [onChange, onSelectAddress]);

  return (
      <input
          ref={inputRef}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
          placeholder={placeholder}
          value={value}
          data-tour={dataTour}
          onChange={(e) => onChange(e.target.value)}
      />
  );
}
