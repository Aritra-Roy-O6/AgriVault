import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function MapView({ warehouses = [], labels }) {
  const center = warehouses.length
    ? [warehouses[0].lat, warehouses[0].lng]
    : [22.5726, 88.3639];

  const copy = {
    spaceTypeFallback: labels?.spaceTypeFallback || "storage space",
    available: labels?.available || "Available",
    categories: labels?.categories || "Categories",
    environment: labels?.environment || "Environment",
    general: labels?.general || "general",
    match: labels?.match || "Smart match",
    book: labels?.book || "Book This Space",
  };

  return (
    <div className="map-frame">
      <MapContainer center={center} zoom={6} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {warehouses.map((warehouse) => (
          <Marker key={warehouse.id} position={[warehouse.lat, warehouse.lng]}>
            <Popup>
              <div className="map-popup">
                <strong>{warehouse.name}</strong>
                <p>{warehouse.spaceType || copy.spaceTypeFallback}</p>
                <p>Rs {warehouse.pricePerSqft}/{warehouse.pricingUnit || "month"}</p>
                <p>{copy.available}: {warehouse.availableSqft || warehouse.sqft} sq ft</p>
                <p>{copy.categories}: {(warehouse.supportedCategories || warehouse.produces || []).join(", ")}</p>
                <p>{copy.environment}: {(warehouse.environmentTags || []).join(", ") || copy.general}</p>
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
