const EARTH_RADIUS_KM = 6371;

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

export function hasCoordinates(value) {
  return Number.isFinite(Number(value?.lat)) && Number.isFinite(Number(value?.lng));
}

export function calculateDistanceKm(origin, destination) {
  if (!hasCoordinates(origin) || !hasCoordinates(destination)) {
    return null;
  }

  const originLat = Number(origin.lat);
  const originLng = Number(origin.lng);
  const destinationLat = Number(destination.lat);
  const destinationLng = Number(destination.lng);
  const latDelta = toRadians(destinationLat - originLat);
  const lngDelta = toRadians(destinationLng - originLng);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(toRadians(originLat)) * Math.cos(toRadians(destinationLat)) * Math.sin(lngDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((EARTH_RADIUS_KM * c).toFixed(1));
}

export function attachDistance(warehouses, origin) {
  return (warehouses || []).map((warehouse) => ({
    ...warehouse,
    distanceKm: calculateDistanceKm(origin, warehouse),
  }));
}

export function withinRadius(distanceKm, radiusKm) {
  if (!Number.isFinite(Number(radiusKm))) {
    return true;
  }

  return Number.isFinite(Number(distanceKm)) && Number(distanceKm) <= Number(radiusKm);
}

export function sortByDistance(listings) {
  return [...(listings || [])].sort((first, second) => {
    const firstDistance = Number.isFinite(Number(first.distanceKm)) ? Number(first.distanceKm) : Number.POSITIVE_INFINITY;
    const secondDistance = Number.isFinite(Number(second.distanceKm)) ? Number(second.distanceKm) : Number.POSITIVE_INFINITY;
    return firstDistance - secondDistance;
  });
}

export function formatDistance(distanceKm) {
  if (!Number.isFinite(Number(distanceKm))) {
    return "";
  }

  const distance = Number(distanceKm);
  return `${distance < 10 ? distance.toFixed(1) : distance.toFixed(0)} km away`;
}
