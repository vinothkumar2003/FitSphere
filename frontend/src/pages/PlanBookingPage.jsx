import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../utils/AuthProvider";

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

const fieldStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #d6d9e0",
  borderRadius: 12,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};
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

const PlanBookingPage = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const basePath = "/client";

  const [profileFields, setProfileFields] = useState({
    address: user?.address || "",
    aadharNumber: user?.aadharNumber || "",
    panNumber: user?.panNumber || "",
    phone: user?.phone || "",
    fitnessGoals: user?.fitnessGoals || "",
    height: user?.height ?? "",
    weight: user?.weight ?? "",
  });
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);

  const missingFields = useMemo(() => {
    const missing = [];
    if (!profileFields.address.trim()) missing.push("address");
    if (!profileFields.aadharNumber.trim()) missing.push("aadharNumber");
    if (!profileFields.panNumber.trim()) missing.push("panNumber");
    if (!profileFields.phone.toString().trim()) missing.push("phone");
    if (!profileFields.fitnessGoals.toString().trim()) missing.push("fitnessGoals");
    if (profileFields.height === "" || Number.isNaN(Number(profileFields.height))) missing.push("height");
    if (profileFields.weight === "" || Number.isNaN(Number(profileFields.weight))) missing.push("weight");
    return missing;
  }, [profileFields]);
  const hasMissingRequiredFields = missingFields.length > 0;

  const [plan, setPlan] = useState(null);
  const [notes, setNotes] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPlan = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await api.get(`/api/plans/${planId}`);
      setPlan(response.data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load plan details."));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProfileIfNeeded = async () => {
    if (!user?.id) return;
    const alreadyHasAll =
      user.address && user.aadharNumber && user.panNumber && user.phone && user.fitnessGoals && user.height != null && user.weight != null;
    if (alreadyHasAll) return;

    setIsFetchingProfile(true);
    try {
      const response = await api.get(`/api/auth/users/${user.id}`, getAuthConfig());
      const remote = response.data || {};
      const mergedUser = { ...user, ...remote };
      setProfileFields({
        address: mergedUser.address || "",
        aadharNumber: mergedUser.aadharNumber || "",
        panNumber: mergedUser.panNumber || "",
        phone: mergedUser.phone || "",
        fitnessGoals: mergedUser.fitnessGoals || "",
        height: mergedUser.height ?? "",
        weight: mergedUser.weight ?? "",
      });
      login(mergedUser);
      localStorage.setItem("user", JSON.stringify(mergedUser));
    } catch (err) {
      // keep silent but allow manual entry
      console.warn("Failed to fetch user profile", err);
    } finally {
      setIsFetchingProfile(false);
    }
  };

  useEffect(() => {
    fetchUserProfileIfNeeded();
    loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (user?.role !== "CLIENT") {
      setError("Only clients can book plans.");
      return;
    }

    if (missingFields.length > 0) {
      setError(`Complete user details before booking plan. Missing: ${missingFields.join(", ")}`);
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    const payload = {
      user: {
        id: user?.id,
        address: profileFields.address.trim(),
        aadharNumber: profileFields.aadharNumber.trim(),
        panNumber: profileFields.panNumber.trim(),
        phone: profileFields.phone.toString().trim(),
        fitnessGoals: profileFields.fitnessGoals.toString().trim(),
        height: profileFields.height === "" ? null : Number(profileFields.height),
        weight: profileFields.weight === "" ? null : Number(profileFields.weight),
      },
    };
    if (notes.trim()) payload.notes = notes.trim();
    if (amountPaid !== "" && !Number.isNaN(Number(amountPaid))) {
      payload.amountPaid = Number(amountPaid);
    }

    try {
      await api.post(
        "/api/bookings",
        payload,
        {
          ...getAuthConfig(),
          params: {
            planId,
            trainerId: plan?.trainer?.id,
          },
        }
      );
      setSuccess("Booking submitted. Status is PENDING until an admin approves it.");
      const updatedUser = {
        ...user,
        address: payload.user.address,
        aadharNumber: payload.user.aadharNumber,
        panNumber: payload.user.panNumber,
        phone: payload.user.phone,
        fitnessGoals: payload.user.fitnessGoals,
        height: payload.user.height,
        weight: payload.user.weight,
      };
      login(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setTimeout(() => {
        navigate(`${basePath}/gymplans`);
      }, 700);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to book plan."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 32,
        background: "linear-gradient(135deg, #f4f7fb 0%, #e8eff8 100%)",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto", display: "grid", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Plan Booking</h1>
          <Link
            to={`${basePath}/gymplans`}
            style={{ ...buttonStyle, background: "#e2e8f0", color: "#0f172a" }}
          >
            Back to Plans
          </Link>
        </div>

        {hasMissingRequiredFields ? (
          <div style={{ ...cardStyle, border: "1px solid #fef08a", color: "#854d0e", background: "#fffbeb" }}>
            Please complete your profile to book a plan. Missing: {missingFields.join(", ") || "details"}.
          </div>
        ) : null}

        {error ? (
          <div style={{ ...cardStyle, border: "1px solid #fecaca", color: "#b91c1c", background: "#fef2f2" }}>
            {error}
          </div>
        ) : null}

        {success ? (
          <div style={{ ...cardStyle, border: "1px solid #bbf7d0", color: "#166534", background: "#f0fdf4" }}>
            {success}
          </div>
        ) : null}

        <section style={cardStyle}>
          {isLoading ? (
            <p style={{ margin: 0, color: "#475569" }}>
              Loading plan details{isFetchingProfile ? " and profile..." : "..."}
            </p>
          ) : !plan ? (
            <p style={{ margin: 0, color: "#475569" }}>Plan not found.</p>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ margin: "0 0 6px", fontSize: 24 }}>{plan.name}</h2>
                  <p style={{ margin: "0 0 10px", color: "#475569" }}>{plan.description}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, color: "#0f172a", fontWeight: 600 }}>
                    <span>Price: {plan.price ?? "N/A"}</span>
                    <span>| Duration: {plan.durationWeeks ?? "N/A"} weeks</span>
                    <span>| Sessions: {plan.sessionsPerWeek ?? "N/A"} / week</span>
                  </div>
                </div>
                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: 10,
                    background: plan.active ? "#e0f2fe" : "#fee2e2",
                    color: plan.active ? "#0c4a6e" : "#b91c1c",
                    fontWeight: 700,
                  }}
                >
                  {plan.active ? "Active" : "Inactive"}
                </span>
              </div>

              <hr style={{ margin: "18px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />

              <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <label style={{ fontWeight: 600, color: "#0f172a" }} htmlFor="notes">
                    Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    rows={4}
                    style={{ ...fieldStyle, resize: "vertical" }}
                    placeholder="Share preferences or schedule notes for the trainer"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <label style={{ fontWeight: 600, color: "#0f172a" }} htmlFor="amountPaid">
                    Amount to pay now (optional)
                  </label>
                  <input
                    id="amountPaid"
                    type="number"
                    min="0"
                    step="0.01"
                    style={fieldStyle}
                    placeholder="Leave empty to use the default plan price"
                    value={amountPaid}
                    onChange={(event) => setAmountPaid(event.target.value)}
                  />
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <label style={{ fontWeight: 600, color: "#0f172a" }} htmlFor="address">
                    Address (required)
                  </label>
                  <input
                    id="address"
                    type="text"
                    style={fieldStyle}
                    placeholder="House / Street / City"
                    value={profileFields.address}
                    onChange={(event) =>
                      setProfileFields((prev) => ({ ...prev, address: event.target.value }))
                    }
                    required
                  />
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <label style={{ fontWeight: 600, color: "#0f172a" }} htmlFor="phone">
                    Phone (required)
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    style={fieldStyle}
                    placeholder="Phone number"
                    value={profileFields.phone}
                    onChange={(event) =>
                      setProfileFields((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    required
                  />
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <label style={{ fontWeight: 600, color: "#0f172a" }} htmlFor="aadharNumber">
                    Aadhar Number (required)
                  </label>
                  <input
                    id="aadharNumber"
                    type="text"
                    style={fieldStyle}
                    placeholder="12-digit Aadhar"
                    value={profileFields.aadharNumber}
                    onChange={(event) =>
                      setProfileFields((prev) => ({ ...prev, aadharNumber: event.target.value }))
                    }
                    required
                  />
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <label style={{ fontWeight: 600, color: "#0f172a" }} htmlFor="panNumber">
                    PAN Number (required)
                  </label>
                  <input
                    id="panNumber"
                    type="text"
                    style={fieldStyle}
                    placeholder="ABCDE1234F"
                    value={profileFields.panNumber}
                    onChange={(event) =>
                      setProfileFields((prev) => ({ ...prev, panNumber: event.target.value }))
                    }
                    required
                  />
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <label style={{ fontWeight: 600, color: "#0f172a" }} htmlFor="fitnessGoals">
                    Fitness Goals (required)
                  </label>
                  <input
                    id="fitnessGoals"
                    type="text"
                    style={fieldStyle}
                    placeholder="e.g., Weight loss, Strength"
                    value={profileFields.fitnessGoals}
                    onChange={(event) =>
                      setProfileFields((prev) => ({ ...prev, fitnessGoals: event.target.value }))
                    }
                    required
                  />
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <label style={{ fontWeight: 600, color: "#0f172a" }} htmlFor="height">
                    Height in cm (required)
                  </label>
                  <input
                    id="height"
                    type="number"
                    min="0"
                    step="0.1"
                    style={fieldStyle}
                    placeholder="Height"
                    value={profileFields.height}
                    onChange={(event) =>
                      setProfileFields((prev) => ({ ...prev, height: event.target.value }))
                    }
                    required
                  />
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <label style={{ fontWeight: 600, color: "#0f172a" }} htmlFor="weight">
                    Weight in kg (required)
                  </label>
                  <input
                    id="weight"
                    type="number"
                    min="0"
                    step="0.1"
                    style={fieldStyle}
                    placeholder="Weight"
                    value={profileFields.weight}
                    onChange={(event) =>
                      setProfileFields((prev) => ({ ...prev, weight: event.target.value }))
                    }
                    required
                  />
                </div>

                {user?.role !== "CLIENT" ? (
                  <p style={{ margin: 0, color: "#b91c1c" }}>
                    Only clients can book plans. Switch to a client account to proceed.
                  </p>
                ) : null}

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    type="submit"
                    disabled={isSubmitting || !plan?.active || hasMissingRequiredFields}
                    style={{
                      ...buttonStyle,
                      background: hasMissingRequiredFields
                        ? "#f97316"
                        : plan?.active
                        ? "#2563eb"
                        : "#94a3b8",
                      color: "#fff",
                      opacity: isSubmitting ? 0.8 : 1,
                    }}
                  >
                    {hasMissingRequiredFields
                      ? "Complete Profile to Book"
                      : isSubmitting
                      ? "Booking..."
                      : "Confirm Booking"}
                  </button>
                  <Link
                    to={`${basePath}/gymplans`}
                    style={{ ...buttonStyle, background: "#e2e8f0", color: "#0f172a" }}
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
};

export default PlanBookingPage;
