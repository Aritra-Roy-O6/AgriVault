import { formatDistance } from "../locationUtils";
import { getCategoryLabel } from "../storageMath";

function formatMoney(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function WarehouseCard({ warehouse, onBook, onOpen, labels }) {
  const totalSqft = warehouse.totalSqft || warehouse.sqft || 0;
  const availableSqft = warehouse.availableSqft || 0;
  const usedPct = totalSqft ? Math.round(((totalSqft - availableSqft) / totalSqft) * 100) : 0;
  const copy = {
    spaceTypeFallback: labels?.spaceTypeFallback || "storage space",
    conditionsFallback: labels?.conditionsFallback || "general conditions",
    available: labels?.available || "Available",
    full: labels?.full || "Full",
    price: labels?.price || "Price",
    match: labels?.match || "Match",
    occupancy: labels?.occupancy || "Occupancy",
    bestFor: labels?.bestFor || "Best for",
    rating: labels?.rating || "Rating",
    distance: labels?.distance || "Distance",
    details: labels?.details || "View Details",
    book: labels?.book || "Book This Space",
  };

  const ratingCount = Number(warehouse.ratingCount || 0);

  const handleOpen = () => {
    if (onOpen) {
      onOpen(warehouse);
    }
  };

  return (
    <div
      className={`card warehouse-card${onOpen ? " clickable-card" : ""}`}
      onClick={onOpen ? handleOpen : undefined}
      onKeyDown={onOpen ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpen();
        }
      } : undefined}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <div className="wcard-header">
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1 }}>
          <div className="wcard-meta">
            <p className="wcard-name">{warehouse.name}</p>
            <p className="wcard-address">{warehouse.address}</p>
            <p className="section-subtitle" style={{ margin: "6px 0 0" }}>
              {(warehouse.spaceType || copy.spaceTypeFallback)} · {(warehouse.environmentTags || []).join(", ") || copy.conditionsFallback}
            </p>
          </div>
        </div>
        <div style={{ display: "grid", gap: "8px", justifyItems: "end" }}><span className="listing-price-pill">{formatMoney(warehouse.pricePerSqft)}/{warehouse.pricingUnit || "month"}</span>{availableSqft > 0 ? <span className="badge status-confirmed">{copy.available}</span> : <span className="badge status-rejected">{copy.full}</span>}</div>
      </div>

      <div className="wcard-stats">
        <div className="wcard-stat">
          <span className="wcard-stat-label">{copy.available}</span>
          <span className="wcard-stat-value">{availableSqft} sq ft</span>
        </div>
        <div className="wcard-stat">
          <span className="wcard-stat-label">{copy.price}</span>
          <span className="wcard-stat-value">{formatMoney(warehouse.pricePerSqft)}/{warehouse.pricingUnit || "month"}</span>
        </div>
        {Number.isFinite(Number(warehouse.distanceKm)) ? (
          <div className="wcard-stat">
            <span className="wcard-stat-label">{copy.distance}</span>
            <span className="wcard-stat-value">{formatDistance(warehouse.distanceKm)}</span>
          </div>
        ) : null}
        {ratingCount > 0 ? (
          <div className="wcard-stat">
            <span className="wcard-stat-label">{copy.rating}</span>
            <span className="wcard-stat-value">{Number(warehouse.rating || 0).toFixed(1)}/5</span>
          </div>
        ) : null}
        {warehouse.matchScore ? (
          <div className="wcard-stat">
            <span className="wcard-stat-label">{copy.match}</span>
            <span className="wcard-stat-value">{warehouse.matchScore}%</span>
          </div>
        ) : null}
      </div>

      {(warehouse.supportedCategories || warehouse.produces || []).length ? (
        <div className="chip-row">
          {(warehouse.supportedCategories || warehouse.produces || []).slice(0, 6).map((category) => (
            <span className="chip" key={category}>{getCategoryLabel(category)}</span>
          ))}
        </div>
      ) : null}

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.73rem", marginBottom: "4px" }}>
          <span>{copy.occupancy}</span>
          <span>{usedPct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${usedPct}%` }} />
        </div>
      </div>

      {warehouse.matchReasons?.length ? (
        <p className="section-subtitle" style={{ margin: 0 }}>
          {copy.bestFor}: {warehouse.matchReasons.join(", ")}
        </p>
      ) : null}

      <div className="booking-card-actions" style={{ marginTop: "4px" }}>
        {onOpen ? (
          <button
            className="button-ghost"
            onClick={(event) => {
              event.stopPropagation();
              handleOpen();
            }}
            type="button"
          >
            {copy.details}
          </button>
        ) : null}
        {onBook && availableSqft > 0 ? (
          <button
            className="button"
            onClick={(event) => {
              event.stopPropagation();
              onBook(warehouse);
            }}
            type="button"
          >
            {copy.book}
          </button>
        ) : null}
      </div>
    </div>
  );
}

