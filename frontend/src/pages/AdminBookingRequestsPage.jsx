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

const AdminBookingRequestsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const location = useLocation();

  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [actionId, setActionId] = useState(null);

  const fetchBookings = useCallback(
    async (statusToLoad = "PENDING") => {
      if (!isAdmin) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const normalizedStatus = statusToLoad === "ALL" ? null : statusToLoad;
        const url = normalizedStatus ? `/api/bookings/status/${normalizedStatus}` : "/api/bookings";
        const response = await api.get(url, getAuthConfig());
        const data = Array.isArray(response.data) ? response.data : [];
        const normalized = data.map((b) => ({ ...b, status: normalizeStatus(b.status) }));
        setBookings(
          normalized.filter((b) => (normalizedStatus ? normalizeStatus(b.status) === normalizedStatus : true))
        );
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load booking requests."));
      } finally {
        setIsLoading(false);
      }
    },
    [isAdmin]
  );

  useEffect(() => {
    fetchBookings(statusFilter);
  }, [fetchBookings, statusFilter]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((b) => normalizeStatus(b.status) === "PENDING").length;
    const approved = bookings.filter((b) => normalizeStatus(b.status) === "APPROVED").length;
    const rejected = bookings.filter((b) => normalizeStatus(b.status) === "REJECTED").length;
    return { total, pending, approved, rejected };
  }, [bookings]);

  const navLinks = [
    { label: "Plans", to: "/admin/gymplans" },
    { label: "My Plans", to: "/admin/myplans" },
    { label: "Booking Requests", to: "/admin/booking-requests" },
    { label: "Users", to: "/admin/users" },
  ];

  const updateBookingInState = (updatedBooking) => {
    const normalizedStatus = normalizeStatus(updatedBooking.status);
    setBookings((prev) => {
      const next = prev.map((b) => (b.id === updatedBooking.id ? { ...updatedBooking, status: normalizedStatus } : b));
      if (statusFilter !== "ALL" && statusFilter !== normalizedStatus) {
        return next.filter((b) => normalizeStatus(b.status) === statusFilter);
      }
      return next;
    });
  };

  const handleApprove = async (bookingId) => {
    setActionId(bookingId);
    setError("");
    try {
      const response = await api.put(`/api/bookings/${bookingId}/approve`, null, getAuthConfig());
      if (response?.data) {
        updateBookingInState(response.data);
      } else {
        await fetchBookings(statusFilter);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to approve booking."));
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (bookingId) => {
    setActionId(bookingId);
    setError("");
    try {
      const response = await api.put(`/api/bookings/${bookingId}/reject`, null, getAuthConfig());
      if (response?.data) {
        updateBookingInState(response.data);
      } else {
        await fetchBookings(statusFilter);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to reject booking."));
    } finally {
      setActionId(null);
    }
  };

  if (!isAdmin) {
    return (
      <main className="gym-plans-page">
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, color: "#fff" }}>
          <p>Access restricted: only admins can view booking requests.</p>
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
        <nav className="plans-top-nav" aria-label="Booking requests navigation">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`plans-top-nav-link ${location.pathname === link.to ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <section
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #ea580c 100%)",
            color: "#e2e8f0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, letterSpacing: 1, textTransform: "uppercase", fontSize: 12, opacity: 0.8 }}>
                Admin Desk
              </p>
              <h2 style={{ margin: "6px 0 4px", fontSize: 26, color: "#fff" }}>Booking Requests</h2>
              <p style={{ margin: 0, color: "#cbd5e1", maxWidth: 640 }}>
                Review client bookings, approve or reject, and keep statuses current.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => fetchBookings(statusFilter)}
                style={{ ...buttonStyle, background: "rgba(226, 232, 240, 0.16)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                Refresh
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <span style={{ ...buttonStyle, background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0" }}>
              Total: {stats.total}
            </span>
            <span style={{ ...buttonStyle, background: "#fff8eb", color: "#92400e", border: "1px solid rgba(251,191,36,0.4)" }}>
              Pending: {stats.pending}
            </span>
            <span style={{ ...buttonStyle, background: "#e8fff4", color: "#166534", border: "1px solid rgba(34,197,94,0.3)" }}>
              Approved: {stats.approved}
            </span>
            <span style={{ ...buttonStyle, background: "#fef2f2", color: "#991b1b", border: "1px solid rgba(248,113,113,0.35)" }}>
              Rejected: {stats.rejected}
            </span>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["PENDING", "APPROVED", "REJECTED", "ALL"].map((status) => {
                const isActive = statusFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    style={{
                      ...buttonStyle,
                      padding: "8px 14px",
                      background: isActive ? "#0f172a" : "#e2e8f0",
                      color: isActive ? "#e2e8f0" : "#0f172a",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    {capitalize(status.toLowerCase())}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => fetchBookings(statusFilter)}
              style={{ ...buttonStyle, background: "#e2e8f0", color: "#0f172a" }}
            >
              Reload
            </button>
          </div>

          {error ? (
            <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <p style={{ margin: 0, color: "#475569" }}>Loading booking requests...</p>
          ) : bookings.length === 0 ? (
            <div style={{ padding: 18, borderRadius: 14, background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#0f172a" }}>
              <p style={{ margin: 0, fontWeight: 700 }}>No bookings for this filter.</p>
              <p style={{ margin: "6px 0 0" }}>Switch status tabs or refresh to check again.</p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                gap: 20,
              }}
            >
              {bookings.map((booking) => {
                const plan = booking.plan || {};
                const trainer = booking.trainer || plan.trainer || {};
                const client = booking.user || {};
                const statusStyle = statusStyles[normalizeStatus(booking.status)] || { bg: "#e2e8f0", color: "#0f172a" };
                const isPending = normalizeStatus(booking.status) === "PENDING";

                return (
                  <article
                    key={booking.id}
                    className="plan-pricing-card"
                    style={{ borderColor: "rgba(234, 88, 12, 0.18)" }}
                  >
                    <div className="plan-inner-glow" />
                    <div className="plan-card-blur" />

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
                        {capitalize(normalizeStatus(booking.status).toLowerCase())}
                      </span>
                    </div>

                    <div className="plan-card-price">
                      {formatCurrency(booking.amountPaid ?? plan.price)}
                      <span>paid</span>
                    </div>

                    <ul className="plan-card-features">
                      <li>Client: {client.fullName || client.username || `User ${client.id}`}</li>
                      <li>Trainer: {trainer.fullName || "Not assigned"}</li>
                      <li>Sessions/week: {plan.sessionsPerWeek ?? "N/A"}</li>
                      <li>Duration: {plan.durationWeeks ?? "N/A"} weeks</li>
                      <li>Booked: {formatDate(booking.bookedAt)}</li>
                      <li>Start: {formatDate(booking.startDate)}</li>
                      <li>Notes: {booking.notes || "-"}</li>
                    </ul>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => handleApprove(booking.id)}
                        disabled={!isPending || actionId === booking.id}
                        style={{
                          ...buttonStyle,
                          background: isPending ? "#22c55e" : "#e2e8f0",
                          color: isPending ? "#0b1324" : "#475569",
                          border: "1px solid rgba(34,197,94,0.35)",
                          opacity: actionId === booking.id ? 0.7 : 1,
                        }}
                      >
                        {actionId === booking.id ? "Updating..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(booking.id)}
                        disabled={!isPending || actionId === booking.id}
                        style={{
                          ...buttonStyle,
                          background: "#fee2e2",
                          color: "#991b1b",
                          border: "1px solid #fca5a5",
                          opacity: actionId === booking.id ? 0.7 : 1,
                        }}
                      >
                        Reject
                      </button>
                    </div>
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

export default AdminBookingRequestsPage;
