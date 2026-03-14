import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import ListingModal from "../components/ListingModal";
import MapView from "../components/MapView";
import WarehouseCard from "../components/WarehouseCard";
import { apiBaseUrl } from "../firebase";
import { attachDistance, hasCoordinates, sortByDistance, withinRadius } from "../locationUtils";
import { defaultCategories, environmentTagOptions, scoreWarehouseMatch } from "../storageRules";

const RADIUS_OPTIONS = [10, 25, 50, 100, 250];

function normalizeEnvironmentValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace("cool", "cold");
}

export default function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyerLocation, setBuyerLocation] = useState(null);
  const [radiusKm, setRadiusKm] = useState(searchParams.get("radius") || "50");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [filters, setFilters] = useState({
    query: searchParams.get("query") || "",
    location: searchParams.get("location") || "",
    environment: searchParams.get("environment") || "",
    minSqft: searchParams.get("minSqft") || "",
    maxPrice: searchParams.get("maxPrice") || "",
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/warehouses`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load listings.");
        setWarehouses(data.warehouses || []);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const scoredListings = useMemo(() => {
    const withDistance = attachDistance(warehouses, buyerLocation);
    const filtered = withDistance
      .map((warehouse) => {
        const match = scoreWarehouseMatch(warehouse, filters.query, filters.location);
        return {
          ...warehouse,
          matchScore: match.score,
          matchReasons: match.reasons,
        };
      })
      .filter((warehouse) => {
        const matchesQuery = !filters.query || [warehouse.supportedCategories, warehouse.produces]
          .flat()
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(filters.query.toLowerCase());
        const matchesLocation = !filters.location || [warehouse.address, warehouse.pincode, warehouse.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(filters.location.toLowerCase());
        const matchesEnvironment = !filters.environment || (warehouse.environmentTags || [])
          .map(normalizeEnvironmentValue)
          .includes(normalizeEnvironmentValue(filters.environment));
        const matchesSqft = !filters.minSqft || Number(warehouse.availableSqft || 0) >= Number(filters.minSqft);
        const matchesPrice = !filters.maxPrice || Number(warehouse.pricePerSqft || 0) <= Number(filters.maxPrice);
        const matchesRadius = !hasCoordinates(buyerLocation) || withinRadius(warehouse.distanceKm, radiusKm);
        return matchesQuery && matchesLocation && matchesEnvironment && matchesSqft && matchesPrice && matchesRadius;
      });

    return hasCoordinates(buyerLocation)
      ? sortByDistance(filtered)
      : [...filtered].sort((a, b) => b.matchScore - a.matchScore);
  }, [buyerLocation, filters, radiusKm, warehouses]);

  const handleBook = (warehouse) => {
    setSelectedWarehouse(null);
    navigate(`/book?warehouseId=${warehouse.id}`);
  };

  const requestBuyerLocation = () => {
    if (!("geolocation" in navigator)) {
      const message = "Location is not supported on this device.";
      setLocationError(message);
      toast.error(message);
      return;
    }

    setLocationLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBuyerLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationLoading(false);
        toast.success("Listings are now sorted by distance.");
      },
      (error) => {
        const message = error.message || "Unable to access your location.";
        setLocationError(message);
        setLocationLoading(false);
        toast.error(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const clearBuyerLocation = () => {
    setBuyerLocation(null);
    setLocationError("");
  };

  return (
    <main className="page fade-up">
      <section className="card">
        <p className="eyebrow">Search</p>
        <h2>Find storage that fits your goods</h2>
        <div className="buyer-location-controls" style={{ marginBottom: "16px" }}>
          <label className="field">
            Radius
            <select onChange={(event) => setRadiusKm(event.target.value)} value={radiusKm}>
              {RADIUS_OPTIONS.map((value) => (
                <option key={value} value={value}>{value} km</option>
              ))}
            </select>
          </label>
          <div className="actions">
            <button className="button-secondary" disabled={locationLoading} onClick={requestBuyerLocation} type="button">
              {locationLoading ? "Locating..." : "Use My Location"}
            </button>
            {hasCoordinates(buyerLocation) ? (
              <button className="button-ghost" onClick={clearBuyerLocation} type="button">
                Clear
              </button>
            ) : null}
          </div>
          <div className="buyer-location-status">
            {hasCoordinates(buyerLocation)
              ? `Showing only listings within ${radiusKm} km and sorting by distance.`
              : "Grant location access to sort by distance and hide listings outside a chosen radius."}
            {locationError ? <span className="location-error-text"> {locationError}</span> : null}
          </div>
        </div>
        <div className="search-filter-grid">
          <label>
            Storage category
            <input
              list="storage-categories"
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="clothes, grains, electronics"
              value={filters.query}
            />
            <datalist id="storage-categories">
              {defaultCategories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </label>
          <label>
            Location
            <input
              onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}
              placeholder="Laxmi Nagar, Delhi"
              value={filters.location}
            />
          </label>
          <label>
            Environment
            <select onChange={(event) => setFilters((current) => ({ ...current, environment: event.target.value }))} value={filters.environment}>
              <option value="">Any</option>
              {environmentTagOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Minimum sq ft
            <input
              min="0"
              onChange={(event) => setFilters((current) => ({ ...current, minSqft: event.target.value }))}
              type="number"
              value={filters.minSqft}
            />
          </label>
          <label>
            Max price / sq ft
            <input
              min="0"
              onChange={(event) => setFilters((current) => ({ ...current, maxPrice: event.target.value }))}
              type="number"
              value={filters.maxPrice}
            />
          </label>
        </div>
      </section>

      <section className="page two-column">
        <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
          <p className="section-subtitle">
            {loading
              ? "Loading matching spaces..."
              : hasCoordinates(buyerLocation)
                ? `${scoredListings.length} listing${scoredListings.length === 1 ? "" : "s"} within ${radiusKm} km`
                : `${scoredListings.length} listing${scoredListings.length === 1 ? "" : "s"} matched`}
          </p>
          {loading ? (
            <>
              <div className="skeleton" style={{ height: "170px", borderRadius: "16px" }} />
              <div className="skeleton" style={{ height: "170px", borderRadius: "16px" }} />
            </>
          ) : scoredListings.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon">Search</span>
                <p className="empty-state-title">No matching storage found</p>
                <p className="empty-state-sub">
                  {hasCoordinates(buyerLocation)
                    ? `Try a wider radius than ${radiusKm} km or relax a filter.`
                    : "Try a broader location, category, or environment filter."}
                </p>
              </div>
            </div>
          ) : (
            scoredListings.map((warehouse) => (
              <WarehouseCard key={warehouse.id} onBook={handleBook} onOpen={setSelectedWarehouse} warehouse={warehouse} />
            ))
          )}
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <MapView buyerLocation={buyerLocation} warehouses={scoredListings} />
        </div>
      </section>

      <ListingModal warehouse={selectedWarehouse} onBook={handleBook} onClose={() => setSelectedWarehouse(null)} />
    </main>
  );
}
