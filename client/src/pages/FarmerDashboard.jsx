import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { apiBaseUrl, getAuthHeaders } from "../firebase";
import MapView from "../components/MapView";
import WarehouseCard from "../components/WarehouseCard";

function canOpenReceipt(status) {
  return ["confirmed", "completed"].includes(status);
}

export default function FarmerDashboard({ loading: sessionLoading, user }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("farmer");
  const [activeTab, setActiveTab] = useState("storage");
  const [warehouses, setWarehouses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadingWh, setLoadingWh] = useState(true);
  const [loadingBk, setLoadingBk] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("farmerLanguage") || "en";
    if (i18n.language !== stored) {
      i18n.changeLanguage(stored);
    }
  }, [i18n]);

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
              ["grains", "fruits", "vegetables", "produce", "wheat", "rice"].includes(String(item).toLowerCase())
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

  useEffect(() => {
    if (sessionLoading || !user || activeTab !== "bookings") {
      return;
    }

    (async () => {
      setLoadingBk(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${apiBaseUrl}/api/bookings/farmer/${user.uid}`, {
          headers,
        });
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
      book: t("cardBook"),
    }),
    [t]
  );

  const mapLabels = useMemo(
    () => ({
      spaceTypeFallback: t("cardSpaceTypeFallback"),
      available: t("mapAvailable"),
      categories: t("mapCategories"),
      environment: t("mapEnvironment"),
      general: t("mapGeneral"),
      match: t("mapMatch"),
      book: t("mapBook"),
    }),
    [t]
  );

  const changeLanguage = (nextLanguage) => {
    localStorage.setItem("farmerLanguage", nextLanguage);
    i18n.changeLanguage(nextLanguage);
  };

  const handleBook = (warehouse) => {
    navigate(`/book?warehouseId=${warehouse.id}`);
  };

  return (
    <main className="page fade-up dashboard-theme dashboard-theme-farmer">
      <div className="dashboard-hero dashboard-hero-farmer">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 style={{ margin: 0 }}>{t("title")}</h2>
        </div>
        <div className="dashboard-toolbar">
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
            <button className={`inner-tab${activeTab === "storage" ? " active" : ""}`} onClick={() => setActiveTab("storage")} type="button">
              {t("storageTab")}
            </button>
            <button className={`inner-tab${activeTab === "bookings" ? " active" : ""}`} onClick={() => setActiveTab("bookings")} type="button">
              {t("bookingsTab")}
            </button>
          </div>
        </div>
      </div>

      {activeTab === "storage" ? (
        <section className="page two-column">
          <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
            <p className="section-subtitle">
              {loadingWh ? t("loadingSpaces") : t("matched", { count: warehouses.length })}
            </p>
            {loadingWh ? (
              <>
                <div className="skeleton" style={{ height: "160px", borderRadius: "16px" }} />
                <div className="skeleton" style={{ height: "160px", borderRadius: "16px" }} />
              </>
            ) : warehouses.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <span className="empty-state-icon">FarmVault</span>
                  <p className="empty-state-title">{t("emptyTitle")}</p>
                  <p className="empty-state-sub">{t("emptySub")}</p>
                </div>
              </div>
            ) : (
              warehouses.map((warehouse) => <WarehouseCard key={warehouse.id} labels={warehouseLabels} onBook={handleBook} warehouse={warehouse} />)
            )}
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <MapView labels={mapLabels} warehouses={warehouses} />
          </div>
        </section>
      ) : (
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
                <button className="button" onClick={() => setActiveTab("storage")} style={{ marginTop: "12px" }} type="button">
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
                      <span>{new Date(booking.createdAt).toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>
                  <span className={`badge status-${booking.status}`}>{booking.status}</span>
                </div>
                <div className="booking-card-actions">
                  <button className="button-secondary button-ghost" onClick={() => navigate(`/book?warehouseId=${booking.warehouseId}`)} type="button">
                    {t("rebook")}
                  </button>
                  {booking.status === "confirmed" ? (
                    <button className="button-secondary button-ghost" onClick={() => navigate(`/grade/${booking.id}`)} type="button">
                      {t("grade")}
                    </button>
                  ) : null}
                  {canOpenReceipt(booking.status) ? (
                    <button className="button-ghost" onClick={() => navigate(`/receipt/${booking.id}`)} type="button">
                      {t("receipt")}
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </section>
      )}
    </main>
  );
}
