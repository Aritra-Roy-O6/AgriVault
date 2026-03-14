import { createPortal } from "react-dom";
import { formatDistance } from "../locationUtils";
import { getCategoryLabel } from "../storageMath";
import { environmentTagOptions } from "../storageRules";

function normalizeEnvironmentValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace("cool", "cold");
}

function getEnvironmentLabel(value) {
  const normalized = normalizeEnvironmentValue(value);
  return environmentTagOptions.find((option) => option.value === normalized)?.label || value;
}

export default function ListingModal({ warehouse, onBook, onClose }) {
  if (!warehouse) {
    return null;
  }

  const categories = warehouse.supportedCategories || warehouse.produces || [];
  const environmentTags = warehouse.environmentTags || [];
  const ratingValue = Number(warehouse.rating || 0);
  const ratingCount = Number(warehouse.ratingCount || 0);

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="row-between" style={{ marginBottom: "12px" }}>
          <div>
            <p className="eyebrow">Listing Details</p>
            <h3 style={{ margin: 0 }}>{warehouse.name}</h3>
            <p className="section-subtitle" style={{ marginTop: "8px", marginBottom: 0 }}>
              {warehouse.address}
            </p>
          </div>
          <button className="button-ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="modal-detail-grid">
          <div className="receipt-meta booking-details-panel" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
            <div className="receipt-row"><span>Space Type</span><strong>{warehouse.spaceType || "storage space"}</strong></div>
            <div className="receipt-row"><span>Available Space</span><strong>{warehouse.availableSqft || 0} sq ft</strong></div>
            <div className="receipt-row"><span>Total Space</span><strong>{warehouse.sqft || warehouse.totalSqft || 0} sq ft</strong></div>
            <div className="receipt-row"><span>Height</span><strong>{Number(warehouse.heightFt || 10).toFixed(1)} ft</strong></div>
            <div className="receipt-row"><span>Price</span><strong>Rs {Number(warehouse.pricePerSqft || 0).toLocaleString("en-IN")}/{warehouse.pricingUnit || "month"}</strong></div>
            <div className="receipt-row"><span>Pincode</span><strong>{warehouse.pincode || "N/A"}</strong></div>
            {Number.isFinite(Number(warehouse.distanceKm)) ? (
              <div className="receipt-row"><span>Distance</span><strong>{formatDistance(warehouse.distanceKm)}</strong></div>
            ) : null}
            {ratingCount > 0 ? (
              <div className="receipt-row"><span>Rating</span><strong>{ratingValue.toFixed(1)} / 5 ({ratingCount})</strong></div>
            ) : null}
            {categories.length ? (
              <div className="listing-detail-block" style={{ marginTop: "14px" }}>
                <p className="listing-detail-label">Supported Categories</p>
                <div className="chip-row">
                  {categories.map((category) => (
                    <span className="chip" key={category}>{getCategoryLabel(category)}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {environmentTags.length ? (
              <div className="listing-detail-block" style={{ marginTop: "14px" }}>
                <p className="listing-detail-label">Environment Tags</p>
                <div className="check-chip-row">
                  {environmentTags.map((tag) => (
                    <span className="check-chip" key={tag}>{getEnvironmentLabel(tag)}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="modal-image-panel">
            {warehouse.locationImage?.url ? (
              <img alt="Storage location" className="modal-booking-image" src={warehouse.locationImage.url} />
            ) : (
              <div className="empty-state" style={{ padding: "24px 12px" }}>
                <span className="empty-state-icon">Image</span>
                <p className="empty-state-title">No location image</p>
                <p className="empty-state-sub">The owner has not uploaded a space photo yet.</p>
              </div>
            )}
          </div>
        </div>

        {onBook && Number(warehouse.availableSqft || 0) > 0 ? (
          <div className="booking-card-actions" style={{ marginTop: "16px" }}>
            <button className="button" onClick={() => onBook(warehouse)} type="button">
              Book This Space
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
