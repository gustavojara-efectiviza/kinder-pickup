export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeofenceConfig {
  schoolCoords: Coordinates;
  onTheWayRadiusMeters: number; // Por defecto: 800m
  arrivedRadiusMeters: number; // Por defecto: 80m
}

// Coordenadas base por defecto (Lambaré, Paraguay - modificable vía config)
export const DEFAULT_GEOFENCE_CONFIG: GeofenceConfig = {
  schoolCoords: {
    latitude: -25.3435,
    longitude: -57.608,
  },
  onTheWayRadiusMeters: 800,
  arrivedRadiusMeters: 80,
};

// Fórmula de Haversine para cálculo de distancia en metros
export function calculateDistanceMeters(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const rad = Math.PI / 180;

  const lat1 = coord1.latitude * rad;
  const lat2 = coord2.latitude * rad;
  const deltaLat = (coord2.latitude - coord1.latitude) * rad;
  const deltaLon = (coord2.longitude - coord1.longitude) * rad;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Estimación simple de ETA en minutos asumiendo velocidad urbana (25 km/h)
export function estimateEtaMinutes(distanceMeters: number): number {
  const averageSpeedMetersPerMin = (25 * 1000) / 60; // ~416 m/min
  return Math.max(1, Math.ceil(distanceMeters / averageSpeedMetersPerMin));
}

// Máquina de estados de geocerca
export type GeoTransition = "NO_CHANGE" | "TRIGGER_ON_THE_WAY" | "TRIGGER_ARRIVED";

export function evaluateGeofenceTransition(
  currentDistance: number,
  currentStatus: string,
  config: GeofenceConfig = DEFAULT_GEOFENCE_CONFIG
): GeoTransition {
  if (currentStatus === "DISMISSED") return "NO_CHANGE";

  // Zona de puerta / vereda
  if (currentDistance <= config.arrivedRadiusMeters) {
    if (currentStatus !== "ARRIVED") return "TRIGGER_ARRIVED";
    return "NO_CHANGE";
  }

  // Zona de aproximación / en camino
  if (currentDistance <= config.onTheWayRadiusMeters) {
    if (currentStatus === "PRESENT" || currentStatus === "ABSENT") {
      return "TRIGGER_ON_THE_WAY";
    }
    return "NO_CHANGE";
  }

  return "NO_CHANGE";
}
