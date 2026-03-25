import React from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar";

export const AdminLayout = () => {
  return (
    <div className="app-shell">
      <AdminSidebar />
      <div className="app-main">
        <Outlet />
      </div>
    </div>
  );
};
