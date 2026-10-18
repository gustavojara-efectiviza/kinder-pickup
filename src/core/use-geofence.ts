"use client";

import { useState, useEffect, useRef } from "react";
import {
  Coordinates,
  GeofenceConfig,
  DEFAULT_GEOFENCE_CONFIG,
  calculateDistanceMeters,
  evaluateGeofenceTransition,
  estimateEtaMinutes,
  GeoTransition,
} from "./geo";

interface UseGeofenceOptions {
  config?: GeofenceConfig;
  currentStatus: string;
  onStateChange: (newState: "ON_THE_WAY" | "ARRIVED", distance: number, eta: number) => void;
  enabled?: boolean;
}

export function useGeofence({
  config = DEFAULT_GEOFENCE_CONFIG,
  currentStatus,
  onStateChange,
  enabled = true,
}: UseGeofenceOptions) {
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [watchError, setWatchError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState<boolean>(false);

  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  });

  const unsupported =
    typeof window !== "undefined" && !("geolocation" in navigator);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy: posAccuracy } = position.coords;
        setAccuracy(Math.round(posAccuracy));
        setWatchError(null);

        // Filtrar mediciones con margen de error excesivo
        if (posAccuracy > 80) return;

        const currentPos: Coordinates = { latitude, longitude };
        const dist = calculateDistanceMeters(currentPos, config.schoolCoords);
        const calculatedEta = estimateEtaMinutes(dist);

        setDistance(dist);
        setEta(calculatedEta);

        const transition: GeoTransition = evaluateGeofenceTransition(dist, currentStatus, config);

        if (transition === "TRIGGER_ARRIVED") {
          onStateChangeRef.current("ARRIVED", dist, calculatedEta);
        } else if (transition === "TRIGGER_ON_THE_WAY") {
          onStateChangeRef.current("ON_THE_WAY", dist, calculatedEta);
        }
      },
      (err) => {
        setWatchError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    setIsWatching(true);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsWatching(false);
    };
  }, [enabled, currentStatus, config]);

  const error = unsupported ? "Geolocalización no soportada" : watchError;

  return { distance, eta, accuracy, error, isWatching: enabled && isWatching };
}
