"use client";

import {
  GoogleMap,
  Marker,
  InfoWindow,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";
import { useEffect, useMemo, useRef, useState } from "react";

type Customer = {
  id: number;
  name: string;
  address: string;
  price: number | null;
  day?: string;
  lat?: number | null;
  lng?: number | null;
};

const libraries: ("places")[] = ["places"];

export default function MapView({
  customers,
  focusedCustomerId,
}: {
  customers: Customer[];
  onOptimisedOrder?: (orderedCustomerIds: number[]) => void;
  focusedCustomerId?: number | null;
}) {
  const [selected, setSelected] = useState<Customer | null>(null);
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const validStops = useMemo(
    () =>
      customers.filter(
        (c) => typeof c.lat === "number" && typeof c.lng === "number"
      ),
    [customers]
  );

  const center = useMemo(() => {
    if (validStops.length > 0) {
      return {
        lat: validStops[0].lat as number,
        lng: validStops[0].lng as number,
      };
    }

    return {
      lat: 55.764,
      lng: -4.176,
    };
  }, [validStops]);

  useEffect(() => {
    if (!isLoaded || !window.google?.maps) return;

    if (validStops.length < 2) {
      setDirections(null);
      return;
    }

    const origin = validStops[0];
    const destination = validStops[validStops.length - 1];
    const middleStops = validStops.slice(1, -1);

    const waypoints = middleStops.map((stop) => ({
      location: {
        lat: stop.lat as number,
        lng: stop.lng as number,
      },
      stopover: true,
    }));

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
        {
          origin: {
            lat: origin.lat as number,
            lng: origin.lng as number,
          },
          destination: {
            lat: destination.lat as number,
            lng: destination.lng as number,
          },
          waypoints,
          optimizeWaypoints: false,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (
            result: google.maps.DirectionsResult | null,
            status: google.maps.DirectionsStatus
        ) => {
          if (status === "OK" && result) {
            setDirections(result);
          } else {
            console.error("Directions request failed:", status);
          }
        }
    );
  }, [isLoaded, validStops]);

  useEffect(() => {
    setSelected(null);
  }, [customers]);

  useEffect(() => {
    if (!mapRef.current || !focusedCustomerId) return;

    const focused = validStops.find((c) => c.id === focusedCustomerId);
    if (focused?.lat == null || focused?.lng == null) return;

    mapRef.current.panTo({ lat: focused.lat, lng: focused.lng });
    mapRef.current.setZoom(15);
    setSelected(focused);
  }, [focusedCustomerId, validStops]);

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load Google Maps.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">
        Loading map...
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{
        width: "100%",
        height: "550px",
        borderRadius: "16px",
      }}
      center={center}
      zoom={12}
      onLoad={(map) => {
        mapRef.current = map;
      }}
      onUnmount={() => {
        mapRef.current = null;
      }}
    >
      {validStops.map((customer) => (
        <Marker
          key={customer.id}
          position={{
            lat: customer.lat as number,
            lng: customer.lng as number,
          }}
          onClick={() => setSelected(customer)}
          title={customer.name}
        />
      ))}

      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: false,
            polylineOptions: {
              strokeColor: "#2f5d60",
              strokeWeight: 5,
            },
          }}
        />
      )}

      {selected && selected.lat != null && selected.lng != null && (
        <InfoWindow
          position={{ lat: selected.lat, lng: selected.lng }}
          onCloseClick={() => setSelected(null)}
        >
          <div className="p-1">
            <h3 className="font-semibold">{selected.name}</h3>
            <p className="text-sm text-slate-600">{selected.address}</p>
            <p className="mt-1 text-sm">£{selected.price}</p>
            {selected.day ? (
              <p className="mt-1 text-xs text-slate-500">{selected.day} round</p>
            ) : null}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}