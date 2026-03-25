import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../utils/AuthProvider";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  durationWeeks: "",
  focusArea: "",
  sessionsPerWeek: "",
  difficulty: "Beginner",
  trainerId: "",
  active: true,
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

const CreateGymPlanPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "ADMIN";

  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isAdmin) {
      setError("Only admins can create gym plans.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      durationWeeks: Number(form.durationWeeks),
      focusArea: form.focusArea.trim(),
      sessionsPerWeek: Number(form.sessionsPerWeek),
      difficulty: form.difficulty,
      active: Boolean(form.active),
    };

    if (form.trainerId !== "") {
      payload.trainerId = Number(form.trainerId);
    }

    try {
      await api.post("/api/plans", payload, getAuthConfig());
      setSuccess("Gym plan created successfully.");
      setTimeout(() => {
        navigate("/admin/gymplans");
      }, 700);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create gym plan."));
    } finally {
      setIsSaving(false);
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
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 24 }}>
        <section
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #09111f 0%, #132238 52%, #1d4ed8 100%)",
            color: "#fff",
          }}
        >
          <p style={{ margin: 0, opacity: 0.8, letterSpacing: 1.2, textTransform: "uppercase", fontSize: 12 }}>
            FitSphere Admin
          </p>
          <h1 style={{ margin: "12px 0 10px", fontSize: 34 }}>Create Gym Plan</h1>
          <p style={{ margin: 0, maxWidth: 720, lineHeight: 1.6, opacity: 0.92 }}>
            Add a new training program with pricing, duration, difficulty, and an optional trainer assignment.
          </p>
        </section>

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
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24 }}>Plan Details</h2>
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                This page is intended for admin plan creation only.
              </p>
            </div>
            <Link
              to="/admin/gymplans"
              style={{ ...buttonStyle, background: "#e2e8f0", color: "#0f172a" }}
            >
              Back to Plans
            </Link>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Plan name" required style={fieldStyle} />
              <input name="focusArea" value={form.focusArea} onChange={handleChange} placeholder="Focus area" required style={fieldStyle} />
              <input name="price" type="number" min="0" value={form.price} onChange={handleChange} placeholder="Price" required style={fieldStyle} />
              <input name="durationWeeks" type="number" min="1" value={form.durationWeeks} onChange={handleChange} placeholder="Duration in weeks" required style={fieldStyle} />
              <input name="sessionsPerWeek" type="number" min="1" value={form.sessionsPerWeek} onChange={handleChange} placeholder="Sessions per week" required style={fieldStyle} />
              <select name="difficulty" value={form.difficulty} onChange={handleChange} style={fieldStyle}>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
              <input name="trainerId" type="number" min="1" value={form.trainerId} onChange={handleChange} placeholder="Trainer ID (optional)" style={fieldStyle} />
            </div>

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Plan description"
              required
              rows={5}
              style={{ ...fieldStyle, resize: "vertical" }}
            />

            <label style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "#334155", fontWeight: 500 }}>
              <input name="active" type="checkbox" checked={form.active} onChange={handleChange} />
              Mark this plan as active
            </label>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="submit" disabled={isSaving} style={{ ...buttonStyle, background: "#2563eb", color: "#fff" }}>
                {isSaving ? "Creating..." : "Create Plan"}
              </button>
              <button type="button" onClick={resetForm} style={{ ...buttonStyle, background: "#e2e8f0", color: "#0f172a" }}>
                Reset
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
};

export default CreateGymPlanPage;
