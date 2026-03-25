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

const inputStyle = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  padding: "10px 12px",
  fontSize: 14,
  color: "#0f172a",
  background: "#fff",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 100,
  resize: "vertical",
  fontFamily: "inherit",
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

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeStatus = (value) => {
  if (!value) return "UNKNOWN";
  const normalized = value.toString().toUpperCase();
  if (normalized === "PEENIG") return "PENDING";
  return normalized;
};

const getExpiryDate = (booking) => {
  if (!booking?.startDate) return null;

  const startDate = new Date(booking.startDate);
  if (Number.isNaN(startDate.getTime())) return null;

  const durationWeeks = Number(booking?.plan?.durationWeeks);
  if (Number.isNaN(durationWeeks)) return startDate;

  const expiry = new Date(startDate);
  expiry.setDate(expiry.getDate() + durationWeeks * 7);
  return expiry;
};

const getDaysUntilExpiry = (booking) => {
  const expiryDate = getExpiryDate(booking);
  if (!expiryDate) return null;

  const diff = expiryDate.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const defaultReminder = (booking) => {
  const planName = booking?.plan?.name || "your FitSphere plan";
  return {
    subject: `Renew your ${planName} membership`,
    message: `Hello, your ${planName} membership will expire soon. Please renew your membership to continue your fitness journey with FitSphere.`,
  };
};

const statusPillStyles = {
  APPROVED: { bg: "rgba(34, 197, 94, 0.16)", color: "#166534" },
  PENDING: { bg: "rgba(251, 191, 36, 0.22)", color: "#92400e" },
  REJECTED: { bg: "rgba(248, 113, 113, 0.22)", color: "#991b1b" },
  CANCELLED: { bg: "rgba(148, 163, 184, 0.22)", color: "#0f172a" },
  UNKNOWN: { bg: "#e2e8f0", color: "#0f172a" },
};

const AdminFinancePage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "ADMIN";

  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingAmounts, setEditingAmounts] = useState({});
  const [renewalDrafts, setRenewalDrafts] = useState({});
  const [savingBookingId, setSavingBookingId] = useState(null);
  const [sendingBookingId, setSendingBookingId] = useState(null);

  const navLinks = [
    { label: "Plans", to: "/admin/gymplans" },
    { label: "My Plans", to: "/admin/myplans" },
    { label: "Booking Requests", to: "/admin/booking-requests" },
    { label: "Finance", to: "/admin/finance" },
    { label: "Users", to: "/admin/users" },
  ];

  const syncLocalState = useCallback((data) => {
    setBookings(data);
    setEditingAmounts(
      Object.fromEntries(data.map((booking) => [booking.id, booking.amountPaid ?? booking.plan?.price ?? 0]))
    );
    setRenewalDrafts(
      Object.fromEntries(data.map((booking) => [booking.id, defaultReminder(booking)]))
    );
  }, []);

  const fetchBookings = useCallback(async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await api.get("/api/admin/finance/bookings", getAuthConfig());
      const data = Array.isArray(response.data) ? response.data : [];
      syncLocalState(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load finance bookings."));
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, syncLocalState]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const status = normalizeStatus(booking.status);
      const planName = booking?.plan?.name || "";
      const clientName = booking?.user?.fullName || booking?.user?.username || "";
      const email = booking?.user?.email || "";

      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      const matchesSearch =
        !query ||
        [String(booking.id), planName, clientName, email].some((value) =>
          value.toLowerCase().includes(query)
        );

      return matchesStatus && matchesSearch;
    });
  }, [bookings, search, statusFilter]);

  const stats = useMemo(() => {
    const totalBookings = bookings.length;
    const totalCollected = bookings.reduce((sum, booking) => sum + (Number(booking.amountPaid) || 0), 0);
    const approvedBookings = bookings.filter((booking) => normalizeStatus(booking.status) === "APPROVED").length;
    const pendingBookings = bookings.filter((booking) => normalizeStatus(booking.status) === "PENDING").length;
    const expiringSoon = bookings.filter((booking) => {
      const daysLeft = getDaysUntilExpiry(booking);
      return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
    }).length;

    return { totalBookings, totalCollected, approvedBookings, pendingBookings, expiringSoon };
  }, [bookings]);

  const upsertBooking = (updatedBooking) => {
    setBookings((current) =>
      current.map((booking) => (booking.id === updatedBooking.id ? updatedBooking : booking))
    );
    setEditingAmounts((current) => ({
      ...current,
      [updatedBooking.id]: updatedBooking.amountPaid ?? updatedBooking.plan?.price ?? 0,
    }));
    setRenewalDrafts((current) => ({
      ...current,
      [updatedBooking.id]: current[updatedBooking.id] || defaultReminder(updatedBooking),
    }));
  };

  const handleAmountChange = (bookingId, value) => {
    setEditingAmounts((current) => ({ ...current, [bookingId]: value }));
  };

  const handleDraftChange = (bookingId, field, value) => {
    setRenewalDrafts((current) => ({
      ...current,
      [bookingId]: {
        ...current[bookingId],
        [field]: value,
      },
    }));
  };

  const handleSaveAmount = async (bookingId) => {
    const rawValue = editingAmounts[bookingId];
    const amountPaid = Number(rawValue);

    if (Number.isNaN(amountPaid) || amountPaid < 0) {
      setError("Amount paid must be a valid non-negative number.");
      setSuccess("");
      return;
    }

    setSavingBookingId(bookingId);
    setError("");
    setSuccess("");

    try {
      const response = await api.put(
        `/api/admin/finance/bookings/${bookingId}/amount`,
        { amountPaid },
        getAuthConfig()
      );
      if (response?.data) {
        upsertBooking(response.data);
      } else {
        await fetchBookings();
      }
      setSuccess(`Booking #${bookingId} amount updated successfully.`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update booking amount."));
    } finally {
      setSavingBookingId(null);
    }
  };

  const handleSendReminder = async (bookingId) => {
    setSendingBookingId(bookingId);
    setError("");
    setSuccess("");

    try {
      const draft = renewalDrafts[bookingId] || {};
      const response = await api.post(
        `/api/admin/finance/bookings/${bookingId}/renewal-email`,
        {
          subject: draft.subject?.trim() || undefined,
          message: draft.message?.trim() || undefined,
        },
        getAuthConfig()
      );
      setSuccess(response?.data?.message || `Renewal reminder sent for booking #${bookingId}.`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to send renewal reminder."));
    } finally {
      setSendingBookingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <main className="gym-plans-page">
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, color: "#fff" }}>
          <p>Access restricted: only admins can view finance records.</p>
          <Link to="/" style={{ ...buttonStyle, background: "#e2e8f0", color: "#0f172a" }}>
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="gym-plans-page">
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 24 }}>
        <nav className="plans-top-nav" aria-label="Admin finance navigation">
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
            background: "linear-gradient(135deg, #052e16 0%, #14532d 45%, #0f766e 100%)",
            color: "#ecfeff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, letterSpacing: 1, textTransform: "uppercase", fontSize: 12, opacity: 0.8 }}>
                Revenue Control
              </p>
              <h2 style={{ margin: "8px 0 4px", fontSize: 28, color: "#fff" }}>Admin Finance</h2>
              <p style={{ margin: 0, maxWidth: 700, color: "rgba(236, 254, 255, 0.82)" }}>
                Track bookings, correct paid amounts, and send renewal reminders before memberships expire.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchBookings}
              style={{
                ...buttonStyle,
                background: "rgba(255, 255, 255, 0.12)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              Refresh Records
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 18 }}>
            <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.12)" }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", opacity: 0.8 }}>Total bookings</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{stats.totalBookings}</div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.12)" }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", opacity: 0.8 }}>Collected</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{formatCurrency(stats.totalCollected)}</div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.12)" }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", opacity: 0.8 }}>Approved</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{stats.approvedBookings}</div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.12)" }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", opacity: 0.8 }}>Pending</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{stats.pendingBookings}</div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.12)" }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", opacity: 0.8 }}>Expiring in 7 days</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{stats.expiringSoon}</div>
            </div>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 12, alignItems: "end" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Search bookings</span>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by booking id, client, email, or plan"
                style={inputStyle}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                style={inputStyle}
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>

            <button type="button" onClick={fetchBookings} style={{ ...buttonStyle, background: "#0f172a", color: "#fff" }}>
              Reload
            </button>
          </div>

          {error ? (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
              {error}
            </div>
          ) : null}

          {success ? (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#ecfdf5", color: "#166534", border: "1px solid #bbf7d0" }}>
              {success}
            </div>
          ) : null}

          <div style={{ marginTop: 18 }}>
            {isLoading ? (
              <p style={{ margin: 0, color: "#475569" }}>Loading finance bookings...</p>
            ) : filteredBookings.length === 0 ? (
              <div style={{ padding: 18, borderRadius: 14, background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#0f172a" }}>
                <p style={{ margin: 0, fontWeight: 700 }}>No finance records match this filter.</p>
                <p style={{ margin: "6px 0 0" }}>Try another search term or refresh the data.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
                {filteredBookings.map((booking) => {
                  const client = booking.user || {};
                  const trainer = booking.trainer || booking.plan?.trainer || {};
                  const plan = booking.plan || {};
                  const status = normalizeStatus(booking.status);
                  const statusStyle = statusPillStyles[status] || statusPillStyles.UNKNOWN;
                  const expiryDate = getExpiryDate(booking);
                  const daysUntilExpiry = getDaysUntilExpiry(booking);
                  const draft = renewalDrafts[booking.id] || defaultReminder(booking);

                  return (
                    <article key={booking.id} className="plan-pricing-card" style={{ borderColor: "rgba(20, 83, 45, 0.14)" }}>
                      <div className="plan-inner-glow" />
                      <div className="plan-card-blur" />

                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0 }}>
                          <h3 className="plan-card-name" style={{ fontSize: 24 }}>
                            {plan.name || "Membership Plan"}
                          </h3>
                          <p className="plan-card-description">
                            Booking #{booking.id} for {client.fullName || client.username || "Client"}
                          </p>
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
                          {status}
                        </span>
                      </div>

                      <div className="plan-card-price">
                        {formatCurrency(booking.amountPaid ?? plan.price)}
                        <span>received</span>
                      </div>

                      <ul className="plan-card-features" style={{ marginBottom: 20 }}>
                        <li>Client: {client.fullName || client.username || `User ${client.id ?? "N/A"}`}</li>
                        <li>Email: {client.email || "N/A"}</li>
                        <li>Trainer: {trainer.fullName || "Not assigned"}</li>
                        <li>Plan price: {formatCurrency(plan.price)}</li>
                        <li>Booked on: {formatDateTime(booking.bookedAt)}</li>
                        <li>Start date: {formatDateTime(booking.startDate)}</li>
                        <li>Expiry date: {expiryDate ? formatDateTime(expiryDate) : "N/A"}</li>
                        <li>Days to expiry: {daysUntilExpiry === null ? "N/A" : daysUntilExpiry}</li>
                      </ul>

                      <div style={{ display: "grid", gap: 14 }}>
                        <div style={{ display: "grid", gap: 8 }}>
                          <label htmlFor={`amount-${booking.id}`} style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
                            Update paid amount
                          </label>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <input
                              id={`amount-${booking.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={editingAmounts[booking.id] ?? ""}
                              onChange={(event) => handleAmountChange(booking.id, event.target.value)}
                              style={{ ...inputStyle, flex: "1 1 180px" }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveAmount(booking.id)}
                              disabled={savingBookingId === booking.id}
                              style={{
                                ...buttonStyle,
                                background: "#14532d",
                                color: "#fff",
                                opacity: savingBookingId === booking.id ? 0.7 : 1,
                              }}
                            >
                              {savingBookingId === booking.id ? "Saving..." : "Save Amount"}
                            </button>
                          </div>
                        </div>

                        <div style={{ padding: 16, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <div style={{ display: "grid", gap: 10 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Renewal reminder</div>
                            <input
                              type="text"
                              value={draft.subject || ""}
                              onChange={(event) => handleDraftChange(booking.id, "subject", event.target.value)}
                              placeholder="Email subject"
                              style={inputStyle}
                            />
                            <textarea
                              value={draft.message || ""}
                              onChange={(event) => handleDraftChange(booking.id, "message", event.target.value)}
                              placeholder="Reminder message"
                              style={textareaStyle}
                            />
                            <button
                              type="button"
                              onClick={() => handleSendReminder(booking.id)}
                              disabled={sendingBookingId === booking.id}
                              style={{
                                ...buttonStyle,
                                background: "#0f766e",
                                color: "#fff",
                                width: "fit-content",
                                opacity: sendingBookingId === booking.id ? 0.7 : 1,
                              }}
                            >
                              {sendingBookingId === booking.id ? "Sending..." : "Send Renewal Email"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default AdminFinancePage;
