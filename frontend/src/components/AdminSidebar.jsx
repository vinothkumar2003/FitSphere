import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthProvider";

const menuItems = [
  { label: "Dashboard", to: "/admin", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M520-640v-160q0-17 11.5-28.5T560-840h240q17 0 28.5 11.5T840-800v160q0 17-11.5 28.5T800-600H560q-17 0-28.5-11.5T520-640ZM120-480v-320q0-17 11.5-28.5T160-840h240q17 0 28.5 11.5T440-800v320q0 17-11.5 28.5T400-440H160q-17 0-28.5-11.5T120-480Zm400 320v-320q0-17 11.5-28.5T560-520h240q17 0 28.5 11.5T840-480v320q0 17-11.5 28.5T800-120H560q-17 0-28.5-11.5T520-160Zm-400 0v-160q0-17 11.5-28.5T160-360h240q17 0 28.5 11.5T440-320v160q0 17-11.5 28.5T400-120H160q-17 0-28.5-11.5T120-160Zm80-360h160v-240H200v240Zm400 320h160v-240H600v240Zm0-480h160v-80H600v80ZM200-200h160v-80H200v80Zm160-320Zm240-160Zm0 240ZM360-280Z"/></svg>
  ) },
  { label: "Finance", to: "/admin/finance", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24"><path fill="currentColor" d="m6 16.5l-3 2.94V11h3m5 3.66l-1.57-1.34L8 14.64V7h3m5 6l-3 3V3h3m2.81 9.81L17 11h5v5l-1.79-1.79L13 21.36l-3.47-3.02L5.75 22H3l6.47-6.34L13 18.64"/></svg>
  ) },
  { label: "Gym Plans", to: "/admin/gymplans", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 48 48"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M30.507 36.163h-13.01m0-4.025h13.006m10.054 4.649h.835c.613 0 1.108-.491 1.108-1.104v-3.152c0-.61-.494-1.104-1.104-1.104h-.835m-3.893 8.58h2.786a1.1 1.1 0 0 0 1.103-1.103v-9.59a1.104 1.104 0 0 0-1.1-1.107h-2.785m-1.104-2.355H31.61c-.61 0-1.104.494-1.104 1.104v14.302a1.1 1.1 0 0 0 1.104 1.104h3.957a1.1 1.1 0 0 0 1.104-1.104V26.96a1.104 1.104 0 0 0-1.1-1.108zM7.439 36.791h-.831a1.104 1.104 0 0 1-1.108-1.1v-3.16c0-.612.491-1.104 1.108-1.104h.831m3.893 8.58h-2.79a1.103 1.103 0 0 1-1.103-1.103v-9.59c0-.612.491-1.107 1.104-1.107h2.782m1.107-2.355h3.954c.616 0 1.107.491 1.107 1.108v14.298a1.1 1.1 0 0 1-1.107 1.104h-3.95c-.61 0-1.104-.494-1.104-1.104V26.96c0-.613.492-1.108 1.104-1.108zm8.701 2.82h9.37m-13.01-1.078l1.531-1.538m2.11-4.94h13.25m-20.625-.159l1.41 1.414l3.855-3.874m2.11-4.94h13.25m-20.625-.16l1.41 1.414l3.855-3.87m11.48 28.5H17.496M9.374 28.206V7.849c0-1.225.98-2.211 2.193-2.211h24.87c1.217 0 2.196.983 2.196 2.211v20.358" stroke-width="1"/></svg>
  ) },
  { label: "Booking Requests", to: "/admin/booking-requests", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.49 2 2 6.49 2 12c0 2.12.68 4.19 1.93 5.9l-1.75 2.53c-.21.31-.24.7-.06 1.03c.17.33.51.54.89.54h9c5.51 0 10-4.49 10-10S17.51 2 12 2m0 18H4.91L6 18.43c.26-.37.23-.88-.06-1.22A7.98 7.98 0 0 1 4.01 12c0-4.41 3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8Z"/></svg>
  ) },
  { label: "Diet food", to: "/admin/dietfoot", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 20 20"><path fill="currentColor" d="M7.225 8.342a.5.5 0 0 1-.316.632a1.22 1.22 0 0 0-.717.605c-.186.349-.312.923-.195 1.86a.5.5 0 0 1-.993.123c-.132-1.063-.009-1.864.306-2.453c.32-.6.807-.925 1.282-1.083a.5.5 0 0 1 .633.316m4.934-5.368a.5.5 0 1 0-.317-.948c-.937.312-1.522 1.082-1.866 1.907a5 5 0 0 0-.127.339a4 4 0 0 0-.711-.963a4 4 0 0 0-2.94-1.17c-.58.016-1.043.48-1.059 1.059a4 4 0 0 0 1.201 2.97A4 4 0 0 0 3.198 9.76l-.006.074a8.5 8.5 0 0 0 1.01 4.748l.36.658q.014.026.032.05l1 1.402a2.685 2.685 0 0 0 4.084.338a.456.456 0 0 1 .645 0a2.685 2.685 0 0 0 4.084-.338l1-1.401l.032-.051l.359-.658a8.5 8.5 0 0 0 1.01-4.748l-.005-.074a4 4 0 0 0-4.645-3.626l-1.657.276c.01-.681.13-1.447.399-2.093c.28-.675.696-1.155 1.258-1.343M8.719 6.28l-.154-.026a3 3 0 0 1-1.549-.824a3 3 0 0 1-.877-2.205a.09.09 0 0 1 .087-.087a3 3 0 0 1 2.205.878c.607.607.9 1.408.877 2.205a.09.09 0 0 1-.087.087a3 3 0 0 1-.502-.028m-.328.959l.173.029l.779.13a4 4 0 0 0 1.315 0l1.664-.278a3 3 0 0 1 3.484 2.72l.006.074a7.5 7.5 0 0 1-.892 4.19l-.344.63l-.983 1.376a1.685 1.685 0 0 1-2.563.213a1.456 1.456 0 0 0-2.06 0a1.685 1.685 0 0 1-2.562-.213l-.983-1.376l-.344-.63a7.5 7.5 0 0 1-.892-4.19l.006-.074a3 3 0 0 1 3.483-2.72z"/></svg>
  ) },
  { label: "Users", to: "/admin/users", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="square" stroke-width="2" d="M16 20v-1a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v1M12.5 7a4 4 0 1 1-8 0a4 4 0 0 1 8 0Zm3 4a4 4 0 0 0 0-8M23 20v-1a4 4 0 0 0-4-4"/></svg>
  ) },
  { label: "Work done", to: "/admin/workdone", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 512 512"><path fill="currentColor" fill-rule="evenodd" d="M256 85.334h170.666V128H256zm0 149.333h170.666v42.667H256zM85.332 341.334h106.666V448H85.333zm32 32V416h42.666v-42.666zM255.999 384h170.667v42.667H256zM189.815 46.126l25.364 19.51l-76.032 98.843l-68.617-60.04l21.072-24.082l42.968 37.574zm0 149.333l25.364 19.511l-76.032 98.842l-68.617-60.04l21.072-24.082l42.968 37.574z"/></svg>
  ) },
  { label: "Gym equipment ", to: "/admin/gym-equipment", icon: (
   <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 50 50"><path fill="currentColor" d="M17.96 44.87c.37.4.35 1.04-.05 1.42l-2.17 2.03c-.4.38-1.04.35-1.41-.05L1.68 34.64c-.37-.4-.35-1.04.05-1.42l2.17-2.03a.996.996 0 0 1 1.41.05zM34.1 19.22c.37.4.35 1.04-.05 1.42L20.38 33.41c-.4.38-1.04.35-1.41-.05l-3.26-3.52c-.37-.4-.35-1.04.05-1.42l13.67-12.77c.4-.37 1.04-.35 1.41.05l3.27 3.52zm-11.49 21.3c.37.4.35 1.04-.05 1.42l-2.17 2.03c-.4.38-1.04.35-1.41-.05L6.34 30.29c-.37-.4-.35-1.04.05-1.42l2.17-2.03c.4-.37 1.04-.35 1.41.05l12.65 13.63zm21.06-20.81c.37.4.35 1.04-.05 1.42l-2.17 2.03c-.4.38-1.04.35-1.41-.05L27.4 9.48c-.37-.4-.35-1.04.05-1.42l2.18-2.03c.4-.37 1.04-.35 1.41.05l12.64 13.63zm4.64-4.34c.37.4.35 1.04-.05 1.42l-2.17 2.03c-.4.38-1.04.35-1.41-.05L32.04 5.14c-.37-.4-.35-1.04.05-1.42l2.17-2.03a.997.997 0 0 1 1.41.05l12.64 13.64z"/></svg>
  ) },
  { label: "Settings", to: "/admin/settings", icon: (
   <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24"><path fill="currentColor" d="M19.9 12.66a1 1 0 0 1 0-1.32l1.28-1.44a1 1 0 0 0 .12-1.17l-2-3.46a1 1 0 0 0-1.07-.48l-1.88.38a1 1 0 0 1-1.15-.66l-.61-1.83a1 1 0 0 0-.95-.68h-4a1 1 0 0 0-1 .68l-.56 1.83a1 1 0 0 1-1.15.66L5 4.79a1 1 0 0 0-1 .48L2 8.73a1 1 0 0 0 .1 1.17l1.27 1.44a1 1 0 0 1 0 1.32L2.1 14.1a1 1 0 0 0-.1 1.17l2 3.46a1 1 0 0 0 1.07.48l1.88-.38a1 1 0 0 1 1.15.66l.61 1.83a1 1 0 0 0 1 .68h4a1 1 0 0 0 .95-.68l.61-1.83a1 1 0 0 1 1.15-.66l1.88.38a1 1 0 0 0 1.07-.48l2-3.46a1 1 0 0 0-.12-1.17ZM18.41 14l.8.9l-1.28 2.22l-1.18-.24a3 3 0 0 0-3.45 2L12.92 20h-2.56L10 18.86a3 3 0 0 0-3.45-2l-1.18.24l-1.3-2.21l.8-.9a3 3 0 0 0 0-4l-.8-.9l1.28-2.2l1.18.24a3 3 0 0 0 3.45-2L10.36 4h2.56l.38 1.14a3 3 0 0 0 3.45 2l1.18-.24l1.28 2.22l-.8.9a3 3 0 0 0 0 3.98m-6.77-6a4 4 0 1 0 4 4a4 4 0 0 0-4-4m0 6a2 2 0 1 1 2-2a2 2 0 0 1-2 2"/></svg>
  ) },
  { label: "Profile", to: "/admin/profile", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24"><g fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M16 9a4 4 0 1 1-8 0a4 4 0 0 1 8 0m-2 0a2 2 0 1 1-4 0a2 2 0 0 1 4 0"/><path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11s11-4.925 11-11S18.075 1 12 1M3 12c0 2.09.713 4.014 1.908 5.542A8.99 8.99 0 0 1 12.065 14a8.98 8.98 0 0 1 7.092 3.458A9 9 0 1 0 3 12m9 9a8.96 8.96 0 0 1-5.672-2.012A6.99 6.99 0 0 1 12.065 16a6.99 6.99 0 0 1 5.689 2.92A8.96 8.96 0 0 1 12 21"/></g></svg>
  ) },
];

