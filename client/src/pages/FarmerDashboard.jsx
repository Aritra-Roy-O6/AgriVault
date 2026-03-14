import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { apiBaseUrl, getAuthHeaders } from "../firebase";
import ListingModal from "../components/ListingModal";
import MapView from "../components/MapView";
import RatingInput from "../components/RatingInput";
import WarehouseCard from "../components/WarehouseCard";
import { attachDistance, hasCoordinates, sortByDistance, withinRadius } from "../locationUtils";

const RADIUS_OPTIONS = [10, 25, 50, 100, 250];

function canOpenReceipt(status) {
  return ["confirmed", "completed"].includes(status);
}

export default function FarmerDashboard({ loading: sessionLoading, user }) {
  const navigate = useNavigate();
  // Doc 4: destructure i18n for language switching
  const { t, i18n } = useTranslation("farmer");

  const [activeTab, setActiveTab] = useState("storage");
  const [warehouses, setWarehouses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadingWh, setLoadingWh] = useState(true);
  const [loadingBk, setLoadingBk] = useState(false);
  const [buyerLocation, setBuyerLocation] = useState(null);
  const [radiusKm, setRadiusKm] = useState("50");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  // Doc 3: modal state for listing detail view
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  // Doc 3: tracks which booking is currently being rated
  const [ratingBookingId, setRatingBookingId] = useState(null);

  // Doc 4: restore persisted language on mount
  useEffect(() => {
    const stored = localStorage.getItem("farmerLanguage") || "en";
    if (i18n.language !== stored) {
      i18n.changeLanguage(stored);
    }
  }, [i18n]);

  // Load all produce-compatible warehouses
  useEffect(() => {
    (async () => {
      setLoadingWh(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/warehouses`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load warehouses.");
        setWarehouses(
          (data.warehouses || []).filter((warehouse) =>
            (warehouse.supportedCategories || warehouse.produces || []).some((item) =>
              ["grains", "fruits", "vegetables", "produce", "wheat", "rice", "pulses"].includes(
                String(item).toLowerCase()
              )
            )
          )
        );
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoadingWh(false);
      }
    })();
  }, []);

  // Load farmer's bookings when that tab is active
  useEffect(() => {
    if (sessionLoading || !user || activeTab !== "bookings") {
      return;
    }

    (async () => {
      setLoadingBk(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${apiBaseUrl}/api/bookings/farmer/${user.uid}`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load bookings.");
        setBookings(data.bookings || []);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoadingBk(false);
      }
    })();
  }, [activeTab, sessionLoading, user]);

  const sortedBookings = useMemo(
    () => [...bookings].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [bookings]
  );

  const nearbyWarehouses = useMemo(() => {
    const withDistance = attachDistance(warehouses, buyerLocation);
    if (!hasCoordinates(buyerLocation)) return withDistance;
    return sortByDistance(withDistance).filter((warehouse) =>
      withinRadius(warehouse.distanceKm, radiusKm)
    );
  }, [buyerLocation, radiusKm, warehouses]);

  // Doc 3: includes `details` label for the listing modal trigger
  const warehouseLabels = useMemo(
    () => ({
      spaceTypeFallback: t("cardSpaceTypeFallback"),
      conditionsFallback: t("cardConditionsFallback"),
      available: t("cardAvailable"),
      full: t("cardFull"),
      price: t("cardPrice"),
      match: t("cardMatch"),
      occupancy: t("cardOccupancy"),
      bestFor: t("cardBestFor"),
      distance: "Distance",
      details: "View Details",
      book: t("cardBook"),
    }),
    [t]
  );

  // Doc 3+4 merged: includes `rating` key (Doc 3) alongside all other map labels
  const mapLabels = useMemo(
    () => ({
      spaceTypeFallback: t("cardSpaceTypeFallback"),
      available: t("mapAvailable"),
      categories: t("mapCategories"),
      environment: t("mapEnvironment"),
      general: t("mapGeneral"),
      match: t("mapMatch"),
      distance: "Distance",
      rating: "Rating",
      book: t("mapBook"),
    }),
    [t]
  );

  // Doc 4: persist and apply language selection
  const changeLanguage = (nextLanguage) => {
    localStorage.setItem("farmerLanguage", nextLanguage);
    i18n.changeLanguage(nextLanguage);
  };

  // Doc 3: clears the listing modal before navigating to booking page
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
        toast.success("Showing produce spaces near your location.");
      },
      (error) => {
        const message = error.message || "Unable to access your location.";
        setLocationError(message);
        setLocationLoading(false);
        toast.error(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const clearBuyerLocation = () => {
    setBuyerLocation(null);
    setLocationError("");
  };

  // Doc 3: submit a star rating for a completed/confirmed booking
  const handleRateBooking = async (bookingId, score) => {
    setRatingBookingId(bookingId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiBaseUrl}/api/bookings/${bookingId}/rating`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ score }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to save rating.");
      setBookings((current) =>
        current.map((booking) => (booking.id === bookingId ? data.booking : booking))
      );
      toast.success("Rating saved.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRatingBookingId(null);
    }
  };

  const storageSubtitle = loadingWh
    ? t("loadingSpaces")
    : hasCoordinates(buyerLocation)
      ? `${nearbyWarehouses.length} produce space${nearbyWarehouses.length === 1 ? "" : "s"} within ${radiusKm} km`
      : t("matched", { count: nearbyWarehouses.length });

  return (
    <main className="page fade-up dashboard-theme dashboard-theme-farmer">
      <div className="dashboard-hero dashboard-hero-farmer">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 style={{ margin: 0 }}>{t("title")}</h2>
        </div>
        <div className="dashboard-toolbar">
          {/* Doc 4: language switcher with localStorage persistence */}
          <div className="language-switcher">
            {[
              ["en", t("languageEnglish")],
              ["hi", t("languageHindi")],
              ["bn", t("languageBengali")],
            ].map(([code, label]) => (
              <button
                key={code}
                className={`inner-tab${i18n.language === code ? " active" : ""}`}
                onClick={() => changeLanguage(code)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="tab-strip">
            <button
              className={`inner-tab${activeTab === "storage" ? " active" : ""}`}
              onClick={() => setActiveTab("storage")}
              type="button"
            >
              {t("storageTab")}
            </button>
            <button
              className={`inner-tab${activeTab === "bookings" ? " active" : ""}`}
              onClick={() => setActiveTab("bookings")}
              type="button"
            >
              {t("bookingsTab")}
            </button>
          </div>
        </div>
      </div>

      {activeTab === "storage" ? (
        <section className="page two-column">
          <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
            {/* Location filter card */}
            <div className="card buyer-location-card">
              <div className="row-between" style={{ alignItems: "flex-end" }}>
                <div>
                  <p className="eyebrow">Nearby Storage</p>
                  <h3 style={{ marginBottom: "8px" }}>Find produce spaces around you</h3>
                  <p className="section-subtitle" style={{ marginBottom: 0 }}>
                    Allow location access to sort listings by distance and hide anything outside your chosen radius.
                  </p>
                </div>
                <div className="actions">
                  <button
                    className="button-secondary"
                    disabled={locationLoading}
                    onClick={requestBuyerLocation}
                    type="button"
                  >
                    {locationLoading ? "Locating..." : "Use My Location"}
                  </button>
                  {hasCoordinates(buyerLocation) ? (
                    <button className="button-ghost" onClick={clearBuyerLocation} type="button">
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="buyer-location-controls">
                <label className="field">
                  Radius
                  <select onChange={(event) => setRadiusKm(event.target.value)} value={radiusKm}>
                    {RADIUS_OPTIONS.map((value) => (
                      <option key={value} value={value}>{value} km</option>
                    ))}
                  </select>
                </label>
                <div className="buyer-location-status">
                  {hasCoordinates(buyerLocation)
                    ? `Distance sort is active from ${Number(buyerLocation.lat).toFixed(4)}, ${Number(buyerLocation.lng).toFixed(4)}.`
                    : "Distance filter will activate after location access is granted."}
                  {locationError ? <span className="location-error-text"> {locationError}</span> : null}
                </div>
              </div>
            </div>

            <p className="section-subtitle">{storageSubtitle}</p>

            {loadingWh ? (
              <>
                <div className="skeleton" style={{ height: "160px", borderRadius: "16px" }} />
                <div className="skeleton" style={{ height: "160px", borderRadius: "16px" }} />
              </>
            ) : nearbyWarehouses.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <span className="empty-state-icon">FarmVault</span>
                  <p className="empty-state-title">{t("emptyTitle")}</p>
                  <p className="empty-state-sub">
                    {hasCoordinates(buyerLocation)
                      ? `No produce-compatible spaces were found within ${radiusKm} km.`
                      : t("emptySub")}
                  </p>
                </div>
              </div>
            ) : (
              nearbyWarehouses.map((warehouse) => (
                <WarehouseCard
                  key={warehouse.id}
                  labels={warehouseLabels}
                  onBook={handleBook}
                  // Doc 3: opens the ListingModal detail view
                  onOpen={setSelectedWarehouse}
                  warehouse={warehouse}
                />
              ))
            )}
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <MapView buyerLocation={buyerLocation} labels={mapLabels} warehouses={nearbyWarehouses} />
          </div>
        </section>
      ) : (
        // Bookings tab
        <section style={{ display: "grid", gap: "16px" }}>
          {loadingBk ? (
            <>
              <div className="skeleton" style={{ height: "120px", borderRadius: "16px" }} />
              <div className="skeleton" style={{ height: "120px", borderRadius: "16px" }} />
            </>
          ) : sortedBookings.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon">Bookings</span>
                <p className="empty-state-title">{t("noBookingsTitle")}</p>
                <p className="empty-state-sub">{t("noBookingsSub")}</p>
                <button
                  className="button"
                  onClick={() => setActiveTab("storage")}
                  style={{ marginTop: "12px" }}
                  type="button"
                >
                  {t("browse")}
                </button>
              </div>
            </div>
          ) : (
            sortedBookings.map((booking) => (
              <article className="booking-card" key={booking.id}>
                <div className="booking-card-header">
                  <div>
                    <p className="booking-card-title">{booking.warehouseName || "Storage Space"}</p>
                    <div className="booking-card-meta">
                      <span>{booking.produce}</span>
                      <span>{booking.weight}</span>
                      {/* Doc 4: total price in meta row */}
                      <span>Rs {Number(booking.totalPrice || 0).toLocaleString("en-IN")}</span>
                      <span>{new Date(booking.createdAt).toLocaleDateString("en-IN")}</span>
                    </div>
                    {/* Doc 4: booker note and owner reply */}
                    {booking.bookerNote ? (
                      <p className="section-subtitle" style={{ margin: "8px 0 0" }}>Your note: {booking.bookerNote}</p>
                    ) : null}
                    {booking.ownerResponseNote ? (
                      <p className="section-subtitle" style={{ margin: "6px 0 0" }}>Owner reply: {booking.ownerResponseNote}</p>
                    ) : null}
                  </div>
                  <span className={`badge status-${booking.status}`}>{booking.status}</span>
                </div>

                {/* Doc 3: inline star rating for confirmed / completed bookings */}
                {canOpenReceipt(booking.status) ? (
                  <div className="booking-feedback-block">
                    <p className="listing-detail-label">Rate This Space</p>
                    <div className="row-between" style={{ alignItems: "center" }}>
                      <RatingInput
                        currentRating={booking.buyerRating?.score || 0}
                        disabled={ratingBookingId === booking.id}
                        onRate={(score) => handleRateBooking(booking.id, score)}
                      />
                      {booking.buyerRating?.score ? (
                        <span className="section-subtitle" style={{ margin: 0 }}>
                          Your rating: {booking.buyerRating.score}/5
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="booking-card-actions">
                  <button
                    className="button-secondary button-ghost"
                    onClick={() => navigate(`/book?warehouseId=${booking.warehouseId}`)}
                    type="button"
                  >
                    {t("rebook")}
                  </button>
                  {booking.status === "confirmed" ? (
                    <button
                      className="button-secondary button-ghost"
                      onClick={() => navigate(`/grade/${booking.id}`)}
                      type="button"
                    >
                      {t("grade")}
                    </button>
                  ) : null}
                  {canOpenReceipt(booking.status) ? (
                    <button
                      className="button-ghost"
                      onClick={() => navigate(`/receipt/${booking.id}`)}
                      type="button"
                    >
                      {t("receipt")}
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {/* Doc 3: listing detail modal — not present in Doc 4 */}
      <ListingModal
        warehouse={selectedWarehouse}
        onBook={handleBook}
        onClose={() => setSelectedWarehouse(null)}
      />
    </main>
  );
}