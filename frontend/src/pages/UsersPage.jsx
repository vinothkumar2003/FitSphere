import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../utils/AuthProvider";
import "./GymPlansPage.css";
import "./UsersPage.css";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  const headers = { Accept: "application/json", "Content-Type": "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

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

const roleStyles = {
  ADMIN: { label: "Admin", className: "users-role-pill is-admin" },
  TRAINER: { label: "Trainer", className: "users-role-pill is-trainer" },
  CLIENT: { label: "Client", className: "users-role-pill is-client" },
};

const getInitials = (user) =>
  (user.fullName || user.username || "User")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

const truncateText = (value, maxLength = 10) => {
  if (!value) return "N/A";
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
};

const UsersPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isTrainer = user?.role === "TRAINER";
  const canViewUsers = isAdmin || isTrainer;

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await api.get("/api/auth/users", getAuthConfig());
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load users."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canViewUsers) {
      setIsLoading(false);
      return;
    }

    loadUsers();
  }, [canViewUsers, loadUsers]);

  useEffect(() => {
    if (!selectedUser) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedUser(null);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedUser]);

  const stats = useMemo(() => {
    return users.reduce(
      (summary, currentUser) => {
        summary.total += 1;

        if (currentUser.role === "ADMIN") summary.admins += 1;
        if (currentUser.role === "TRAINER") summary.trainers += 1;
        if (currentUser.role === "CLIENT") summary.clients += 1;

        return summary;
      },
      { total: 0, admins: 0, trainers: 0, clients: 0 }
    );
  }, [users]);

  if (!canViewUsers) {
    return (
      <main className="gym-plans-page">
        <section className="users-page users-page--restricted">
          <div className="users-restricted-card">
            <p className="users-eyebrow">Users</p>
            <h2>Access restricted</h2>
            <p>Only admins and trainers can view the user directory.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="gym-plans-page">
      <div className="users-page">
        <section className="users-hero-card">
          <div className="users-hero-copy">
            <p className="users-eyebrow">Directory</p>
            <h1>All Users</h1>
            <p className="users-hero-text">
              Browse every registered account with role badges, contact details, and live status in a layout that stays
              readable on desktop and mobile.
            </p>
          </div>

          <button type="button" className="users-refresh-button" onClick={loadUsers} disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </section>

        <section className="users-stats-grid" aria-label="User statistics">
          <article className="users-stat-card">
            <span>Total Users</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="users-stat-card">
            <span>Admins</span>
            <strong>{stats.admins}</strong>
          </article>
          <article className="users-stat-card">
            <span>Trainers</span>
            <strong>{stats.trainers}</strong>
          </article>
          <article className="users-stat-card">
            <span>Clients</span>
            <strong>{stats.clients}</strong>
          </article>
        </section>

        <section className="users-list-card">
          <div className="users-list-header">
            <div>
              <p className="users-eyebrow">Members</p>
              <h2>User Directory</h2>
            </div>
            <p className="users-list-subtitle">{users.length} records available</p>
          </div>

          {error ? <div className="users-alert users-alert--error">{error}</div> : null}

          {isLoading ? (
            <div className="users-empty-state">
              <h3>Loading users...</h3>
              <p>Please wait while we fetch the latest directory.</p>
            </div>
          ) : users.length === 0 ? (
            <div className="users-empty-state">
              <h3>No users found</h3>
              <p>Try refreshing the page or confirm the API is returning user data.</p>
            </div>
          ) : (
            <div className="users-grid">
              {users.map((currentUser) => {
                const roleInfo = roleStyles[currentUser.role] || {
                  label: currentUser.role || "Unknown",
                  className: "users-role-pill",
                };

                return (
                  <article
                    key={currentUser.id}
                    className="users-user-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedUser(currentUser)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedUser(currentUser);
                      }
                    }}
                  >
                    <div className="users-user-top">
                      {currentUser.profileImage ? (
                        <img
                          src={currentUser.profileImage}
                          alt={currentUser.fullName || currentUser.username || "User"}
                          className="users-avatar-image"
                        />
                      ) : (
                        <div className="users-avatar-fallback">{getInitials(currentUser)}</div>
                      )}

                      <div className="users-user-heading">
                        <h3>{currentUser.fullName || currentUser.username || "Unnamed User"}</h3>
                        <p title={currentUser.email || "No email available"}>
                          {truncateText(currentUser.email, 10)}
                        </p>
                      </div>
                    </div>

                    <div className="users-pill-row">
                      <span className={roleInfo.className}>{roleInfo.label}</span>
                      <span className="users-id-pill">ID: {currentUser.id}</span>
                      <span className={currentUser.active ? "users-status-pill is-active" : "users-status-pill is-inactive"}>
                        {currentUser.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* <dl className="users-meta-grid">
                      <div className="users-meta-item">
                        <dt>Username</dt>
                        <dd>{currentUser.username || "N/A"}</dd>
                      </div>
                      <div className="users-meta-item">
                        <dt>Phone</dt>
                        <dd>{currentUser.phone || "N/A"}</dd>
                      </div>
                      <div className="users-meta-item users-meta-item--full">
                        <dt>Address</dt>
                        <dd>{currentUser.address || "N/A"}</dd>
                      </div>
                    </dl> */}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {selectedUser ? (
        <div className="users-detail-overlay" onClick={() => setSelectedUser(null)}>
          <section
            className="users-detail-panel"
            onClick={(event) => event.stopPropagation()}
            aria-modal="true"
            role="dialog"
          >
            <div className="users-detail-header">
              <div className="users-detail-identity">
                {selectedUser.profileImage ? (
                  <img
                    src={selectedUser.profileImage}
                    alt={selectedUser.fullName || selectedUser.username || "User"}
                    className="users-detail-avatar-image"
                  />
                ) : (
                  <div className="users-detail-avatar-fallback">{getInitials(selectedUser)}</div>
                )}

                <div>
                  <p className="users-eyebrow">User Details</p>
                  <h2>{selectedUser.fullName || selectedUser.username || "Unnamed User"}</h2>
                  <p className="users-detail-email">{selectedUser.email || "No email available"}</p>
                </div>
              </div>

              <button type="button" className="users-detail-close" onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </div>

            <div className="users-pill-row">
              <span className={(roleStyles[selectedUser.role] || { className: "users-role-pill" }).className}>
                {(roleStyles[selectedUser.role] || { label: selectedUser.role || "Unknown" }).label}
              </span>
              <span className="users-id-pill">ID: {selectedUser.id}</span>
              <span className={selectedUser.active ? "users-status-pill is-active" : "users-status-pill is-inactive"}>
                {selectedUser.active ? "Active" : "Inactive"}
              </span>
            </div>

            <dl className="users-detail-grid">
              <div className="users-detail-item">
                <dt>Full Name</dt>
                <dd>{selectedUser.fullName || "N/A"}</dd>
              </div>
              <div className="users-detail-item">
                <dt>Username</dt>
                <dd>{selectedUser.username || "N/A"}</dd>
              </div>
              <div className="users-detail-item">
                <dt>Email</dt>
                <dd>{selectedUser.email || "N/A"}</dd>
              </div>
              <div className="users-detail-item">
                <dt>Phone</dt>
                <dd>{selectedUser.phone || "N/A"}</dd>
              </div>
              <div className="users-detail-item">
                <dt>Role</dt>
                <dd>{selectedUser.role || "N/A"}</dd>
              </div>
              <div className="users-detail-item">
                <dt>Status</dt>
                <dd>{selectedUser.active ? "Active" : "Inactive"}</dd>
              </div>
              <div className="users-detail-item users-detail-item--full">
                <dt>Address</dt>
                <dd>{selectedUser.address || "N/A"}</dd>
              </div>
              <div className="users-detail-item users-detail-item--full">
                <dt>Fitness Goals</dt>
                <dd>{selectedUser.fitnessGoals || "N/A"}</dd>
              </div>
              <div className="users-detail-item">
                <dt>Height</dt>
                <dd>{selectedUser.height ?? "N/A"}</dd>
              </div>
              <div className="users-detail-item">
                <dt>Weight</dt>
                <dd>{selectedUser.weight ?? "N/A"}</dd>
              </div>
              <div className="users-detail-item">
                <dt>Aadhar Number</dt>
                <dd>{selectedUser.aadharNumber || "N/A"}</dd>
              </div>
              <div className="users-detail-item">
                <dt>PAN Number</dt>
                <dd>{selectedUser.panNumber || "N/A"}</dd>
              </div>
            </dl>
          </section>
        </div>
      ) : null}
    </main>
  );
};

export default UsersPage;
