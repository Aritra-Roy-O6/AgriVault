import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import ListingModal from "../components/ListingModal";
import MapView from "../components/MapView";
import WarehouseCard from "../components/WarehouseCard";
import { apiBaseUrl } from "../firebase";
import { attachDistance, hasCoordinates, sortByDistance, withinRadius } from "../locationUtils";
import { environmentTagOptions, scoreWarehouseMatch } from "../storageRules";
import { getCategoryLabel, supportedStorageCategories } from "../storageMath";

const RADIUS_OPTIONS = [10, 25, 50, 100, 250];

function normalizeEnvironmentValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace("cool", "cold");
}

function normalizeCategoryValue(value) {
  return String(value || "").trim().toLowerCase();
}

function parseMultiValue(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
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
    categories: parseMultiValue(searchParams.get("query")),
    location: searchParams.get("location") || "",
    environments: parseMultiValue(searchParams.get("environment")),
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

  const toggleFilterValue = (field, value) => {
    setFilters((current) => {
      const values = current[field] || [];
      const normalizedValue = field === "environments" ? normalizeEnvironmentValue(value) : normalizeCategoryValue(value);
      return {
        ...current,
        [field]: values.includes(normalizedValue)
          ? values.filter((item) => item !== normalizedValue)
          : [...values, normalizedValue],
      };
    });
  };

  const clearMultiFilters = () => {
    setFilters((current) => ({
      ...current,
      categories: [],
      environments: [],
    }));
  };

  const scoredListings = useMemo(() => {
    const withDistance = attachDistance(warehouses, buyerLocation);
    const filtered = withDistance
      .map((warehouse) => {
        const match = scoreWarehouseMatch(warehouse, filters.categories[0] || "", filters.location);
        return {
          ...warehouse,
          matchScore: match.score,
          matchReasons: match.reasons,
        };
      })
      .filter((warehouse) => {
        const listingCategories = [warehouse.supportedCategories, warehouse.produces]
          .flat()
          .map(normalizeCategoryValue)
          .filter(Boolean);
        const listingEnvironment = (warehouse.environmentTags || [])
          .map(normalizeEnvironmentValue)
          .filter(Boolean);
        const matchesCategory = !filters.categories.length || filters.categories.some((category) => listingCategories.includes(category));
        const matchesLocation = !filters.location || [warehouse.address, warehouse.pincode, warehouse.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(filters.location.toLowerCase());
        const matchesEnvironment = !filters.environments.length || filters.environments.some((environment) => listingEnvironment.includes(environment));
        const matchesSqft = !filters.minSqft || Number(warehouse.availableSqft || 0) >= Number(filters.minSqft);
        const matchesPrice = !filters.maxPrice || Number(warehouse.pricePerSqft || 0) <= Number(filters.maxPrice);
        const matchesRadius = !hasCoordinates(buyerLocation) || withinRadius(warehouse.distanceKm, radiusKm);
        return matchesCategory && matchesLocation && matchesEnvironment && matchesSqft && matchesPrice && matchesRadius;
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
    <main className="page fade-up search-shell">
      <section className="card card-compact">
        <p className="eyebrow">Search</p>
        <h2 style={{ marginBottom: "1rem" }}>Find storage that fits your goods</h2>
        <div className="search-toolbar-grid">
          <label className="field">
            Radius
            <select onChange={(event) => setRadiusKm(event.target.value)} value={radiusKm}>
              {RADIUS_OPTIONS.map((value) => (
                <option key={value} value={value}>{value} km</option>
              ))}
            </select>
          </label>
          <div className="actions compact-actions-row">
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

        <div className="search-filter-grid compact-search-grid search-filter-grid-multiselect">
          <fieldset className="field option-fieldset search-filter-span-two">
            <legend>Storage categories</legend>
            <div className="filter-group-header">
              <p className="field-hint">Choose one or more categories that match the goods you want to store.</p>
              {filters.categories.length ? (
                <span className="filter-count-chip">{filters.categories.length} selected</span>
              ) : null}
            </div>
            <div className="option-grid filter-option-grid">
              {supportedStorageCategories.map((category) => {
                const checked = filters.categories.includes(category);
                return (
                  <label className={`checkbox-item option-card filter-option-card${checked ? " active" : ""}`} key={category}>
                    <input
                      checked={checked}
                      onChange={() => toggleFilterValue("categories", category)}
                      type="checkbox"
                    />
                    <span>{getCategoryLabel(category)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="field option-fieldset search-filter-span-two">
            <legend>Environment tags</legend>
            <div className="filter-group-header">
              <p className="field-hint">Pick all storage conditions the space should support.</p>
              {filters.environments.length ? (
                <span className="filter-count-chip">{filters.environments.length} selected</span>
              ) : null}
            </div>
            <div className="option-grid filter-option-grid">
              {environmentTagOptions.map((option) => {
                const checked = filters.environments.includes(option.value);
                return (
                  <label className={`checkbox-item option-card filter-option-card${checked ? " active" : ""}`} key={option.value}>
                    <input
                      checked={checked}
                      onChange={() => toggleFilterValue("environments", option.value)}
                      type="checkbox"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label>
            Location
            <input
              onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}
              placeholder="Laxmi Nagar, Delhi"
              value={filters.location}
            />
          </label>
          <label>
            Minimum sq ft
            <input
              min="0"
              onChange={(event) => setFilters((current) => ({ ...current, minSqft: event.target.value }))}
              placeholder="250"
              type="number"
              value={filters.minSqft}
            />
          </label>
          <label>
            Max price / sq ft
            <input
              min="0"
              onChange={(event) => setFilters((current) => ({ ...current, maxPrice: event.target.value }))}
              placeholder="120"
              type="number"
              value={filters.maxPrice}
            />
          </label>
        </div>

        {filters.categories.length || filters.environments.length ? (
          <div className="filter-selection-bar">
            <div className="chip-row">
              {filters.categories.map((category) => (
                <span className="chip" key={category}>{getCategoryLabel(category)}</span>
              ))}
              {filters.environments.map((environment) => (
                <span className="check-chip" key={environment}>
                  {environmentTagOptions.find((option) => option.value === environment)?.label || environment}
                </span>
              ))}
            </div>
            <button className="button-ghost" onClick={clearMultiFilters} type="button">
              Clear category and environment filters
            </button>
          </div>
        ) : null}
      </section>

      <section className="page search-results-layout">
        <div style={{ display: "grid", gap: "14px", alignContent: "start" }}>
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

        <div className="card sticky-map-card" style={{ padding: 0, overflow: "hidden" }}>
          <MapView buyerLocation={buyerLocation} warehouses={scoredListings} />
        </div>
      </section>

      <ListingModal warehouse={selectedWarehouse} onBook={handleBook} onClose={() => setSelectedWarehouse(null)} />
    </main>
  );
}
