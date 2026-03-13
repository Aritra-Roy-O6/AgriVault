import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import MapView from "../components/MapView";
import WarehouseCard from "../components/WarehouseCard";
import { apiBaseUrl } from "../firebase";
import { defaultCategories, scoreWarehouseMatch } from "../storageRules";

export default function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
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
    return warehouses
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
          .map((item) => item.toLowerCase())
          .includes(filters.environment.toLowerCase());
        const matchesSqft = !filters.minSqft || Number(warehouse.availableSqft || 0) >= Number(filters.minSqft);
        const matchesPrice = !filters.maxPrice || Number(warehouse.pricePerSqft || 0) <= Number(filters.maxPrice);
        return matchesQuery && matchesLocation && matchesEnvironment && matchesSqft && matchesPrice;
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [filters, warehouses]);

  const handleBook = (warehouse) => {
    navigate(`/book?warehouseId=${warehouse.id}`);
  };

  return (
    <main className="page fade-up">
      <section className="card">
        <p className="eyebrow">Search</p>
        <h2>Find storage that fits your goods</h2>
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
              <option value="dry">Dry</option>
              <option value="cool">Cool</option>
              <option value="covered">Covered</option>
              <option value="secure">Secure</option>
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
            {loading ? "Loading matching spaces..." : `${scoredListings.length} listing${scoredListings.length === 1 ? "" : "s"} matched`}
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
                <p className="empty-state-sub">Try a broader location, category, or environment filter.</p>
              </div>
            </div>
          ) : (
            scoredListings.map((warehouse) => (
              <WarehouseCard key={warehouse.id} onBook={handleBook} warehouse={warehouse} />
            ))
          )}
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <MapView warehouses={scoredListings} />
        </div>
      </section>
    </main>
  );
}
