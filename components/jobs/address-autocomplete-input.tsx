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

type GoogleAddressComponent = {
  long_name?: string;
  types?: string[];
};

type GooglePlace = {
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
  geometry?: {
    location?: {
      lat?: () => number;
      lng?: () => number;
    };
  };
};

type GooglePlacesAutocomplete = {
  addListener: (eventName: "place_changed", listener: () => void) => void;
  getPlace: () => GooglePlace;
};

type GooglePlacesAutocompleteConstructor = new (
  input: HTMLInputElement,
  options: {
    types: string[];
    componentRestrictions: { country: string };
    fields: string[];
  }
) => GooglePlacesAutocomplete;

declare global {
  interface Window {
    // Other map components declare this global for the Google Maps loader.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
    __roundhqAddressAutocompleteInteracting?: boolean;
  }
}

const GOOGLE_PLACES_STYLE_ID = "roundhq-google-places-autocomplete-style";

function markAddressAutocompleteInteraction() {
  window.__roundhqAddressAutocompleteInteracting = true;
  window.setTimeout(() => {
    window.__roundhqAddressAutocompleteInteracting = false;
  }, 600);
}

export default function AddressAutocompleteInput({
                                                   value,
                                                   onChange,
                                                   onSelectAddress,
                                                   placeholder = "Start typing an address...",
                                                 dataTour,
                                               }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<GooglePlacesAutocomplete | null>(null);

  useEffect(() => {
    if (document.getElementById(GOOGLE_PLACES_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = GOOGLE_PLACES_STYLE_ID;
    style.textContent = `
      .pac-container {
        z-index: 2147483647 !important;
        pointer-events: auto !important;
        touch-action: manipulation;
      }

      .pac-container .pac-item {
        cursor: pointer;
        min-height: 44px;
        padding-top: 8px;
        padding-bottom: 8px;
      }
    `;

    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    function handlePlacesPointer(event: MouseEvent | PointerEvent | TouchEvent) {
      const target = event.target;

      if (target instanceof HTMLElement && target.closest(".pac-container")) {
        markAddressAutocompleteInteraction();
      }
    }

    document.addEventListener("pointerdown", handlePlacesPointer, true);
    document.addEventListener("mousedown", handlePlacesPointer, true);
    document.addEventListener("touchstart", handlePlacesPointer, true);

    return () => {
      document.removeEventListener("pointerdown", handlePlacesPointer, true);
      document.removeEventListener("mousedown", handlePlacesPointer, true);
      document.removeEventListener("touchstart", handlePlacesPointer, true);
    };
  }, []);

  useEffect(() => {
    const googlePlaces = (
      window.google as
        | {
            maps?: {
              places?: {
                Autocomplete: GooglePlacesAutocompleteConstructor;
              };
            };
          }
        | undefined
    )?.maps?.places;

    if (!googlePlaces || !inputRef.current) return;
    if (autocompleteRef.current) return;

    autocompleteRef.current = new googlePlaces.Autocomplete(
        inputRef.current,
        {
          types: ["address"],
          componentRestrictions: { country: "gb" },
          fields: ["formatted_address", "address_components", "geometry"],
        }
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();

      const components = place?.address_components ?? [];

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
          autoComplete="off"
          enterKeyHint="search"
          data-tour={dataTour}
          onChange={(e) => onChange(e.target.value)}
      />
  );
}
