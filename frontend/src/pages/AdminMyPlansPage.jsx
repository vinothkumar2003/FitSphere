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

const chipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(15, 23, 42, 0.08)",
  background: "#f8fafc",
  color: "#0f172a",
  fontSize: 12,
  fontWeight: 600,
};

const filterPillStyle = {
  ...buttonStyle,
  background: "#e2e8f0",
  color: "#0f172a",
  padding: "9px 14px",
  border: "1px solid #cbd5e1",
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
  if (Number.isNaN(amount)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const getPlanIcon = (plan) => {
  const difficulty = (plan?.difficulty || "").toLowerCase();
  const focusArea = (plan?.focusArea || "").toLowerCase();

  if (focusArea.includes("cardio")) return "\u26A1";
  if (focusArea.includes("strength")) return "\uD83C\uDFCB";
  if (focusArea.includes("mobility")) return "\uD83E\uDDD8";
  if (focusArea.includes("full")) return "\uD83D\uDD25";
  if (difficulty.includes("advanced")) return "\uD83C\uDFC6";
  if (difficulty.includes("intermediate")) return "\uD83D\uDE80";
  return "\uD83D\uDCAA";
};

const getPlanBadge = (plan, index) => {
  if (!plan?.active) return "PAUSED";
  if ((plan?.sessionsPerWeek ?? 0) >= 5) return "POPULAR";
  if (index === 0) return "STARTER";
  return "";
};

const handleCardMove = (event) => {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((y - centerY) / 20).toFixed(2);
  const rotateY = ((centerX - x) / 20).toFixed(2);

  card.style.setProperty("--glow-x", `${x}px`);
  card.style.setProperty("--glow-y", `${y}px`);
  card.style.setProperty("--rotate-x", `${rotateX}deg`);
  card.style.setProperty("--rotate-y", `${rotateY}deg`);
};

const handleCardLeave = (event) => {
  const card = event.currentTarget;
  card.style.setProperty("--glow-x", "50%");
  card.style.setProperty("--glow-y", "50%");
  card.style.setProperty("--rotate-x", "0deg");
  card.style.setProperty("--rotate-y", "0deg");
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

const AdminMyPlansPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const location = useLocation();
  const basePath = "/admin";

  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await api.get("/api/plans/admin/my", getAuthConfig());
      setPlans(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load your plans."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const myPlans = useMemo(() => {
    const adminId = user?.id;
    if (!adminId) return plans;

    const owned = plans.filter((plan) => {
      const ownerIds = [plan?.createdBy, plan?.createdById, plan?.adminId, plan?.ownerId].filter(Boolean);
      return ownerIds.length === 0 || ownerIds.includes(adminId);
    });

    return owned;
  }, [plans, user?.id]);

  const filteredPlans = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return [...myPlans]
      .filter((plan) => {
        if (statusFilter === "active" && !plan.active) return false;
        if (statusFilter === "inactive" && plan.active) return false;

        if (!search) return true;

        return [
          plan?.name,
          plan?.focusArea,
          plan?.difficulty,
          plan?.description,
          plan?.trainer?.fullName,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(search));
      })
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
  }, [myPlans, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = myPlans.length;
    const active = myPlans.filter((plan) => plan.active).length;
    const inactive = total - active;
    const averagePrice = total
      ? Math.round(myPlans.reduce((sum, plan) => sum + (Number(plan.price) || 0), 0) / total)
      : 0;

    return { total, active, inactive, averagePrice };
  }, [myPlans]);

  const navLinks = [
    { label: "Plans", to: `${basePath}/gymplans`, disabled: false, show: true },
    { label: "My Plans", to: `${basePath}/myplans`, disabled: false, show: isAdmin },
    { label: "Create Plan", to: `${basePath}/gymplans/create`, disabled: false, show: isAdmin },
    { label: "Booking Requests", to: "/admin/booking-requests", disabled: false, show: isAdmin },
  ];

  if (!isAdmin) {
    return (
      <main className="gym-plans-page">
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, color: "#fff" }}>
          <p>Access restricted: only admins can view My Plans.</p>
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
        <nav className="plans-top-nav" aria-label="Admin plan navigation">
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
        </nav>

        <section
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #3b82f6 100%)",
            color: "#e2e8f0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, letterSpacing: 1, textTransform: "uppercase", fontSize: 12, opacity: 0.8 }}>
                Admin Workspace
              </p>
              <h2 style={{ margin: "6px 0 4px", fontSize: 26, color: "#fff" }}>My Plans</h2>
              <p style={{ margin: 0, color: "#cbd5e1", maxWidth: 620 }}>
                Review, filter, and refresh the programs tied to your admin account.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={loadPlans}
                style={{ ...buttonStyle, background: "rgba(226, 232, 240, 0.16)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                Refresh
              </button>
              <Link
                to="/admin/gymplans/create"
                style={{ ...buttonStyle, background: "#22c55e", color: "#0b1324", boxShadow: "0 10px 25px rgba(34, 197, 94, 0.35)" }}
              >
                Create Plan
              </Link>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <span style={chipStyle}>Total: {stats.total}</span>
            <span style={chipStyle}>Active: {stats.active}</span>
            <span style={chipStyle}>Inactive: {stats.inactive}</span>
            <span style={chipStyle}>Avg Price: {stats.total ? formatCurrency(stats.averagePrice) : "N/A"}</span>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <label htmlFor="plan-search" style={{ display: "block", fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
                Quick filter
              </label>
              <input
                id="plan-search"
                type="search"
                placeholder="Search by name, focus, difficulty, trainer..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["all", "active", "inactive"].map((status) => {
                const isActive = statusFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    style={{
                      ...filterPillStyle,
                      background: isActive ? "#0f172a" : filterPillStyle.background,
                      color: isActive ? "#e2e8f0" : filterPillStyle.color,
                      border: isActive ? "1px solid #0f172a" : filterPillStyle.border,
                    }}
                    aria-pressed={isActive}
                  >
                    {status === "all" ? "All" : status === "active" ? "Active" : "Inactive"}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                style={{ ...filterPillStyle, background: "#fff" }}
              >
                Reset
              </button>
            </div>
          </div>

          {error ? (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <p style={{ margin: "16px 0 0", color: "#475569" }}>Loading plans...</p>
          ) : filteredPlans.length === 0 ? (
            <div style={{ marginTop: 18, padding: 18, borderRadius: 14, background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#0f172a" }}>
              <p style={{ margin: 0, fontWeight: 700 }}>No plans match the current filters.</p>
              <p style={{ margin: "6px 0 0" }}>Try clearing the search or changing the status filter.</p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 24,
                marginTop: 18,
              }}
            >
              {filteredPlans.map((plan, index) => {
                const badge = getPlanBadge(plan, index);

                return (
                  <article
                    key={plan.id}
                    className={`plan-pricing-card ${badge ? "plan-pricing-card-highlighted" : ""}`}
                    onMouseMove={handleCardMove}
                    onMouseLeave={handleCardLeave}
                  >
                    <div className="plan-inner-glow" />
                    <div className="plan-card-blur" />

                    {badge ? <div className="plan-highlight">{badge}</div> : null}

                    <div className="plan-card-icon">{getPlanIcon(plan)}</div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <h3 className="plan-card-name">{plan.name}</h3>
                        <p className="plan-card-description">{plan.description}</p>
                      </div>
                      <span className={`plan-status-pill ${plan.active ? "is-active" : "is-inactive"}`}>
                        {plan.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                      <span style={chipStyle}>{plan.focusArea || "General fitness"}</span>
                      <span style={chipStyle}>{plan.difficulty || "Mixed"}</span>
                      <span style={chipStyle}>{plan.sessionsPerWeek ?? "N/A"} sessions/week</span>
                      <span style={chipStyle}>{plan.durationWeeks ?? "N/A"} weeks</span>
                    </div>

                    <div className="plan-card-price" style={{ marginTop: 18 }}>
                      {formatCurrency(plan.price)}
                      <span>/plan</span>
                    </div>

                    <ul className="plan-card-features">
                      <li>{plan.trainer?.fullName || `Trainer ${plan.trainer?.id ?? plan.trainerId ?? "unassigned"}`}</li>
                      <li>Created: {formatDate(plan.createdAt)}</li>
                      <li>Updated: {formatDate(plan.updatedAt)}</li>
                    </ul>

                    <button
                      type="button"
                      className="plan-card-button"
                      disabled
                      title="Booking is client-only"
                    >
                      Client-only booking
                    </button>

                    <p className="plan-card-comparison">
                      {plan.active ? "Built for consistent progress" : "Currently unavailable for booking"}
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

export default AdminMyPlansPage;
