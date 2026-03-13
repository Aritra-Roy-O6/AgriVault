import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function MapView({ warehouses = [] }) {
  const center = warehouses.length
    ? [warehouses[0].lat, warehouses[0].lng]
    : [22.5726, 88.3639];

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
                <p>?{warehouse.pricePerSqft}/sq ft/month</p>
                <p>Available: {warehouse.availableSqft || warehouse.sqft} sq ft</p>
                <p>Accepted: {(warehouse.produces || []).join(", ")}</p>
                <p>Rating: {warehouse.rating || 4.6}</p>
                <Link className="button map-popup-button" to={`/book?warehouseId=${warehouse.id}`}>
                  Book This Space
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}