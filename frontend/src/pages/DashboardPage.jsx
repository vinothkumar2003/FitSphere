import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../utils/AuthProvider";
import "./DashboardPage.css";

const DASHBOARD_ENDPOINTS = {
  ADMIN: "/api/admin/dashboard/overview",
  TRAINER: "/api/trainer/dashboard/overview",
  CLIENT: "/api/client/dashboard/overview",
};

const ROLE_COPY = {
  ADMIN: {
    eyebrow: "Admin Command Center",
    title: "Track clients, trainers, plan demand, and revenue from one place.",
    subtitle:
      "FitSphere ERP analytics for growth, approval flow, and trainer capacity across the business.",
    accentLabel: "Total revenue",
  },
  TRAINER: {
    eyebrow: "Trainer Performance",
    title: "Stay on top of your plans, sessions, assigned clients, and earnings.",
    subtitle:
      "Your delivery dashboard keeps bookings, attendance, active plans, and client movement in view.",
    accentLabel: "Session delivery",
  },
  CLIENT: {
    eyebrow: "Client Progress",
    title: "See your memberships, attendance, and recent coaching activity at a glance.",
    subtitle:
      "Keep track of your active plans, recent sessions, and how your training journey is progressing.",
    accentLabel: "Your spending",
  },
};

const FALLBACK_DATA = {
  ADMIN: {
    summary: {},
    bookingStatus: [],
    monthlyTrends: [],
    topPlans: [],
    trainerWorkload: [],
  },
  TRAINER: {
    summary: {},
    monthlySessions: [],
    activePlans: [],
    recentClients: [],
    recentSessions: [],
  },
  CLIENT: {
    summary: {},
    monthlyActivity: [],
    bookings: [],
    recentSessions: [],
  },
};

const readRoleFromPath = (pathname) => {
  if (pathname.startsWith("/admin")) return "ADMIN";
  if (pathname.startsWith("/trainer")) return "TRAINER";
  if (pathname.startsWith("/client")) return "CLIENT";
  return "CLIENT";
};

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { headers };
};

const getErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;

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

  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatCompact = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);

