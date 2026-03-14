import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { formatDistance, hasCoordinates } from "../locationUtils";

export default function MapView({ warehouses = [], labels, buyerLocation }) {
  const center = hasCoordinates(buyerLocation)
    ? [Number(buyerLocation.lat), Number(buyerLocation.lng)]
    : warehouses.length
      ? [Number(warehouses[0].lat), Number(warehouses[0].lng)]
      : [22.5726, 88.3639];

  const copy = {
    spaceTypeFallback: labels?.spaceTypeFallback || "storage space",
    available: labels?.available || "Available",
    categories: labels?.categories || "Categories",
    environment: labels?.environment || "Environment",
    general: labels?.general || "general",
    match: labels?.match || "Smart match",
    distance: labels?.distance || "Distance",
    book: labels?.book || "Book This Space",
  };

  const visibleWarehouses = warehouses.filter(hasCoordinates);

  return (
    <div className="map-frame">
      <MapContainer center={center} zoom={6} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {visibleWarehouses.map((warehouse) => (
          <Marker key={warehouse.id} position={[Number(warehouse.lat), Number(warehouse.lng)]}>
            <Popup>
              <div className="map-popup">
                <strong>{warehouse.name}</strong>
                <p>{warehouse.spaceType || copy.spaceTypeFallback}</p>
                <p>Rs {warehouse.pricePerSqft}/{warehouse.pricingUnit || "month"}</p>
                <p>{copy.available}: {warehouse.availableSqft || warehouse.sqft} sq ft</p>
                <p>{copy.categories}: {(warehouse.supportedCategories || warehouse.produces || []).join(", ")}</p>
                <p>{copy.environment}: {(warehouse.environmentTags || []).join(", ") || copy.general}</p>
                {Number.isFinite(Number(warehouse.distanceKm)) ? <p>{copy.distance}: {formatDistance(warehouse.distanceKm)}</p> : null}
                {warehouse.matchScore ? <p>{copy.match}: {warehouse.matchScore}%</p> : null}
                <Link className="button map-popup-button" to={`/book?warehouseId=${warehouse.id}`}>
                  {copy.book}
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
