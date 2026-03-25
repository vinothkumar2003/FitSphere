import { useEffect, useMemo, useState } from "react";
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

const toDateInputValue = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (value) => {
  if (value == null || value === "") return "N/A";
  return `${value} weeks`;
};

const buildPlanOptionLabel = (planBooked) => {
  const plan = planBooked?.plan || {};
  const clientCount = Array.isArray(planBooked?.clientIds) ? planBooked.clientIds.length : 0;
  return `${plan.name || "Plan"} • ${clientCount} client${clientCount === 1 ? "" : "s"} • ${formatDuration(plan.durationWeeks)}`;
};

const WorkDonePage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const role = user?.role;
  const isAdmin = role === "ADMIN";
  const isTrainer = role === "TRAINER";
  const basePath = isAdmin ? "/admin" : "/trainer";

  const [form, setForm] = useState({
    date: toDateInputValue(),
    planBookedId: "",
    topic: "",
  });
  const [attendanceMap, setAttendanceMap] = useState({});
  const [planOptions, setPlanOptions] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [history, setHistory] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navLinks = [
    { label: "Dashboard", to: basePath },
    { label: "Users", to: `${basePath}/users` },
    { label: "Work Done", to: `${basePath}/workdone` },
    { label: "Diet & Food", to: `${basePath}/dietfoot` },
  ];

  const selectedPlanBooked = useMemo(
    () => planOptions.find((item) => String(item.id) === String(form.planBookedId)) || null,
    [planOptions, form.planBookedId]
  );

  const attendeeOptions = useMemo(() => {
    const clientIds = Array.isArray(selectedPlanBooked?.clientIds) ? selectedPlanBooked.clientIds : [];
    return clientIds.map((id) => {
      const client = usersById[id];
      return {
        id,
        name: client?.fullName || client?.username || `Client ${id}`,
        email: client?.email || "",
      };
    });
  }, [selectedPlanBooked, usersById]);

  const attendanceSummary = useMemo(() => {
    return attendeeOptions.reduce(
      (summary, client) => {
        const state = attendanceMap[client.id] || "";
        if (state === "PRESENT") summary.present.push(client.id);
        if (state === "ABSENT") summary.absent.push(client.id);
        if (!state) summary.unmarked += 1;
        return summary;
      },
      { present: [], absent: [], unmarked: 0 }
    );
  }, [attendanceMap, attendeeOptions]);

  const loadOptions = async () => {
    if (!isAdmin && !isTrainer) {
      setIsLoadingOptions(false);
      return;
    }

    setIsLoadingOptions(true);
    setError("");

    try {
      const [usersResponse, bookingsResponse] = await Promise.all([
        api.get("/api/auth/users", getAuthConfig()),
        isAdmin
          ? api.get("/api/bookings/status/APPROVED", getAuthConfig())
          : api.get(`/api/bookings/trainer/${user?.id}`, getAuthConfig()),
      ]);

      const usersList = Array.isArray(usersResponse.data) ? usersResponse.data : [];
      const usersMap = usersList.reduce((accumulator, currentUser) => {
        accumulator[currentUser.id] = currentUser;
        return accumulator;
      }, {});
      setUsersById(usersMap);

      const rawBookings = Array.isArray(bookingsResponse.data) ? bookingsResponse.data : [];
      const eligibleBookings = rawBookings.filter((booking) => {
        if (!booking?.plan?.id) return false;
        if (isAdmin) return true;
        return String(booking.status || "").toUpperCase() === "APPROVED";
      });

      const uniquePlanIds = [...new Set(eligibleBookings.map((booking) => booking.plan.id))];
      const planBookedResponses = await Promise.all(
        uniquePlanIds.map((planId) =>
          api
            .get("/api/plan-booked", {
              ...getAuthConfig(),
              params: { planId },
            })
            .then((response) => response.data)
            .catch(() => null)
        )
      );

      const planBookedMap = new Map();
      for (const entry of planBookedResponses) {
        if (!entry?.id || !entry?.plan?.id) continue;
        if (!Array.isArray(entry.clientIds) || entry.clientIds.length === 0) continue;
        planBookedMap.set(entry.id, entry);
      }

      const sortedOptions = [...planBookedMap.values()].sort((left, right) => {
        const leftName = left?.plan?.name || "";
        const rightName = right?.plan?.name || "";
        return leftName.localeCompare(rightName);
      });

      setPlanOptions(sortedOptions);
      setForm((current) => {
        const stillValid = sortedOptions.some((option) => String(option.id) === String(current.planBookedId));
        return {
          ...current,
          planBookedId: stillValid ? current.planBookedId : String(sortedOptions[0]?.id || ""),
        };
      });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load workdone options."));
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const loadHistory = async (planBookedId) => {
    if (!planBookedId) {
      setHistory([]);
      return;
    }

    setIsLoadingHistory(true);
    try {
      const response = await api.get("/api/workdone", {
        ...getAuthConfig(),
        params: { planBookedId },
      });
      const entries = Array.isArray(response.data) ? response.data : [];
      entries.sort((left, right) => {
        const leftDate = new Date(left?.date || 0).getTime();
        const rightDate = new Date(right?.date || 0).getTime();
        return rightDate - leftDate;
      });
      setHistory(entries);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load workdone history."));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user?.id]);

  useEffect(() => {
    setAttendanceMap({});
    setSuccess("");
    if (form.planBookedId) {
      loadHistory(form.planBookedId);
    } else {
      setHistory([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.planBookedId]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
    setSuccess("");
  };

  const setClientAttendance = (clientId, status) => {
    setAttendanceMap((current) => {
      if (!status) {
        const next = { ...current };
        delete next[clientId];
        return next;
      }
      return {
        ...current,
        [clientId]: status,
      };
    });
    setError("");
    setSuccess("");
  };

  const bulkApplyAttendance = (status) => {
    const next = {};
    for (const client of attendeeOptions) {
      next[client.id] = status;
    }
    setAttendanceMap(next);
    setError("");
    setSuccess("");
  };

  const clearAttendance = () => {
    setAttendanceMap({});
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isAdmin && !isTrainer) {
      setError("Only admin or trainer can create workdone.");
      return;
    }

    if (!form.planBookedId) {
      setError("Please select a booked plan.");
      return;
    }

    if (!form.date) {
      setError("Date is required.");
      return;
    }

    if (!form.topic.trim()) {
      setError("Topic is required.");
      return;
    }

    if (attendanceSummary.present.length === 0 && attendanceSummary.absent.length === 0) {
      setError("Mark at least one client as present or absent.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    const payload = {
      date: form.date,
      planBookedId: Number(form.planBookedId),
      topic: form.topic.trim(),
      presentIdList: attendanceSummary.present,
      absentIdList: attendanceSummary.absent,
    };

    try {
      await api.post("/api/workdone", payload, getAuthConfig());
      setSuccess("Workdone created successfully.");
      setForm((current) => ({ ...current, topic: "" }));
      setAttendanceMap({});
      await loadHistory(form.planBookedId);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create workdone."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin && !isTrainer) {
    return (
      <main className="gym-plans-page">
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, color: "#fff" }}>
          <p>Access restricted: only admins and trainers can manage workdone.</p>
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
        {/* <nav className="plans-top-nav" aria-label="Work done navigation">
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
              : "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #16a34a 100%)",
            color: "#e2e8f0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, letterSpacing: 1, textTransform: "uppercase", fontSize: 12, opacity: 0.8 }}>
                {isAdmin ? "Admin Desk" : "Trainer Desk"}
              </p>
              <h2 style={{ margin: "6px 0 4px", fontSize: 26, color: "#fff" }}>Work Done</h2>
              <p style={{ margin: 0, color: "#cbd5e1", maxWidth: 680 }}>
                Record daily topic coverage and client attendance for approved plan bookings.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={loadOptions}
                style={{ ...buttonStyle, background: "rgba(226, 232, 240, 0.16)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                Refresh
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <span style={{ ...buttonStyle, background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0" }}>
              Plans: {planOptions.length}
            </span>
            <span style={{ ...buttonStyle, background: "#e8fff4", color: "#166534", border: "1px solid rgba(34,197,94,0.3)" }}>
              Present: {attendanceSummary.present.length}
            </span>
            <span style={{ ...buttonStyle, background: "#fef2f2", color: "#991b1b", border: "1px solid rgba(248,113,113,0.35)" }}>
              Absent: {attendanceSummary.absent.length}
            </span>
            <span style={{ ...buttonStyle, background: "#fff8eb", color: "#92400e", border: "1px solid rgba(251,191,36,0.4)" }}>
              Unmarked: {attendanceSummary.unmarked}
            </span>
          </div>
        </section>

        {error ? (
          <div style={{ ...cardStyle, border: "1px solid #fecaca", color: "#b91c1c", background: "#fef2f2" }}>{error}</div>
        ) : null}

        {success ? (
          <div style={{ ...cardStyle, border: "1px solid #bbf7d0", color: "#166534", background: "#f0fdf4" }}>{success}</div>
        ) : null}

        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 22, color: "#0f172a" }}>Create Workdone Entry</h3>
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                Pick a booked plan, enter the session topic, and mark each client&apos;s attendance.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={() => bulkApplyAttendance("PRESENT")} style={{ ...buttonStyle, background: "#dcfce7", color: "#166534" }}>
                Mark All Present
              </button>
              <button type="button" onClick={() => bulkApplyAttendance("ABSENT")} style={{ ...buttonStyle, background: "#fee2e2", color: "#991b1b" }}>
                Mark All Absent
              </button>
              <button type="button" onClick={clearAttendance} style={{ ...buttonStyle, background: "#e2e8f0", color: "#0f172a" }}>
                Clear
              </button>
            </div>
          </div>

          {isLoadingOptions ? (
            <p style={{ margin: 0, color: "#475569" }}>Loading booked plans and clients...</p>
          ) : planOptions.length === 0 ? (
            <div style={{ padding: 18, borderRadius: 14, background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#0f172a" }}>
              <p style={{ margin: 0, fontWeight: 700 }}>No approved booked plans available.</p>
              <p style={{ margin: "6px 0 0" }}>Approve a booking first so a workdone entry can be created for it.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: "#334155" }}>Date</span>
                  <input
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={handleFieldChange}
                    style={fieldStyle}
                    required
                  />
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: "#334155" }}>Booked Plan</span>
                  <select
                    name="planBookedId"
                    value={form.planBookedId}
                    onChange={handleFieldChange}
                    style={fieldStyle}
                    required
                  >
                    <option value="">Select booked plan</option>
                    {planOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {buildPlanOptionLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedPlanBooked ? (
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    padding: 18,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ padding: "6px 12px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontWeight: 700 }}>
                      {selectedPlanBooked.plan?.name || "Plan"}
                    </span>
                    <span style={{ padding: "6px 12px", borderRadius: 999, background: "#fef3c7", color: "#92400e", fontWeight: 700 }}>
                      Trainer: {selectedPlanBooked.plan?.trainer?.fullName || `ID ${selectedPlanBooked.plan?.trainer?.id ?? "N/A"}`}
                    </span>
                    <span style={{ padding: "6px 12px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontWeight: 700 }}>
                      Clients: {attendeeOptions.length}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: "#475569" }}>
                    Duration: {formatDuration(selectedPlanBooked.plan?.durationWeeks)} | Sessions/week: {selectedPlanBooked.plan?.sessionsPerWeek ?? "N/A"}
                  </p>
                </div>
              ) : null}

              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 600, color: "#334155" }}>Topic</span>
                <textarea
                  name="topic"
                  value={form.topic}
                  onChange={handleFieldChange}
                  placeholder="Example: Morning cardio session"
                  rows={3}
                  style={{ ...fieldStyle, resize: "vertical" }}
                  required
                />
              </label>

              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <h4 style={{ margin: 0, color: "#0f172a" }}>Client Attendance</h4>
                    <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                      Choose one status per client. Leave unmarked if you are not ready yet.
                    </p>
                  </div>
                </div>

                {attendeeOptions.length === 0 ? (
                  <div style={{ padding: 16, borderRadius: 14, background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#475569" }}>
                    No clients found for the selected booked plan.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {attendeeOptions.map((client) => {
                      const currentStatus = attendanceMap[client.id] || "";
                      return (
                        <div
                          key={client.id}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 16,
                            padding: 16,
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 16,
                            alignItems: "center",
                            flexWrap: "wrap",
                            background: "#fff",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>{client.name}</div>
                            <div style={{ color: "#64748b", fontSize: 14 }}>
                              ID: {client.id}{client.email ? ` • ${client.email}` : ""}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => setClientAttendance(client.id, "PRESENT")}
                              style={{
                                ...buttonStyle,
                                background: currentStatus === "PRESENT" ? "#16a34a" : "#dcfce7",
                                color: currentStatus === "PRESENT" ? "#fff" : "#166534",
                              }}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => setClientAttendance(client.id, "ABSENT")}
                              style={{
                                ...buttonStyle,
                                background: currentStatus === "ABSENT" ? "#dc2626" : "#fee2e2",
                                color: currentStatus === "ABSENT" ? "#fff" : "#991b1b",
                              }}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              onClick={() => setClientAttendance(client.id, "")}
                              style={{
                                ...buttonStyle,
                                background: !currentStatus ? "#0f172a" : "#e2e8f0",
                                color: !currentStatus ? "#fff" : "#334155",
                              }}
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="submit" disabled={isSubmitting} style={{ ...buttonStyle, background: "#2563eb", color: "#fff" }}>
                  {isSubmitting ? "Saving..." : "Save Workdone"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm((current) => ({ ...current, topic: "", date: toDateInputValue() }));
                    setAttendanceMap({});
                    setError("");
                    setSuccess("");
                  }}
                  style={{ ...buttonStyle, background: "#e2e8f0", color: "#0f172a" }}
                >
                  Reset Form
                </button>
              </div>
            </form>
          )}
        </section>

        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 22, color: "#0f172a" }}>Recent Entries</h3>
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                {selectedPlanBooked ? "Entries for the selected booked plan." : "Select a booked plan to view history."}
              </p>
            </div>
            {selectedPlanBooked ? (
              <button type="button" onClick={() => loadHistory(selectedPlanBooked.id)} style={{ ...buttonStyle, background: "#e2e8f0", color: "#0f172a" }}>
                Refresh History
              </button>
            ) : null}
          </div>

          {!selectedPlanBooked ? (
            <p style={{ margin: 0, color: "#475569" }}>Choose a booked plan to load its workdone history.</p>
          ) : isLoadingHistory ? (
            <p style={{ margin: 0, color: "#475569" }}>Loading workdone history...</p>
          ) : history.length === 0 ? (
            <div style={{ padding: 18, borderRadius: 14, background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#0f172a" }}>
              <p style={{ margin: 0, fontWeight: 700 }}>No workdone entries yet.</p>
              <p style={{ margin: "6px 0 0" }}>Create the first entry for this booked plan.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {history.map((entry) => (
                <article
                  key={entry.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 18,
                    padding: 18,
                    display: "grid",
                    gap: 12,
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: "#64748b" }}>
                        {formatDate(entry.date)}
                      </div>
                      <h4 style={{ margin: "6px 0 0", color: "#0f172a", fontSize: 18 }}>{entry.topic || "Session"}</h4>
                    </div>
                    <span style={{ padding: "6px 10px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontWeight: 700 }}>
                      #{entry.id}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ padding: "6px 10px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontWeight: 700 }}>
                      Present: {entry.presentIdList?.length || 0}
                    </span>
                    <span style={{ padding: "6px 10px", borderRadius: 999, background: "#fee2e2", color: "#991b1b", fontWeight: 700 }}>
                      Absent: {entry.absentIdList?.length || 0}
                    </span>
                  </div>

                  <div style={{ color: "#475569", fontSize: 14 }}>
                    Created: {formatDateTime(entry.createdAt)}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default WorkDonePage;
