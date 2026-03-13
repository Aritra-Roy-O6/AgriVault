export default function WarehouseCard({ warehouse, onBook }) {
  const totalSqft = warehouse.totalSqft || warehouse.sqft || 0;
  const availableSqft = warehouse.availableSqft || 0;
  const usedPct = totalSqft ? Math.round(((totalSqft - availableSqft) / totalSqft) * 100) : 0;

  return (
    <div className="card warehouse-card">
      <div className="wcard-header">
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1 }}>
          <div className="wcard-meta">
            <p className="wcard-name">{warehouse.name}</p>
            <p className="wcard-address">{warehouse.address}</p>
          </div>
        </div>
        {availableSqft > 0 ? <span className="badge status-confirmed">Available</span> : <span className="badge status-rejected">Full</span>}
      </div>

      <div className="wcard-stats">
        <div className="wcard-stat">
          <span className="wcard-stat-label">Available</span>
          <span className="wcard-stat-value">{availableSqft} sq ft</span>
        </div>
        <div className="wcard-stat">
          <span className="wcard-stat-label">Total</span>
          <span className="wcard-stat-value">{totalSqft} sq ft</span>
        </div>
        {warehouse.pincode ? (
          <div className="wcard-stat">
            <span className="wcard-stat-label">Pincode</span>
            <span className="wcard-stat-value">{warehouse.pincode}</span>
          </div>
        ) : null}
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.73rem", marginBottom: "4px" }}>
          <span>Occupancy</span>
          <span>{usedPct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${usedPct}%` }} />
        </div>
      </div>

      {onBook && availableSqft > 0 ? (
        <button className="button" onClick={() => onBook(warehouse)} style={{ marginTop: "6px" }} type="button">
          Book This Space
        </button>
      ) : null}
    </div>
  );
}