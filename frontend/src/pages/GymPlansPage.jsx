import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

  if (focusArea.includes("cardio")) return "⚡";
  if (focusArea.includes("strength")) return "🏋";
  if (focusArea.includes("mobility")) return "🧘";
  if (focusArea.includes("full")) return "🔥";
  if (difficulty.includes("advanced")) return "🏆";
  if (difficulty.includes("intermediate")) return "🚀";
  return "💪";
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

const GymPlansPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isClient = user?.role === "CLIENT";
  const basePath = user?.role === "ADMIN" ? "/admin" : user?.role === "TRAINER" ? "/trainer" : "/client";
  const navigate = useNavigate();
  const location = useLocation();

  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPlans = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await api.get("/api/plans");
      setPlans(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load gym plans."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleViewPlan = (planId) => {
    if (!isClient) return;
    navigate(`/client/plan-booking/${planId}`);
  };

  const navLinks = [
    { label: "Plans", to: `${basePath}/gymplans`, disabled: false, show: true },
    { label: "My Plans", to: "/admin/myplans", disabled: false, show: isAdmin },
    { label: "Create Plan", to: "/admin/gymplans/create", disabled: false, show: isAdmin },
    { label: "My Bookings", to: "/client/bookings", disabled: false, show: user?.role === "CLIENT" },
    { label: "Booking Requests", to: "/admin/booking-requests", disabled: false, show: isAdmin },
  ];

  return (
    <main className="gym-plans-page">
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gap: 24 }}>
        {/* <nav className="plans-top-nav" aria-label="Gym plan navigation">
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

        {/* <section
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #09111f 0%, #132238 52%, #1d4ed8 100%)",
            color: "#fff",
          }}
        >
          <p style={{ margin: 0, opacity: 0.8, letterSpacing: 1.2, textTransform: "uppercase", fontSize: 12 }}>
            FitSphere Programs
          </p>
          <h1 style={{ margin: "12px 0 10px", fontSize: 34 }}>Gym Plans</h1>
          <p style={{ margin: 0, maxWidth: 760, lineHeight: 1.6, opacity: 0.92 }}>
            Explore FitSphere training plans across strength, cardio, mobility, and full-body programs.
            Admins can create and manage plans from a dedicated creation page.
          </p>
        </section> */}

        {error ? (
          <div style={{ ...cardStyle, border: "1px solid #fecaca", color: "#b91c1c", background: "#fef2f2" }}>
            {error}
          </div>
        ) : null}

        {/* {isAdmin ? (
          <section style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 24 }}>Admin Controls</h2>
                <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                  Open the plan creation page to add a new FitSphere program.
                </p>
              </div>
              <Link
                to="/admin/gymplans/create"
                style={{ ...buttonStyle, background: "#2563eb", color: "#fff", textDecoration: "none" }}
              >
                Create New Plan
              </Link>
            </div>
          </section>
        ) : null} */}

        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 20, flexWrap: "wrap", }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24 }}>Available Plans</h2>
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                Browse the current list of programs available in FitSphere.
              </p>
            </div>
            <button
              type="button"
              onClick={loadPlans}
              style={{ ...buttonStyle, background: "#e2e8f0", color: "#0f172a" }}
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p style={{ margin: 0, color: "#475569" }}>Loading gym plans...</p>
          ) : plans.length === 0 ? (
            <p style={{ margin: 0, color: "#475569" }}>No gym plans found.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 24,
              }}
            >
              {plans.map((plan, index) => {
                const badge = getPlanBadge(plan, index);

                return (
                <article
                  key={plan.id}
                  className={`plan-pricing-card ${badge ? 'plan-pricing-card-highlighted' : ''}`}
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

                  <div className="plan-card-price">
                    {formatCurrency(plan.price)}
                    <span>/plan</span>
                  </div>

                  <ul className="plan-card-features">
                    <li>{plan.focusArea || "General fitness"} focus</li>
                    <li>{plan.difficulty || "Mixed"} difficulty</li>
                    <li>{plan.durationWeeks ?? "N/A"} week program</li>
                    <li>{plan.sessionsPerWeek ?? "N/A"} sessions each week</li>
                    <li>{plan.trainer?.fullName || `Trainer ${plan.trainer?.id ?? plan.trainerId ?? "unassigned"}`}</li>
                  </ul>

                  <button
                    type="button"
                    className="plan-card-button"
                    onClick={() => handleViewPlan(plan.id)}
                    disabled={!isClient}
                    title={isClient ? "Open booking form" : "Only clients can book plans"}
                  >
                    {isClient ? "Book Plan" : "Client-only booking"}
                  </button>

                  <p className="plan-card-comparison">
                    {plan.active
                      ? "Built for consistent progress"
                      : "Currently unavailable for booking"}
                  </p>
                </article>
              )
              })}
             </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default GymPlansPage;