function StatCard({ label, value, meta, tone }) {
  return (
    <article className={`dashboard-stat-card dashboard-stat-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{meta}</small>
    </article>
  );
}

function SectionCard({ title, subtitle, children, className = "" }) {
  return (
    <section className={`dashboard-section-card ${className}`.trim()}>
      <header className="dashboard-section-head">
        <div>
          <p>{title}</p>
          <h2>{subtitle}</h2>
        </div>
      </header>
      {children}
    </section>
  );
}

function BarChart({ items, valueKey, labelKey, colorClass, formatter = (value) => value }) {
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey]) || 0), 0) || 1;

  return (
    <div className="dashboard-bar-chart">
      {items.map((item, index) => {
        const rawValue = Number(item[valueKey]) || 0;
        const height = `${Math.max((rawValue / maxValue) * 100, rawValue > 0 ? 12 : 4)}%`;

        return (
          <div className="dashboard-bar-item" key={`${item[labelKey]}-${index}`}>
            <span className={`dashboard-bar-fill ${colorClass}`} style={{ height }} />
            <strong>{formatter(rawValue)}</strong>
            <small>{item[labelKey]}</small>
          </div>
        );
      })}
    </div>
  );
}

function MeterList({ items, labelKey, subLabelKey, valueKey, fillClass, valueFormatter }) {
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey]) || 0), 0) || 1;

  return (
    <div className="dashboard-meter-list">
      {items.map((item, index) => {
        const value = Number(item[valueKey]) || 0;
        const width = `${(value / maxValue) * 100}%`;

        return (
          <div className="dashboard-meter-row" key={`${item[labelKey]}-${index}`}>
            <div className="dashboard-meter-copy">
              <strong>{item[labelKey]}</strong>
              {subLabelKey ? <span>{item[subLabelKey]}</span> : null}
            </div>
            <div className="dashboard-meter-track">
              <span className={`dashboard-meter-fill ${fillClass}`} style={{ width }} />
            </div>
            <div className="dashboard-meter-value">{valueFormatter(value, item)}</div>
          </div>
        );
      })}
    </div>
  );
}

function StatusPills({ items }) {
  return (
    <div className="dashboard-pill-grid">
      {items.map((item) => (
        <div className="dashboard-pill" key={item.status}>
          <span>{item.status}</span>
          <strong>{item.count}</strong>
        </div>
      ))}
    </div>
  );
}

function RecentList({ items, emptyText, renderItem }) {
  if (!items.length) {
    return <div className="dashboard-empty-state">{emptyText}</div>;
  }

  return <div className="dashboard-recent-list">{items.map(renderItem)}</div>;
}

const DashboardPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const role = (user?.role || readRoleFromPath(location.pathname)).toUpperCase();
  const [dashboardData, setDashboardData] = useState(FALLBACK_DATA[role] || {});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadDashboard = async () => {
      const endpoint = DASHBOARD_ENDPOINTS[role];
      if (!endpoint) {
        setDashboardData({});
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await api.get(endpoint, getAuthConfig());
        if (!ignore) {
          setDashboardData({
            ...(FALLBACK_DATA[role] || {}),
            ...(response.data || {}),
          });
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(getErrorMessage(fetchError, "Failed to load dashboard analytics."));
          setDashboardData(FALLBACK_DATA[role] || {});
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [role]);

  const copy = ROLE_COPY[role] || ROLE_COPY.CLIENT;

  const renderAdminDashboard = () => {
    const summary = dashboardData.summary || {};
    const monthlyTrends = dashboardData.monthlyTrends || [];
    const bookingStatus = dashboardData.bookingStatus || [];
    const topPlans = dashboardData.topPlans || [];
    const trainerWorkload = dashboardData.trainerWorkload || [];

    return (
      <>
        <section className="dashboard-stats-grid">
          <StatCard
            label="Clients"
            value={formatCompact(summary.totalClients)}
            meta={`${summary.activeClients || 0} active members`}
            tone="clients"
          />
          <StatCard
            label="Trainers"
            value={formatCompact(summary.totalTrainers)}
            meta={`${summary.activeTrainers || 0} active trainers`}
            tone="trainers"
          />
          <StatCard
            label="Plans"
            value={formatCompact(summary.totalPlans)}
            meta={`${summary.activePlans || 0} active plans`}
            tone="plans"
          />
          <StatCard
            label="Bookings"
            value={formatCompact(summary.totalBookings)}
            meta={`${summary.pendingBookings || 0} pending approvals`}
            tone="bookings"
          />
        </section>

        <section className="dashboard-content-grid">
          <SectionCard title="Growth Trends" subtitle="Last 6 months across the business" className="dashboard-section-card--wide">
            <div className="dashboard-chart-grid">
              <div className="dashboard-chart-panel">
                <h3>Bookings</h3>
                <BarChart items={monthlyTrends} valueKey="bookings" labelKey="month" colorClass="dashboard-bar-fill--bookings" />
              </div>
              <div className="dashboard-chart-panel">
                <h3>Client Growth</h3>
                <BarChart items={monthlyTrends} valueKey="clients" labelKey="month" colorClass="dashboard-bar-fill--clients" />
              </div>
              <div className="dashboard-chart-panel">
                <h3>Revenue</h3>
                <BarChart
                  items={monthlyTrends}
                  valueKey="revenue"
                  labelKey="month"
                  colorClass="dashboard-bar-fill--revenue"
                  formatter={(value) => formatCompact(value)}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Approval Mix" subtitle="Booking status overview">
            <StatusPills items={bookingStatus} />
          </SectionCard>

          <SectionCard title="Top Plans" subtitle="Best performing memberships">
            <MeterList
              items={topPlans}
              labelKey="planName"
              subLabelKey="trainerName"
              valueKey="totalBookings"
              fillClass="dashboard-meter-fill--plans"
              valueFormatter={(value, item) => `${value} bookings | ${formatCurrency(item.revenue)}`}
            />
          </SectionCard>

          <SectionCard title="Trainer Workload" subtitle="Assignments and earned revenue">
            <MeterList
              items={trainerWorkload}
              labelKey="trainerName"
              valueKey="assignedBookings"
              fillClass="dashboard-meter-fill--trainers"
              valueFormatter={(value, item) => `${value} bookings | ${item.activePlans} plans | ${formatCurrency(item.revenue)}`}
            />
          </SectionCard>
        </section>
      </>
    );
  };

  const renderTrainerDashboard = () => {
    const summary = dashboardData.summary || {};
    const monthlySessions = dashboardData.monthlySessions || [];
    const activePlans = dashboardData.activePlans || [];
    const recentClients = dashboardData.recentClients || [];
    const recentSessions = dashboardData.recentSessions || [];

    return (
      <>
        <section className="dashboard-stats-grid">
          <StatCard
            label="Assigned Clients"
            value={formatCompact(summary.assignedClients)}
            meta={`${summary.pendingBookings || 0} pending approvals`}
            tone="clients"
          />
          <StatCard
            label="Active Plans"
            value={formatCompact(summary.activePlans)}
            meta={`${summary.totalBookings || 0} total bookings`}
            tone="plans"
          />
          <StatCard
            label="Approved Bookings"
            value={formatCompact(summary.approvedBookings)}
            meta={`${summary.totalBookings || 0} handled bookings`}
            tone="bookings"
          />
          <StatCard
            label="Sessions Done"
            value={formatCompact(summary.completedSessions)}
            meta={formatCurrency(summary.totalRevenue)}
            tone="trainers"
          />
        </section>

        <section className="dashboard-content-grid">
          <SectionCard title="Session Trends" subtitle="Your session flow over the last 6 months" className="dashboard-section-card--wide">
            <div className="dashboard-chart-grid">
              <div className="dashboard-chart-panel">
                <h3>Sessions</h3>
                <BarChart items={monthlySessions} valueKey="sessions" labelKey="month" colorClass="dashboard-bar-fill--bookings" />
              </div>
              <div className="dashboard-chart-panel">
                <h3>Present</h3>
                <BarChart items={monthlySessions} valueKey="presentCount" labelKey="month" colorClass="dashboard-bar-fill--clients" />
              </div>
              <div className="dashboard-chart-panel">
                <h3>Absent</h3>
                <BarChart items={monthlySessions} valueKey="absentCount" labelKey="month" colorClass="dashboard-bar-fill--trainers" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Active Plans" subtitle="Programs currently assigned to you">
            <MeterList
              items={activePlans}
              labelKey="planName"
              valueKey="approvedClients"
              fillClass="dashboard-meter-fill--plans"
              valueFormatter={(value, item) => `${value} approved | ${item.pendingBookings} pending | ${formatCurrency(item.revenue)}`}
            />
          </SectionCard>

          <SectionCard title="Recent Clients" subtitle="Newest client-side booking activity">
            <RecentList
              items={recentClients}
              emptyText="No clients assigned yet."
              renderItem={(item) => (
                <article className="dashboard-recent-card" key={item.bookingId}>
                  <div>
                    <strong>{item.clientName}</strong>
                    <span>{item.planName}</span>
                  </div>
                  <div className="dashboard-recent-meta">
                    <em>{item.status}</em>
                    <span>{formatCurrency(item.amountPaid)}</span>
                  </div>
                </article>
              )}
            />
          </SectionCard>

          <SectionCard title="Recent Sessions" subtitle="Latest work logs submitted by you">
            <RecentList
              items={recentSessions}
              emptyText="No sessions logged yet."
              renderItem={(item) => (
                <article className="dashboard-recent-card" key={item.sessionId}>
                  <div>
                    <strong>{item.topic}</strong>
                    <span>{item.planName}</span>
                  </div>
                  <div className="dashboard-recent-meta">
                    <em>{item.date}</em>
                    <span>{item.presentCount} present</span>
                  </div>
                </article>
              )}
            />
          </SectionCard>
        </section>
      </>
    );
  };

  const renderClientDashboard = () => {
    const summary = dashboardData.summary || {};
    const monthlyActivity = dashboardData.monthlyActivity || [];
    const bookings = dashboardData.bookings || [];
    const recentSessions = dashboardData.recentSessions || [];

    return (
      <>
        <section className="dashboard-stats-grid">
          <StatCard
            label="Active Plans"
            value={formatCompact(summary.activePlans)}
            meta={`${summary.approvedBookings || 0} approved bookings`}
            tone="plans"
          />
          <StatCard
            label="All Bookings"
            value={formatCompact(summary.totalBookings)}
            meta={`${summary.pendingBookings || 0} pending approvals`}
            tone="bookings"
          />
          <StatCard
            label="Sessions Attended"
            value={formatCompact(summary.sessionsAttended)}
            meta={`${summary.sessionsMissed || 0} missed sessions`}
            tone="clients"
          />
          <StatCard
            label="Spent"
            value={formatCurrency(summary.totalSpent)}
            meta={`${summary.rejectedBookings || 0} rejected bookings`}
            tone="trainers"
          />
        </section>

        <section className="dashboard-content-grid">
          <SectionCard title="Activity Trends" subtitle="Your recent booking and attendance history" className="dashboard-section-card--wide">
            <div className="dashboard-chart-grid">
              <div className="dashboard-chart-panel">
                <h3>Bookings</h3>
                <BarChart items={monthlyActivity} valueKey="bookings" labelKey="month" colorClass="dashboard-bar-fill--bookings" />
              </div>
              <div className="dashboard-chart-panel">
                <h3>Attended</h3>
                <BarChart items={monthlyActivity} valueKey="attendedSessions" labelKey="month" colorClass="dashboard-bar-fill--clients" />
              </div>
              <div className="dashboard-chart-panel">
                <h3>Missed</h3>
                <BarChart items={monthlyActivity} valueKey="missedSessions" labelKey="month" colorClass="dashboard-bar-fill--trainers" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Memberships" subtitle="Your plan bookings and status">
            <RecentList
              items={bookings}
              emptyText="No bookings found yet."
              renderItem={(item) => (
                <article className="dashboard-recent-card" key={item.bookingId}>
                  <div>
                    <strong>{item.planName}</strong>
                    <span>{item.trainerName}</span>
                  </div>
                  <div className="dashboard-recent-meta">
                    <em>{item.status}</em>
                    <span>{formatCurrency(item.amountPaid)}</span>
                  </div>
                </article>
              )}
            />
          </SectionCard>

          <SectionCard title="Recent Sessions" subtitle="Latest attendance records from your coaching sessions">
            <RecentList
              items={recentSessions}
              emptyText="No session history available yet."
              renderItem={(item) => (
                <article className="dashboard-recent-card" key={item.sessionId}>
                  <div>
                    <strong>{item.topic}</strong>
                    <span>{item.planName}</span>
                  </div>
                  <div className="dashboard-recent-meta">
                    <em>{item.attendanceStatus}</em>
                    <span>{item.trainerName}</span>
                  </div>
                </article>
              )}
            />
          </SectionCard>
        </section>
      </>
    );
  };

  return (
    <main className="role-dashboard-page">
      <section className={`dashboard-hero dashboard-hero--${role.toLowerCase()}`}>
        <div>
          <p className="dashboard-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="dashboard-hero-copy">{copy.subtitle}</p>
        </div>
        <div className="dashboard-hero-accent">
          <span>{copy.accentLabel}</span>
          <strong>
            {role === "CLIENT"
              ? formatCurrency(dashboardData.summary?.totalSpent)
              : role === "TRAINER"
                ? formatCompact(dashboardData.summary?.completedSessions)
                : formatCurrency(dashboardData.summary?.totalRevenue)}
          </strong>
          <small>{user?.fullName || user?.username || `${role.toLowerCase()} user`}</small>
        </div>
      </section>

      {error ? (
        <section className="dashboard-message dashboard-message--error">
          <strong>Dashboard unavailable</strong>
          <span>{error}</span>
        </section>
      ) : null}

      {isLoading ? (
        <section className="dashboard-loading-card">
          <div className="dashboard-loading-grid">
            <span />
            <span />
            <span />
            <span />
          </div>
          <p>Loading dashboard analytics...</p>
        </section>
      ) : role === "ADMIN" ? (
        renderAdminDashboard()
      ) : role === "TRAINER" ? (
        renderTrainerDashboard()
      ) : (
        renderClientDashboard()
      )}
    </main>
  );
};

export default DashboardPage;
