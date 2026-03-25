import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../utils/AuthProvider";
import "./GymPlansPage.css";

const cardStyle = {
  background: "#ffffff",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
};

const labelStyle = { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "#475569", marginBottom: 4 };
const valueStyle = { fontSize: 16, fontWeight: 600, color: "#0f172a", wordBreak: "break-word" };

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { headers };
};

const getErrorMessage = (err, fallbackMessage) => {
  const responseData = err?.response?.data;

  if (typeof responseData === "string" && responseData.trim()) return responseData;
  if (responseData && typeof responseData === "object") {
    if (typeof responseData.message === "string" && responseData.message.trim()) return responseData.message;
    if (typeof responseData.error === "string" && responseData.error.trim()) return responseData.error;
  }
  if (typeof err?.message === "string" && err.message.trim()) return err.message;
  return fallbackMessage;
};

const ProfilePage = () => {
  const { user: authUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const storedUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const userId = authUser?.id || storedUser?.id;
  const role = authUser?.role || storedUser?.role;

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setError("User id missing. Please sign in again.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await api.get(`/api/auth/users/${userId}`, getAuthConfig());
      setUserData(response.data);
      setFormData(response.data || {});
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load profile."));
      // Fallback to stored user if available
      if (storedUser) {
        setUserData(storedUser);
        setFormData(storedUser);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, storedUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (!userId && !userData) {
    return (
      <main className="gym-plans-page">
        <div style={{ maxWidth: 800, margin: "0 auto", ...cardStyle }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Profile</h2>
          <p style={{ marginTop: 8, color: "#475569" }}>
            No user details found. Please log in again.
          </p>
          <Link to="/login" style={{ display: "inline-flex", gap: 8, alignItems: "center", marginTop: 12, fontWeight: 600 }}>
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="gym-plans-page">
        <div style={{ maxWidth: 800, margin: "0 auto", ...cardStyle }}>
          <p style={{ margin: 0, color: "#475569" }}>Loading profile...</p>
        </div>
      </main>
    );
  }

  const user = userData || storedUser || authUser;

  const editableForClient = ["address", "fitnessGoals", "height", "weight"];
  const editableAll = ["fullName", "email", "phone", "address", "fitnessGoals", "height", "weight", "aadharNumber", "panNumber", "role"];
  const allowedFields = role === "CLIENT" ? editableForClient : editableAll;

  const rows = [
    { key: "id", label: "User ID", value: user?.id ?? "N/A", editable: false },
    { key: "fullName", label: "Full Name", value: user?.fullName || user?.username || "N/A", editable: allowedFields.includes("fullName") },
    { key: "email", label: "Email", value: user?.email || "N/A", editable: allowedFields.includes("email") },
    { key: "role", label: "Role", value: user?.role || "N/A", editable: false },
    { key: "phone", label: "Phone", value: user?.phone || "N/A", editable: allowedFields.includes("phone") },
    { key: "address", label: "Address", value: user?.address || "N/A", editable: allowedFields.includes("address") },
    { key: "fitnessGoals", label: "Fitness Goals", value: user?.fitnessGoals || "N/A", editable: allowedFields.includes("fitnessGoals") },
    { key: "height", label: "Height", value: user?.height ?? "N/A", editable: allowedFields.includes("height") },
    { key: "weight", label: "Weight", value: user?.weight ?? "N/A", editable: allowedFields.includes("weight") },
    { key: "aadharNumber", label: "Aadhar Number", value: user?.aadharNumber || "N/A", editable: allowedFields.includes("aadharNumber") },
    { key: "panNumber", label: "PAN Number", value: user?.panNumber || "N/A", editable: allowedFields.includes("panNumber") },
  ];

  const handleEditToggle = () => {
    setIsEditing((prev) => !prev);
    setError("");
    if (!isEditing) {
      setFormData(user || {});
    }
  };

  const handleChange = (key, value) => {
    if (!allowedFields.includes(key)) return;
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    setError("");
    try {
      const payload = allowedFields.reduce((acc, key) => {
        acc[key] = formData[key] ?? null;
        return acc;
      }, {});
      const response = await api.put(`/api/auth/users/${userId}`, payload, getAuthConfig());
      const updated = response.data || { ...user, ...payload };
      setUserData(updated);
      setFormData(updated);
      setIsEditing(false);
      try {
        localStorage.setItem("user", JSON.stringify(updated));
      } catch {
        // ignore localStorage write failures
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update profile."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="gym-plans-page">
      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 18 }}>
        <section style={{ ...cardStyle, background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "#e2e8f0",
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 24,
                }}
              >
                {(user?.fullName || user?.username || "U").charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, letterSpacing: 1, textTransform: "uppercase", fontSize: 12, color: "#475569" }}>Profile</p>
                <h2 style={{ margin: "4px 0 2px", fontSize: 26, color: "#0f172a" }}>
                  {user?.fullName || user?.username || "User"}
                </h2>
                <p style={{ margin: 0, color: "#475569" }}>{user?.email}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={loadProfile}
                disabled={isSaving}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontWeight: 700,
                  background: "#fff",
                  color: "#0f172a",
                  cursor: "pointer",
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                Refresh
              </button>
              {allowedFields.length > 0 ? (
                isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      style={{
                        border: "none",
                        borderRadius: 12,
                        padding: "10px 14px",
                        fontWeight: 700,
                        background: "#22c55e",
                        color: "#0b1324",
                        cursor: "pointer",
                        boxShadow: "0 10px 20px rgba(34, 197, 94, 0.25)",
                        opacity: isSaving ? 0.8 : 1,
                      }}
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData(user || {});
                      }}
                      disabled={isSaving}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: "10px 14px",
                        fontWeight: 700,
                        background: "#fff",
                        color: "#0f172a",
                        cursor: "pointer",
                        opacity: isSaving ? 0.7 : 1,
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleEditToggle}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: "10px 14px",
                      fontWeight: 700,
                      background: "#f8fafc",
                      color: "#0f172a",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                )
              ) : null}
            </div>
          </div>
          {error ? <p style={{ marginTop: 10, color: "#b91c1c" }}>{error}</p> : null}
        </section>

        <section style={cardStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {rows.map((row) => {
              const isEditable = row.editable && isEditing;
              return (
                <div
                  key={row.label}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    padding: 12,
                    background: "#f8fafc",
                  }}
                >
                  <div style={labelStyle}>{row.label}</div>
                  {isEditable ? (
                    <input
                      type="text"
                      value={formData[row.key] ?? ""}
                      onChange={(e) => handleChange(row.key, e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #cbd5e1",
                        background: "#fff",
                        fontSize: 14,
                        color: "#0f172a",
                      }}
                    />
                  ) : (
                    <div style={valueStyle}>{row.value}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
};

export default ProfilePage;
