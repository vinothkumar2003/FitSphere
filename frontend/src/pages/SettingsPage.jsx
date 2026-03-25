import { useMemo, useState } from "react";
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
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

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

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const role = user?.role;
  const isAdmin = role === "ADMIN";
  const isTrainer = role === "TRAINER";
  const isClient = role === "CLIENT";
  const basePath = isAdmin ? "/admin" : isTrainer ? "/trainer" : "/client";

  const navLinks = useMemo(() => {
    const common = [
      { label: "Dashboard", to: basePath },
      { label: "Profile", to: `${basePath}/profile` },
      { label: "Settings", to: `${basePath}/settings` },
    ];

    if (isAdmin || isTrainer) {
      common.splice(2, 0, { label: "Users", to: `${basePath}/users` });
    }

    if (isClient) {
      common.splice(1, 0, { label: "Plans", to: `${basePath}/gymplans` });
    }

    return common;
  }, [basePath, isAdmin, isClient, isTrainer]);

  const handleLogout = () => {
    logout?.();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) {
      setError("User details missing. Please sign in again.");
      return;
    }

    if (!confirmDelete) {
      setError("Please confirm account deletion before continuing.");
      return;
    }

    const approved = window.confirm("Delete this account permanently? This action cannot be undone.");
    if (!approved) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await api.delete(`/api/auth/users/${user.id}`, getAuthConfig());
      logout?.();
      navigate("/login");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete account."));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAdmin && !isTrainer && !isClient) {
    return (
      <main className="gym-plans-page">
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, color: "#fff" }}>
          <p>Please sign in to view settings.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="gym-plans-page">
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 24 }}>
        {/* <nav className="plans-top-nav" aria-label="Settings navigation">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`plans-top-nav-link ${location.pathname === link.to ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav> */}

        <section
          style={{
            ...cardStyle,
            background: isAdmin
              ? "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #ea580c 100%)"
              : isTrainer
              ? "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #16a34a 100%)"
              : "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #2563eb 100%)",
            color: "#e2e8f0",
          }}
        >
          <p style={{ margin: 0, letterSpacing: 1, textTransform: "uppercase", fontSize: 12, opacity: 0.8 }}>
            Account Center
          </p>
          <h2 style={{ margin: "6px 0 4px", fontSize: 28, color: "#fff" }}>Settings</h2>
          <p style={{ margin: 0, color: "#cbd5e1", maxWidth: 680 }}>
            Manage your profile access, sign out safely, or remove your account when needed.
          </p>
        </section>

        {error ? (
          <div style={{ ...cardStyle, border: "1px solid #fecaca", color: "#b91c1c", background: "#fef2f2" }}>{error}</div>
        ) : null}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          <article style={{ ...cardStyle, display: "grid", gap: 14 }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, color: "#64748b" }}>Profile</p>
              <h3 style={{ margin: "8px 0 6px", color: "#0f172a" }}>Update personal details</h3>
              <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
                Open your profile page to review and edit account information.
              </p>
            </div>
            <Link to={`${basePath}/profile`} style={{ ...buttonStyle, background: "#dbeafe", color: "#1d4ed8" }}>
              Go to Profile
            </Link>
          </article>

          <article style={{ ...cardStyle, display: "grid", gap: 14 }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, color: "#64748b" }}>Session</p>
              <h3 style={{ margin: "8px 0 6px", color: "#0f172a" }}>Log out securely</h3>
              <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
                Sign out from this device and return to the login page.
              </p>
            </div>
            <button type="button" onClick={handleLogout} style={{ ...buttonStyle, background: "#e2e8f0", color: "#0f172a" }}>
              Logout
            </button>
          </article>

          <article style={{ ...cardStyle, display: "grid", gap: 14, border: "1px solid #fecaca", background: "#fff7f7" }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, color: "#b91c1c" }}>Danger Zone</p>
              <h3 style={{ margin: "8px 0 6px", color: "#7f1d1d" }}>Delete account</h3>
              <p style={{ margin: 0, color: "#7f1d1d", lineHeight: 1.6 }}>
                Permanently remove this account and clear the current session.
              </p>
            </div>
            <label style={{ display: "inline-flex", gap: 10, alignItems: "center", color: "#7f1d1d", fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={confirmDelete}
                onChange={(event) => setConfirmDelete(event.target.checked)}
              />
              I understand this action cannot be undone
            </label>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              style={{
                ...buttonStyle,
                background: isDeleting ? "#fca5a5" : "#dc2626",
                color: "#fff",
              }}
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </button>
          </article>
        </section>
      </div>
    </main>
  );
};

export default SettingsPage;
