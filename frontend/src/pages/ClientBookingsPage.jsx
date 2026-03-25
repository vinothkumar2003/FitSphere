import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../utils/AuthProvider";
import "./GymPlansPage.css";

const cardStyle = {
  background: "#ffffff",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
};

const buttonStyle = {
  border: "none",
  borderRadius: 12,
  padding: "10px 16px",
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const statusStyles = {
  APPROVED: { bg: "rgba(34, 197, 94, 0.16)", color: "#166534" },
  PENDING: { bg: "rgba(251, 191, 36, 0.22)", color: "#92400e" },
  REJECTED: { bg: "rgba(248, 113, 113, 0.22)", color: "#991b1b" },
  CANCELLED: { bg: "rgba(148, 163, 184, 0.22)", color: "#0f172a" },
};

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { headers };
};

const getErrorMessage = (err, fallbackMessage) => {
  const responseData = err?.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  if (responseData && typeof responseData === "object") {
    if (typeof responseData.message === "string" && responseData.message.trim()) {
      return responseData.message;
    }
    if (typeof responseData.error === "string" && responseData.error.trim()) {
      return responseData.error;
    }
  }

  if (typeof err?.message === "string" && err.message.trim()) {
    return err.message;
  }

  return fallbackMessage;
};

const formatCurrency = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "N/A";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const capitalize = (value) => {
  if (!value) return "N/A";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const normalizeStatus = (value) => {
  if (!value) return "PENDING";
  const normalized = value.toString().toUpperCase();
  if (normalized === "PEENIG") return "PENDING";
  return normalized;
};

const ClientBookingsPage = () => {
  const { user } = useAuth();
  const isClient = user?.role === "CLIENT";
  const location = useLocation();
  const basePath = "/client";

  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBookings = useCallback(async () => {
    if (!user?.id) {
      setError("Missing user id for bookings lookup.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await api.get(`/api/bookings/user/${user.id}`, getAuthConfig());
      setBookings(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load bookings."));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isClient) {
      loadBookings();
    } else {
      setIsLoading(false);
    }
  }, [isClient, loadBookings]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const approved = bookings.filter((b) => normalizeStatus(b.status) === "APPROVED").length;
    const pending = bookings.filter((b) => normalizeStatus(b.status) === "PENDING").length;
    const totalPaid = bookings.reduce((sum, b) => sum + (Number(b.amountPaid) || 0), 0);

    return { total, approved, pending, totalPaid };
  }, [bookings]);

  const navLinks = [
    { label: "Plans", to: `${basePath}/gymplans`, disabled: false, show: true },
    { label: "My Bookings", to: `${basePath}/bookings`, disabled: false, show: isClient },
    { label: "Diet & Food", to: `${basePath}/dietfoot`, disabled: false, show: isClient },
    { label: "Equipment", to: `${basePath}/gym-equipment`, disabled: false, show: isClient },
  ];

  if (!isClient) {
    return (
      <main className="gym-plans-page">
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, color: "#fff" }}>
          <p>Only clients can view booking history.</p>
          <Link to="/" style={{ ...buttonStyle, background: "#e2e8f0", color: "#0f172a" }}>
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="gym-plans-page">
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gap: 24 }}>
            {/* <nav className="plans-top-nav" aria-label="Booking navigation">
              {navLinks
                .filter((link) => link.show)
                .map((link) =>
                  link.disabled ? (
                    <span key={link.label} className="plans-top-nav-link disabled" title="Coming soon">
                      {link.label}
                    </span>
                  ) : (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`plans-top-nav-link ${location.pathname === link.to ? "active" : ""}`}
                    >
                      {link.label}
                    </Link>
                  )
                )}
            </nav> */}

        <section
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #6366f1 100%)",
            color: "#e2e8f0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, letterSpacing: 1, textTransform: "uppercase", fontSize: 12, opacity: 0.8 }}>
                Client Desk
              </p>
              <h2 style={{ margin: "6px 0 4px", fontSize: 26, color: "#fff" }}>My Bookings</h2>
              <p style={{ margin: 0, color: "#cbd5e1", maxWidth: 620 }}>
                Track every plan you have requested, paid for, and started.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={loadBookings}
                style={{ ...buttonStyle, background: "rgba(226, 232, 240, 0.16)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                Refresh
              </button>
              <Link
                to="/client/gymplans"
                style={{ ...buttonStyle, background: "#22c55e", color: "#0b1324", boxShadow: "0 10px 25px rgba(34, 197, 94, 0.35)" }}
              >
                Browse Plans
              </Link>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <span style={{ ...buttonStyle, background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0" }}>Total: {stats.total}</span>
            <span style={{ ...buttonStyle, background: "#e8fff4", color: "#166534", border: "1px solid rgba(34,197,94,0.3)" }}>Approved: {stats.approved}</span>
            <span style={{ ...buttonStyle, background: "#fff8eb", color: "#92400e", border: "1px solid rgba(251,191,36,0.4)" }}>Pending: {stats.pending}</span>
            <span style={{ ...buttonStyle, background: "#eef2ff", color: "#312e81", border: "1px solid rgba(99,102,241,0.35)" }}>
              Paid: {stats.total ? formatCurrency(stats.totalPaid) : "N/A"}
            </span>
          </div>
        </section>

        <section style={cardStyle}>
          {error ? (
            <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <p style={{ margin: 0, color: "#475569" }}>Loading your bookings...</p>
          ) : bookings.length === 0 ? (
            <div style={{ padding: 18, borderRadius: 14, background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#0f172a" }}>
              <p style={{ margin: 0, fontWeight: 700 }}>No bookings yet.</p>
              <p style={{ margin: "6px 0 0" }}>Browse plans and submit a booking to see it here.</p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 24,
              }}
            >
              {bookings.map((booking) => {
                const plan = booking.plan || {};
                const trainer = booking.trainer || plan.trainer || {};
                const statusKey = normalizeStatus(booking.status);
                const statusStyle = statusStyles[statusKey] || { bg: "#e2e8f0", color: "#0f172a" };

                return (
                  <article
                    key={booking.id}
                    className="plan-pricing-card"
                    style={{ borderColor: "rgba(103, 132, 255, 0.18)" }}
                    onMouseMove={(event) => event.currentTarget.style.setProperty("--glow-x", "50%")}
                    onMouseLeave={(event) => event.currentTarget.style.setProperty("--glow-x", "50%")}
                  >
                    <div className="plan-inner-glow" />
                    <div className="plan-card-blur" />

                    <div className="plan-card-icon">📅</div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <h3 className="plan-card-name">{plan.name || "Plan"}</h3>
                        <p className="plan-card-description">{plan.description || "Fitness plan"}</p>
                      </div>
                      <span
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {capitalize(statusKey || "Unknown")}
                      </span>
                    </div>

                    <div className="plan-card-price">
                      {formatCurrency(booking.amountPaid ?? plan.price)}
                      <span>paid</span>
                    </div>

                    <ul className="plan-card-features">
                      <li>Trainer: {trainer.fullName || "Not assigned"}</li>
                      <li>Sessions/week: {plan.sessionsPerWeek ?? "N/A"}</li>
                      <li>Duration: {plan.durationWeeks ?? "N/A"} weeks</li>
                      <li>Start: {formatDate(booking.startDate || booking.bookedAt)}</li>
                      <li>Booked: {formatDate(booking.bookedAt)}</li>
                      <li>Notes: {booking.notes || "—"}</li>
                    </ul>

                    <p className="plan-card-comparison">
                      {statusKey === "APPROVED"
                        ? "Your booking is approved. Coordinate schedule with the trainer."
                        : statusKey === "PENDING"
                        ? "Pending review. We'll notify you once it's approved."
                        : statusKey === "REJECTED"
                        ? "This booking was rejected. Consider booking another plan."
                        : "Booking status updated."}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default ClientBookingsPage;
