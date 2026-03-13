export default function WarehouseCard({ warehouse, onBook, labels }) {
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
    book: labels?.book || "Book This Space",
  };

  return (
    <div className="card warehouse-card">
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
        {availableSqft > 0 ? <span className="badge status-confirmed">{copy.available}</span> : <span className="badge status-rejected">{copy.full}</span>}
      </div>

      <div className="wcard-stats">
        <div className="wcard-stat">
          <span className="wcard-stat-label">{copy.available}</span>
          <span className="wcard-stat-value">{availableSqft} sq ft</span>
        </div>
        <div className="wcard-stat">
          <span className="wcard-stat-label">{copy.price}</span>
          <span className="wcard-stat-value">Rs {warehouse.pricePerSqft}/{warehouse.pricingUnit || "month"}</span>
        </div>
        {warehouse.matchScore ? (
          <div className="wcard-stat">
            <span className="wcard-stat-label">{copy.match}</span>
            <span className="wcard-stat-value">{warehouse.matchScore}%</span>
          </div>
        ) : null}
      </div>

      {(warehouse.supportedCategories || warehouse.produces || []).length ? (
        <div className="chip-row">
          {(warehouse.supportedCategories || warehouse.produces || []).slice(0, 4).map((category) => (
            <span className="chip" key={category}>{category}</span>
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

      {onBook && availableSqft > 0 ? (
        <button className="button" onClick={() => onBook(warehouse)} style={{ marginTop: "6px" }} type="button">
          {copy.book}
        </button>
      ) : null}
    </div>
  );
}