const truncateText = (value, maxLength = 10) => {
  if (!value) return "Admin";
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
};

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const displayName = user?.fullName || user?.username || "Admin";

  const handleSignOut = () => {
    logout?.();
    navigate("/login");
  };

  return (
    <div id="sidebar" className={sidebarOpen ? "" : "close"}>
      <ul>
        <li>
          <span className="logo">FitSphere</span>
          <button
            id="toggle-btn"
            onClick={() => setSidebarOpen((open) => !open)}
            className={sidebarOpen ? "" : "rotate"}
            aria-label="Toggle sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m313-480 155 156q11 11 11.5 27.5T468-268q-11 11-28 11t-28-11L228-452q-6-6-8.5-13t-2.5-15q0-8 2.5-15t8.5-13l184-184q11-11 27.5-11.5T468-692q11 11 11 28t-11 28L313-480Zm264 0 155 156q11 11 11.5 27.5T732-268q-11 11-28 11t-28-11L492-452q-6-6-8.5-13t-2.5-15q0-8 2.5-15t8.5-13l184-184q11-11 27.5-11.5T732-692q11 11 11 28t-11 28L577-480Z"/></svg>
          </button>
        </li>
        {menuItems.filter(item => item.label !== "Profile").map((item) => (
          <li key={item.to} className={location.pathname === item.to ? "active" : ""}>
            <Link to={item.to}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      <li className={sidebarOpen ? "profile-section" : "profile-section closed"}>
        {sidebarOpen ? (
          <>
            <div className="profile-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" width="32px" height="32px" viewBox="0 0 24 24"><g fill="currentColor" fillRule="evenodd" clipRule="evenodd"><path d="M16 9a4 4 0 1 1-8 0a4 4 0 0 1 8 0m-2 0a2 2 0 1 1-4 0a2 2 0 0 1 4 0"/><path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11s11-4.925 11-11S18.075 1 12 1M3 12c0 2.09.713 4.014 1.908 5.542A8.99 8.99 0 0 1 12.065 14a8.98 8.98 0 0 1 7.092 3.458A9 9 0 1 0 3 12m9 9a8.96 8.96 0 0 1-5.672-2.012A6.99 6.99 0 0 1 12.065 16a6.99 6.99 0 0 1 5.689 2.92A8.96 8.96 0 0 1 12 21"/></g></svg>
            </div>
            <div className="profile-info">
              <span className="profile-name" title={displayName}>
                {truncateText(displayName, 10)}
              </span>
              <button className="profile-dropdown-btn" onClick={() => {setProfileDropdownOpen(open => !open); }}>
                <svg width="16" height="16" fill="#888" viewBox="0 0 16 16"><path d="M4.646 6.646a.5.5 0 0 1 .708 0L8 9.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z"/></svg>
              </button>
            </div>
            {profileDropdownOpen && (
              <ul className="profile-dropdown">
                <li><Link to="/admin/gymplans/create">New Gym Plan</Link></li>
                <li><Link to="/admin/settings">Settings</Link></li>
                <li><Link to="/admin/profile">Profile</Link></li>
                <li><button style={{ background: "none", border: "none", color: "#333", width: "100%", textAlign: "left", cursor: "pointer" }} onClick={handleSignOut}>Sign out</button></li>
              </ul>
            )}
          </>
        ) : (
          <>
            <div className="profile-avatar" style={{ cursor: "pointer" }} onClick={() => {setProfileDropdownOpen(open => !open); setSidebarOpen((open) => !open)}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32px" height="32px" viewBox="0 0 24 24"><g fill="currentColor" fillRule="evenodd" clipRule="evenodd"><path d="M16 9a4 4 0 1 1-8 0a4 4 0 0 1 8 0m-2 0a2 2 0 1 1-4 0a2 2 0 0 1 4 0"/><path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11s11-4.925 11-11S18.075 1 12 1M3 12c0 2.09.713 4.014 1.908 5.542A8.99 8.99 0 0 1 12.065 14a8.98 8.98 0 0 1 7.092 3.458A9 9 0 1 0 3 12m9 9a8.96 8.96 0 0 1-5.672-2.012A6.99 6.99 0 0 1 12.065 16a6.99 6.99 0 0 1 5.689 2.92A8.96 8.96 0 0 1 12 21"/></g></svg>
            </div>
            {profileDropdownOpen && (
              <ul className="profile-dropdown closed">
                <li><Link to="/admin/gymplans/create">New Gym Plan</Link></li>
                <li><Link to="/admin/settings">Settings</Link></li>
                <li><Link to="/admin/profile">Profile</Link></li>
                <li><button style={{ background: "none", border: "none", color: "#333", width: "100%", textAlign: "left", cursor: "pointer" }} onClick={handleSignOut}>Sign out</button></li>
              </ul>
            )}
          </>
        )}
      </li>
      </ul>
    </div>
  );
};

export default AdminSidebar;

